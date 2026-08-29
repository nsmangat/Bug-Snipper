import type { AllowlistedDomain } from '@bug-snipper/shared-types';
import { supabase } from '../config/supabase.js';

export class DuplicateDomainError extends Error {
  constructor() {
    super('This hostname and path prefix combination is already registered.');
    this.name = 'DuplicateDomainError';
  }
}

export class DomainNotFoundError extends Error {
  constructor() {
    super('Domain not found.');
    this.name = 'DomainNotFoundError';
  }
}

// What to return when we find a matching domain
export interface DomainMatch {
  workspaceId: string;
  matchedPrefix: string | null;
}

// Used to describe what a row from allowlisted_domains table looks like
interface AllowlistedDomainRow {
  workspace_id: string;
  path_prefix: string | null;
}

/** Best match or most specific match: for allowlisted rows for this hostname, keep only those whose
path_prefix is null (i.e. nothing after hostname) or a prefix of the given path, pick the
one with the longest non-null path_prefix
Public check endpoint and report submission use this to derive a workspace so the logic here should
never be duplicated there **/
export async function matchDomain(
  hostname: string,
  path: string,
): Promise<DomainMatch | null> {
  const { data, error } = await supabase
    .from('allowlisted_domains')
    .select('workspace_id, path_prefix')
    .eq('hostname', hostname);

  if (error) throw error;

  const rows = (data ?? []) as AllowlistedDomainRow[];

  // For all the path_prefixes registered under this hostname, determining which one is being asked for
  // If multiple results, which is the most specific
  // i.e. /courses vs /courses/102 where the path is /courses/102/assignments/5
  // Filtering for the best matches
  const candidatePathPrefixes = rows.filter(
    (row) => row.path_prefix === null || path.startsWith(row.path_prefix), // if
  );

  if (candidatePathPrefixes.length === 0) return null;

  const bestMatchingPathPrefix = candidatePathPrefixes.reduce(
    (currLongest, currCandidate) =>
      (currCandidate.path_prefix?.length ?? 0) >
      (currLongest.path_prefix?.length ?? 0)
        ? currCandidate
        : currLongest,
  );

  return {
    workspaceId: bestMatchingPathPrefix.workspace_id,
    matchedPrefix: bestMatchingPathPrefix.path_prefix,
  };
}

/** Checking to see if the hostname exists i.e. do we have any rows with this hostname
 * limit(1) since just checking for the existence of at least 1 row
 * Purpose is for CORS i.e. should we even allow this requets with this hostname to go through
 */
export async function isHostnameAllowlisted(
  hostname: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('allowlisted_domains')
    .select('id')
    .eq('hostname', hostname)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0; // greater than 0 means hostname in the DB so will evaluate to true, else false
}

interface AllowlistedDomainFullRow {
  id: string;
  workspace_id: string;
  hostname: string;
  path_prefix: string | null;
  created_at: string;
}

function mapDomainRow(row: AllowlistedDomainFullRow): AllowlistedDomain {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    hostname: row.hostname,
    pathPrefix: row.path_prefix,
    createdAt: row.created_at,
  };
}

export async function listDomainsForWorkspace(
  workspaceId: string,
): Promise<AllowlistedDomain[]> {
  const { data, error } = await supabase
    .from('allowlisted_domains')
    .select()
    .eq('workspace_id', workspaceId)
    .order('hostname');
  if (error) throw error;

  return (data as AllowlistedDomainFullRow[]).map(mapDomainRow);
}

export async function createDomain(
  workspaceId: string,
  hostname: string,
  pathPrefix: string | null,
): Promise<AllowlistedDomain> {
  const { data, error } = await supabase
    .from('allowlisted_domains')
    .insert({ workspace_id: workspaceId, hostname, path_prefix: pathPrefix })
    .select()
    .single();

  if (error) {
    // 23505 = Postgres's unique_violation code — this table's unique(hostname, path_prefix)
    // constraint is the only one that could trigger it here, so it's safe to translate directly
    // into the specific "you already registered this" error rather than a generic 500.
    if (error.code === '23505') {
      throw new DuplicateDomainError();
    }
    throw error;
  }

  return mapDomainRow(data as AllowlistedDomainFullRow);
}

export async function deleteDomain(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('allowlisted_domains')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new DomainNotFoundError();
}
