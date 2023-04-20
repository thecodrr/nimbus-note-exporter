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

import { User } from "./auth";
import { Workspace } from "./teams";
import { request } from "./utils";

export type Folder = {
  globalId: string;
  parentId: string;
  rootParentId?: string;
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
  color?: string;
  isCompleted: boolean;
  workspaceId: string;
  isImported: boolean;
  isFullwidth: boolean;
  userId: number;
  isReady: boolean;
  outliner: boolean;
  readOnly: boolean;
};

export async function getFolders(user: User, workspace: Workspace) {
  const pageSize = 500;
  const folders: Folder[] = [];

  while (folders.length < workspace.foldersCount) {
    const response = await request({
      user,
      endpoint: `/api/workspaces/${
        workspace.globalId
      }/notes?filter=${JSON.stringify({
        type: "folder",
      })}&range=${JSON.stringify({
        limit: pageSize,
        offset: folders.length,
      })}`,
      method: "GET",
    });
    folders.push(...((await response.json()) as Folder[]));
  }

  return folders;
}
