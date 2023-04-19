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
import { getWorkspaces } from "./api/workspaces";
import ADMZip from "adm-zip";
import { mkdir, rm, writeFile } from "fs/promises";
import { fdir } from "fdir";
import prompts from "prompts";
import ora, { Ora } from "ora";
import { directory } from "tempy";

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

  const workspaces = await workWithSpinner(
    "Getting workspaces...",
    (w) => `Got ${w.length} workspaces`,
    () => getWorkspaces(user)
  );

  const notes = await workWithSpinner(
    "Getting notes...",
    (n) => `Found ${n.length} notes across ${workspaces.length} workspaces`,
    async () =>
      (
        await Promise.all(workspaces.map((w) => getNotes(user, w.workspaceId)))
      ).flat()
  );

  await workWithSpinner(
    "Downloading notes...",
    () => `${notes.length} downloaded.`,
    (spinner) => downloadNotes(user, notes, outputPath, spinner)
  );

  await workWithSpinner(
    "Processing notes...",
    () => `Notes processed.`,
    async (spinner) => {
      for (const note of notes) {
        if (!note.path) continue;
        const zipPath = path.join(outputPath, note.path);
        const zip = new ADMZip(zipPath);
        const dir = path.join(extractPath, note.globalId);

        await mkdir(dir, { recursive: true });

        spinner.text = `Extracting ${note.title} to ${dir}`;

        await new Promise((resolve, reject) =>
          zip.extractAllToAsync(dir, true, true, (err) =>
            err ? reject(err) : resolve(undefined)
          )
        );

        spinner.text = `Writing ${note.title} to disk`;

        await writeFile(path.join(dir, "metadata.json"), JSON.stringify(note));

        await rm(zipPath);
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
