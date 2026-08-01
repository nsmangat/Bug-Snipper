export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

/* Sort of like separate pages under the same organization
i.e. want a list of bugs/reports for 1 course, which might be 
different than the bugs/reports for another course all under the same organization */
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
