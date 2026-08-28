import type { ReportStatus } from '@bug-snipper/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  deleteReport,
  getReportDetail,
  updateReportStatus,
} from '../api/reports';

const STATUS_OPTIONS: ReportStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'wontfix',
];

function ReportDetailPanel() {
  // workspaceId is available here too, even though this component's own route
  // (reports/:reportId) doesn't declare it, it's part of the same merged params as the parent
  // /workspaces/:workspaceId route
  // Need workspaceId now to call invalidateQueries on to refresh the updated/deleted data
  const { workspaceId, reportId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // This route doesn't use ?status= itself, but it's still in the URL, carried over by
  // ReportList's Link when navigating in, so reading it back out here is what lets "Back to
  // list" option restore the same filter instead of defaulting back to an unfiltered list
  const [searchParams] = useSearchParams();
  const backToPath = { pathname: '..', search: searchParams.toString() };

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReportDetail(reportId!),
    enabled: Boolean(reportId),
  });

  // useMutation is an alternative to using standard fetch or axios calls to POST or DELETE for example
  // Could use the above, but useMutation automates a lot of the above i.e. don't need the same boilerplate
  // code, has automatic state management via variables like isPending, isSuccess, ect, utilizes
  // invalidateQueries to mark data as stale in the cache which triggers a refetch to get the latest data and more
  // **mutationFn is only called when statusMutation.mutate(...) is called, not on mount like useQuery's queryFn
  //
  // invalidateQueries on ['reports', workspaceId] uses the same prefix matching covered
  // earlier: it refreshes every cached reports list for this workspace no matter which
  // ?status= filter each one was fetched with, not just the one currently on screen
  const statusMutation = useMutation({
    mutationFn: (status: ReportStatus) => updateReportStatus(reportId!, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['reports', workspaceId],
      });
      void queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(reportId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['reports', workspaceId],
      });
      // Navigate back to reportsList page after deleting the current report
      // Doing it here on the onSuccess instead of the .mutate() call since the mutation
      // needs to fully resolve, here it'll be confirmed if the report successfully deleted
      navigate(backToPath);
    },
  });

  if (isLoading) return <p>Loading in report details...</p>;
  if (error) return <p>Failed to load in report details: {error.message}</p>;
  if (!data) return null;

  const { report, screenshotUrl } = data;

  return (
    <div>
      {/* ".." goes up one level in the route hierarchy i.e. back to the sibling index route
      (index route is the default child route that renders inside a parent route's <Outlet/>)
      which is ReportList
      Not one URL segment, this route is a direct child of /workspaces/:workspaceId, the path of the index route
      Also added search params here as explained above to maintain the status filter when going back
      */}
      <Link to={backToPath}>Back to list of reports</Link>

      <h2>Report details</h2>
      <img
        src={screenshotUrl}
        alt="Reported screenshot of the bug"
        style={{ maxWidth: '500px', display: 'block' }}
      />

      {/* Dropdown to change the status of a report */}
      <label>
        Status:{' '}
        <select
          value={report.status}
          disabled={statusMutation.isPending}
          onChange={(event) =>
            statusMutation.mutate(event.target.value as ReportStatus)
          }
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {statusMutation.isError && (
        <p>Failed to update status: {statusMutation.error.message}</p>
      )}

      <p>Page: {report.pageUrl}</p>
      <p>Note: {report.note ?? '(no note)'}</p>

      <button
        disabled={deleteMutation.isPending}
        onClick={() => {
          // window.confirm — a plain native guard, no custom modal system exists yet, and
          // deletion also permanently removes the screenshot file, so it's worth one extra step.
          if (window.confirm('Delete this report? This cannot be undone.')) {
            deleteMutation.mutate();
          }
        }}
      >
        Delete report
      </button>
      {deleteMutation.isError && (
        <p>Failed to delete report: {deleteMutation.error.message}</p>
      )}

      {/* pre preserves the whitespace (spaces, tabs, newlines) as they appear in the source string
      so this will display the HTML and proper clean format in the report details
      If <pre> wasn't used, HTML would be forced into 1 line if a <p> was used for example */}
      <pre>{report.domSnapshot.html}</pre>
    </div>
  );
}

export default ReportDetailPanel;
