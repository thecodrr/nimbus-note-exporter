#!/usr/bin/env node
/*
This file is part of the nimbus-note-exporter project

Copyright (C) 2023 Abdullah Atta

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import path from "path";
import { login } from "./api/auth";
import { downloadNotes, getNotes } from "./api/notes";
import {
  getWorkspaces,
  getOrganizations,
  getAttachments,
  Workspace,
} from "./api/teams";
import ADMZip from "adm-zip";
import { mkdir, rm, writeFile } from "fs/promises";
import { fdir } from "fdir";
import prompts from "prompts";
import ora, { Ora } from "ora";
import { directory } from "tempy";
import { Folder, getFolders } from "./api/folders";
import { Note } from "./api/types";

async function main() {
  const outputPath = directory();
  const extractPath = directory();

  const { email } = await prompts({
    type: "text",
    name: "email",
    message: "Your Nimbus Note email:",
  });

  const { password } = await prompts({
    type: "password",
    name: "password",
    message: "Your Nimbus Note password:",
  });

  const user = await workWithSpinner(
    "Logging you in...",
    (u) => `Logged in as ${u.domain}`,
    () => login(email, password)
  );

  const organizations = await workWithSpinner(
    "Getting organizations...",
    (w) => `Found ${w.length} organizations`,
    () => getOrganizations(user)
  );

  const workspaces = await workWithSpinner(
    "Getting workspaces...",
    (w) => `Found ${w.length} workspaces`,
    async () =>
      (
        await Promise.all(
          organizations.map((org) => getWorkspaces(user, org.globalId))
        )
      ).flat()
  );

  const folders = await workWithSpinner(
    "Getting folders...",
    (f) => `Found ${f.length} folders across ${workspaces.length} workspaces`,
    async () =>
      (await Promise.all(workspaces.map((w) => getFolders(user, w)))).flat()
  );

  const attachments = await workWithSpinner(
    "Getting attachments...",
    (f) =>
      `Found ${f.length} attachments across ${workspaces.length} workspaces`,
    async () =>
      (
        await Promise.all(
          workspaces.map((w) => getAttachments(user, w.globalId))
        )
      ).flat()
  );

  const notes = await workWithSpinner<Note[]>(
    "Getting notes metadata...",
    (n) => `Found ${n.length} notes across ${workspaces.length} workspaces`,
    async (spinner) =>
      (
        await Promise.all(workspaces.map((w) => getNotes(user, w, spinner)))
      ).flat()
  );

  if (notes.length === 0) throw new Error("0 notes found.");

  await workWithSpinner(
    "Downloading notes...",
    () => `${notes.length} downloaded.`,
    (spinner) => downloadNotes(user, notes, outputPath, spinner)
  );

  await workWithSpinner(
    "Processing notes...",
    () => `Notes processed.`,
    async (spinner) => {
      const extracted = new Set();
      for (const note of notes) {
        if (!note.path || extracted.has(note.globalId)) continue;

        const zipPath = path.join(outputPath, note.path);
        const dir = path.join(extractPath, note.globalId);
        await mkdir(dir, { recursive: true });

        spinner.text = `Extracting ${zipPath} to ${dir}`;

        const zip = new ADMZip(zipPath);
        await new Promise((resolve, reject) =>
          zip.extractAllToAsync(dir, true, true, (err) =>
            err ? reject(err) : resolve(undefined)
          )
        );

        spinner.text = `Writing ${note.title} to disk`;

        note.parents = resolveParents(note, folders);
        note.workspace = resolveWorkspace(note, workspaces);
        note.attachments = attachments.filter(
          (a) => a.noteGlobalId === note.globalId
        );

        await writeFile(path.join(dir, "metadata.json"), JSON.stringify(note));

        extracted.add(note.globalId);
      }
    }
  );

  const zip = new ADMZip();
  new fdir()
    .withRelativePaths()
    .crawl(extractPath)
    .sync()
    .forEach((filePath) =>
      zip.addLocalFile(path.join(extractPath, filePath), path.dirname(filePath))
    );

  await zip.writeZipPromise("./nimbus-export.zip");

  await rm(extractPath, { recursive: true, force: true });
  await rm(outputPath, { recursive: true, force: true });

  ora().start().succeed("All done.");
}
main();

function resolveParents(note: Note, folders: Folder[]) {
  const parents: string[] = [];
  if (note.parentId === "root") return [];
  let parent = folders.find((f) => f.globalId === note.parentId);
  if (!parent) return [];
  parents.push(parent.title);
  while (parent.parentId !== "root") {
    const folder = folders.find((f) => f.globalId === parent!.parentId);
    if (!folder) break;

    parent = folder;
    parents.push(folder.title);
  }

  return parents.reverse();
}

function resolveWorkspace(note: Note, workspaces: Workspace[]) {
  const workspace = workspaces.find((w) => w.globalId === note.workspaceId);
  if (!workspace) return;
  return workspace.title;
}

async function workWithSpinner<T>(
  text: string,
  successText: (result: T) => string,
  action: (spinner: Ora) => Promise<T>
): Promise<T> {
  const spinner = ora(text).start();
  const result = await action(spinner);
  spinner.succeed(successText(result));
  return result;
}
