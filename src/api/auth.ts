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

import { request } from "./utils";

type LoginResponse = {
  errorCode: number;
  body: {
    sessionId: string;
    id: number;
  };
};

export type User = {
  domain: string;
  sessionId: string;
};

export async function login(email: string, password: string): Promise<User> {
  const response = await request({
    endpoint: "/auth/api/auth",
    method: "POST",
    body: `{"login":"${email}","password":"${password}"}`,
  });
  const json = (await response.json()) as LoginResponse;
  if (json.errorCode !== 0) throw new Error("Wrong password.");

  return {
    sessionId: json.body.sessionId,
    domain: await getDomain(json.body.sessionId),
  };
}

async function getDomain(sessionId: string) {
  const response = await request({
    endpoint: "/client?t=regfsour:header",
    method: "HEAD",
    user: { sessionId },
  });
  if (!response.ok) throw new Error("Failed to get user domain.");
  return new URL(response.url).hostname;
}
