import { supabase } from '../config/supabase.js';

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
  return (data ?? []).length > 0;
}
