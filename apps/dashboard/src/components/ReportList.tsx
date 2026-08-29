import type { ReportStatus } from '@bug-snipper/shared-types';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getReports } from '../api/reports';

const STATUS_OPTIONS: ReportStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'wontfix',
];

function ReportList() {
  const { workspaceId } = useParams();

  // Same "URL is the state" approach as WorkspaceSelector, but for a query param (params after the ?
  // in the URL) instead of a route param
  // ?status=open persists through refresh/back-forward/sharing the same way workspaceId does
  // searchParams.get always returns string | null, there's no schema tying it to ReportStatus,
  // so an invalid value here will be caught by the backend's own zod validation and result as a query error
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') as ReportStatus | null;

  const {
    data: reports,
    isLoading,
    error,
  } = useQuery({
    // workspaceId in the key means switching workspaces is a different cache entry, not a
    // refetch that could briefly show stale data from the previous workspace under the new one
    //
    // Hierarchical dependent query key
    // i.e. first key is usually general or global resource like all reports, establishes namespace for the resource
    // so invalidateQueries({queryKey:reports}) refreshes every report
    // second key is typically dynamic variable i.e. workspace id to filter on
    // will get unique caching i.e. ['report1', workspace1], ['report2', workspace1], ['report3', workspace2]
    // workspace 1 and 2 will have separate cache buckets
    // whenever second variable changes i.e. a different workspace is selected to filter on, useQuery calls queryFn
    // to pull in the fresh data
    //
    // status added as a third key segment for the same reason, filtering to 'open' vs 'resolved'
    // within the same workspace are different cache entries, not the same one being re-filtered
    queryKey: ['reports', workspaceId, status],
    queryFn: () => getReports(workspaceId!, status ?? undefined),
    // This route only ever renders with a workspaceId param present, but the type
    // is still `string | undefined` since useParams can't know that,
    // so enabled guards against calling getReports(undefined)
    // i.e. enabled:true (default) means the query runs automatically on component mount and whenever
    // the query key changes
    // enabled:false means the query is disabled, so it won't fetch data on mount or if query key changes
    //
    // Boolean() converts the param into primitive boolean depending on if the passed in
    // value is truthy i.e. populated or falsy i.e. empty,undefined ect.
    enabled: Boolean(workspaceId),
  });

  if (isLoading) return <p>Loading in reports...</p>;
  if (error) return <p>Failed to load in reports: {error.message}</p>;

  return (
    <div>
      <p>
        <Link to="domains">Manage allowlisted domains for this workspace</Link>
      </p>

      <select
        value={status ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          // Passing {} (i.e. no status key) rather than {status: ''} because an empty-string value
          // would mean a real but meaningless ?status= in the URL instead of just
          // omitting the parameter
          setSearchParams(value ? { status: value } : {});
        }}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ul>
        {reports?.map((report) => (
          <li key={report.id}>
            {/* Initial path is /workspaces/:workspaceId, to get to a report details page, link will be
             in the form /workspaces/:workspaceId/reports/:id
             Also carrying the current search string (the ?status= filter) along, otherwise Link
             only changes pathname and drops any existing query string */}
            <Link
              to={{
                pathname: `reports/${report.id}`,
                search: searchParams.toString(),
              }}
            >
              [{report.status}] {report.domain} — {report.pageUrl}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReportList;
