import type {
  Workspace,
  WorkspaceListResponse,
} from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

export async function getWorkspaces(): Promise<Workspace[]> {
  const response = await fetch(`${BACKEND_URL}/api/workspaces`);
  if (!response.ok) {
    throw new Error(`Error getting workspaces: (${response.status})`);
  }

  const body = (await response.json()) as WorkspaceListResponse;
  return body.workspaces;
}
