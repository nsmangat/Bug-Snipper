import type { Workspace } from '@bug-snipper/shared-types';
import { supabase } from '../config/supabase.js';

interface WorkspaceRow {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

function mapWorkspaceRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select()
    .order('name');
  if (error) throw error;

  return (data as WorkspaceRow[]).map(mapWorkspaceRow);
}
