import type {
  AllowlistedDomain,
  DomainListResponse,
} from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

export async function getDomains(
  workspaceId: string,
): Promise<AllowlistedDomain[]> {
  const url = new URL(`${BACKEND_URL}/api/domains`);
  url.searchParams.set('workspaceId', workspaceId);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error getting domains: (${response.status})`);
  }

  const body = (await response.json()) as DomainListResponse;
  return body.domains;
}

export async function createDomain(
  workspaceId: string,
  hostname: string,
  pathPrefix: string | null,
): Promise<AllowlistedDomain> {
  const response = await fetch(`${BACKEND_URL}/api/domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, hostname, pathPrefix }),
  });
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? `Error creating domain: (${response.status})`);
  }

  return (await response.json()) as AllowlistedDomain;
}

export async function deleteDomain(id: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/domains/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Error deleting domain: (${response.status})`);
  }
}
