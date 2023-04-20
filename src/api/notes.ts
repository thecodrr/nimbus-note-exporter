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

import { io } from "socket.io-client";
import { User } from "./auth";
import { request } from "./utils";
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import sanitize from "sanitize-filename";
import path from "path";
import Downloader from "nodejs-file-downloader";
import PQueue from "p-queue";
import { Ora } from "ora";
import { Workspace } from "./teams";

export interface Note {
  globalId: string;
  parentId: string;
  createdAt: number;
  dateAdded: number;
  dateUpdated: number;
  updatedAt: number;
  type: string;
  role: string;
  title: string;
  url: string;
  locationLat: number;
  locationLng: number;
  shared: boolean;
  favorite: boolean;
  lastChangeBy: number;
  cntNotes: number;
  size: number;
  editnote: boolean;
  isEncrypted: boolean;
  isCompleted: boolean;
  workspaceId: string;
  isImported: boolean;
  isFullwidth: boolean;
  userId: number;
  isReady: boolean;
  outliner: boolean;

  path?: string;
  tags?: string[];
  parents?: string[];
  workspace?: string;
}

export async function getNotes(
  user: User,
  workspace: Workspace,
  spinner?: Ora
) {
  const pageSize = 500;
  const notes: Note[] = [];

  while (notes.length < workspace.notesCount) {
    const response = await request({
      user,
      endpoint: `/api/workspaces/${
        workspace.globalId
      }/notes?range=${JSON.stringify({
        limit: pageSize,
        offset: notes.length,
      })}`,
      method: "GET",
    });
    notes.push(...((await response.json()) as Note[]));

    if (spinner)
      spinner.text = `Getting notes metadata (${notes.length}/${workspace.notesCount})`;
  }

  if (spinner) spinner.text = `Getting tags for notes...`;

  const pqueue = new PQueue({ concurrency: 16 });
  await pqueue.addAll(
    notes.map((note) => {
      return async () => {
        note.tags = await getNoteTags(user, note);
      };
    })
  );

  return notes;
}

async function getNoteTags(user: User, note: Note) {
  const response = await request({
    user,
    endpoint: `/api/workspaces/${note.workspaceId}/notes/${note.globalId}/tags`,
    method: "GET",
  });
  return (await response.json()) as string[];
}

export async function exportNote(
  user: User,
  note: Note,
  format: "html" | "pdf"
) {
  const response = await request({
    user,
    endpoint: `/api/workspaces/${note.workspaceId}/notes/${note.globalId}/export`,
    method: "POST",
    body: JSON.stringify({
      language: "en",
      timezone: -300,
      workspaceId: note.workspaceId,
      noteGlobalId: note.globalId,
      format,
      style: "normal",
      size: "normal",
      paperFormat: "A4",
      folders: {},
    }),
    json: true,
  });
  const { id } = (await response.json()) as { id: string };
  return id;
}

export async function downloadNotes(
  user: User,
  notes: Note[],
  outputPath: string,
  spinner?: Ora
): Promise<void> {
  if (!existsSync(outputPath)) await mkdir(outputPath);

  const socket = io(`wss://${user.domain}`, {
    extraHeaders: { Cookie: `eversessionid=${user.sessionId}` },
    transports: ["websocket"],
  });

  await new Promise((resolve) =>
    socket.on("socketConnect:userConnected", resolve)
  );

  const queue: string[] = [];
  const messages: {
    message: { uuid: string; fileName: string; fileUrl: string };
    note: Note;
  }[] = [];

  await new Promise<void>(async (resolve) => {
    socket.on("job:success", async (event) => {
      if (event?.message?.fileUrl && queue.includes(event?.message?.uuid)) {
        const noteId = event?.message?.taskData?.noteGlobalId;
        const note = notes.find((note) => note.globalId === noteId);
        if (!note) {
          console.error("Couldn't find note for id", noteId);
          return;
        }

        messages.push({ message: event.message, note });

        queue.splice(queue.indexOf(event?.message?.uuid), 1);

        if (spinner)
          spinner.text = `Saving download urls (${
            notes.length - queue.length
          }/${notes.length})...`;

        if (queue.length === 0) {
          socket.close();
          resolve();
        }
      }
    });

    const pqueue = new PQueue({ concurrency: 16 });

    if (spinner) {
      let count = 0;
      pqueue.on("active", () => {
        spinner.text = `Exporting notes (${++count}/${notes.length})`;
      });
    }

    await pqueue.addAll(
      notes.map((note) => {
        return async () => {
          const exportId = await exportNote(user, note, "html");
          queue.push(exportId);
        };
      })
    );

    if (spinner) spinner.text = `Waiting for download urls...`;
  });

  if (spinner) spinner.text = `Starting download`;

  let done = 0;
  const pqueue = new PQueue({ concurrency: 8 });
  await pqueue.addAll(
    messages.map((event) => {
      return async () => {
        const filename = sanitize(event.message.fileName, {
          replacement: "-",
        });

        if (existsSync(path.join(outputPath, filename))) {
          await rm(path.join(outputPath, filename));
        }

        const downloader = new Downloader({
          url: event.message.fileUrl,
          fileName: filename,
          directory: outputPath,
          shouldBufferResponse: true,
          timeout: 60000,
        });

        await downloader.download();

        if (spinner)
          spinner.text = `Downloaded ${event.message.fileName} (${++done}/${
            messages.length
          })`;

        event.note.path = filename;
      };
    })
  );
}
