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
import { Attachment } from "./types";
import { request } from "./utils";

export interface Organization {
  globalId: string;
  subdomain: string;
  domain: null;
  suspended: boolean;
  suspendedReason: string;
  title: string;
  // userRole: UserRole;
  userId: number;
  createdAt: number;
  updatedAt: number;
  user: User;
  maxMembers: number;
  type: string;
  smallLogoStoredFileUUID: null;
  bigLogoStoredFileUUID: null;
  authFormText: string;
  authFormPrivacyLinkEnabled: boolean;
  authAllowRegistration: boolean;
  privacyLinkText: string;
  privacyLinkUrl: string;
  orgType: string;
  // info: Info;
  hasBillingInfo: boolean;
}

export async function getOrganizations(user: User) {
  const response = await request({
    endpoint: `/api/organizations`,
    method: "GET",
    user: { domain: "teams.nimbusweb.me", sessionId: user.sessionId },
  });
  if (!response.ok) throw new Error("Failed to get organizations.");
  return <Organization[]>await response.json();
}

export interface Workspace {
  globalId: string;
  title: string;
  orgId: string;
  createdAt: number;
  updatedAt: number;
  userId: number;
  isDefault: boolean;
  // members:                      Member[];
  notesCount: number;
  foldersCount: number;
  invites: any[];
  notesEmail: string;
  isCurrentUserWorkspaceMember: boolean;
  color: string;
  brandingProfileId: null;
  webClientBrandingProfileId: null;
  magicLinks: any[];
}

export async function getWorkspaces(user: User, organizationId: string) {
  const response = await request({
    endpoint: `/api/workspaces/${organizationId}`,
    method: "GET",
    user: { domain: "teams.nimbusweb.me", sessionId: user.sessionId },
  });
  if (!response.ok) throw new Error("Failed to get workspaces.");
  return <Workspace[]>await response.json();
}

export async function getAttachments(user: User, workspaceId: string) {
  const response = await request({
    user,
    endpoint: `/api/workspaces/${workspaceId}/attachments`,
    method: "GET",
  });
  return (await response.json()) as Attachment[];
}
