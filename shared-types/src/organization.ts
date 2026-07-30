export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
}

export interface AllowlistedDomain {
  id: string;
  workspaceId: string;
  hostname: string;
  pathPrefix: string | null;
  createdAt: string;
}
