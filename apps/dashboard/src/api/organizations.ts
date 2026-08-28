import type {
  Organization,
  OrganizationListResponse,
} from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

export async function getOrganizations(): Promise<Organization[]> {
  const response = await fetch(`${BACKEND_URL}/api/organizations`);
  if (!response.ok) {
    throw new Error(`Error getting organizations: (${response.status})`);
  }

  const body = (await response.json()) as OrganizationListResponse;
  return body.organizations;
}

export async function createOrganization(name: string): Promise<Organization> {
  const response = await fetch(`${BACKEND_URL}/api/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Error creating organization: (${response.status})`);
  }

  return (await response.json()) as Organization;
}
