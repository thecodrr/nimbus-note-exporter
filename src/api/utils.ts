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

export type RequestOptions = {
  user?: { domain?: string; sessionId?: string };
  endpoint: string;
  method: "POST" | "GET" | "HEAD";
  body?: string;
  json?: boolean;
};

export async function request(options: RequestOptions) {
  const { user, endpoint, method, body, json } = options;
  const domain = user?.domain || "nimbusweb.me";
  return await fetch(`https://${domain}${endpoint}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
      Accept: "*/*",
      "Accept-Language": "en-GB,en;q=0.5",
      "Content-Type": json
        ? "application/json"
        : "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: user?.sessionId ? `eversessionid=${user?.sessionId}` : "",
    },
    referrer: `https://${domain}/client`,
    body,
    method,
  });
}
