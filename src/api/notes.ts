/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2022 Streetwriters (Private) Limited

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
}

export async function getNotes(user: User, workspaceId: string) {
  const response = await request({
    user,
    endpoint: `/api/workspaces/${workspaceId}/notes`,
    method: "GET"
  });
  const notes = (await response.json()) as Note[];

  const pqueue = new PQueue({ concurrency: 8 });

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
    method: "GET"
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
      folders: {}
    }),
    json: true
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
    transports: ["websocket"]
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
        if (queue.length === 0) {
          socket.close();
          resolve();
        }
      }
    });

    const pqueue = new PQueue({ concurrency: 8 });

    await pqueue.addAll(
      notes.map((note) => {
        return async () => {
          const exportId = await exportNote(user, note, "html");
          queue.push(exportId);
          if (spinner) spinner.text = `Exporting ${note.globalId} as html...`;
        };
      })
    );

    if (spinner) spinner.text = `Waiting for download urls...`;
  });

  let done = 0;
  const pqueue = new PQueue({ concurrency: 8 });
  await pqueue.addAll(
    messages.map((event) => {
      return async () => {
        const filename = sanitize(event.message.fileName, {
          replacement: "-"
        });

        if (existsSync(path.join(outputPath, filename))) {
          await rm(path.join(outputPath, filename));
        }

        const downloader = new Downloader({
          url: event.message.fileUrl,
          fileName: filename,
          directory: outputPath,
          shouldBufferResponse: true,
          timeout: 60000
        });

        await downloader.download();

        if (spinner)
          spinner.text = `(${++done}/${messages.length}) Downloaded ${
            event.message.fileName
          }`;

        event.note.path = filename;
      };
    })
  );
}
