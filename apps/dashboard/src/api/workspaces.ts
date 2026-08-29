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

export async function createWorkspace(
  organizationId: string,
  name: string,
): Promise<Workspace> {
  const response = await fetch(`${BACKEND_URL}/api/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, name }),
  });
  if (!response.ok) {
    throw new Error(`Error creating workspace: (${response.status})`);
  }

  return (await response.json()) as Workspace;
}
