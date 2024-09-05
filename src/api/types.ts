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
  attachments?: Attachment[];
  parents?: string[];
  workspace?: string;
}

export interface Attachment {
  globalId: string;
  displayName: string;
  mime: string;
  dateAdded: number;
  dateUpdated: number;
  noteGlobalId: string;
  type: string;
  role: string;
  extra: Extra;
  isScreenshot: boolean;
  size: number;
  inList: boolean;
  storedFileUUID: string;
  isEncrypted: boolean;
  workspaceId: string;
  userId: number;
}

export interface Extra {
  height?: number;
  width?: number;
  type?: string;
}
