import type { Organization } from '@bug-snipper/shared-types';
import { supabase } from '../config/supabase.js';

interface OrganizationRow {
  id: string;
  name: string;
  created_at: string;
}

function mapOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select()
    .order('name');
  if (error) throw error;

  return (data as OrganizationRow[]).map(mapOrganizationRow);
}

export async function createOrganization(
  name: string,
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;

  return mapOrganizationRow(data as OrganizationRow);
}
