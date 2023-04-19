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
import { request } from "./utils";

export type Workspace = {
  orgId: string;
  workspaceId: string;
  color: string;
  title: string;
};

export async function getWorkspaces(user: User) {
  const response = await request({
    endpoint: `/gwapi2/ft%3Atasks/workspace-infos`,
    method: "GET",
    user,
  });
  if (!response.ok) throw new Error("Failed to get workspaces.");
  return <Workspace[]>await response.json();
}
