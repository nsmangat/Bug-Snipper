import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getReports } from '../api/reports';

function ReportList() {
  const { workspaceId } = useParams();

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
    queryKey: ['reports', workspaceId],
    queryFn: () => getReports(workspaceId!),
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
    <ul>
      {reports?.map((report) => (
        <li key={report.id}>
          {/* Initial path is /workspaces/:workspaceId, to get to a report details page, link will be
           in the form /workspaces/:workspaceId/reports/:id */}
          <Link to={`reports/${report.id}`}>
            [{report.status}] {report.domain} — {report.pageUrl}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default ReportList;
