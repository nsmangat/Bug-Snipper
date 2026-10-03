import type { ReportStatus } from '@bug-snipper/shared-types';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
import Button from './ui/Button';
import { inputClassName } from './ui/inputStyles';

const STATUS_OPTIONS: ReportStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'abandoned',
];

// null means the request never got a response at all (like DNS failure, CORS block,
// connection refused, timeout) and is treated the same as a 5xx since both mean that this call failed
function getStatusBadgeClassName(statusCode: number | null): string {
  if (statusCode === null || statusCode >= 500)
    return 'bg-red-900 text-red-200';
  if (statusCode >= 400) return 'bg-yellow-900 text-yellow-200';
  if (statusCode >= 300) return 'bg-blue-900 text-blue-200';
  return 'bg-green-900 text-green-200';
}

function ReportDetailPanel() {
  // workspaceId is available here too, even though this component's own route
  // (reports/:reportId) doesn't declare it, it's part of the same merged params as the parent
  // /workspaces/:workspaceId route
  // Need workspaceId now to call invalidateQueries on to refresh the updated/deleted data
  const { workspaceId, reportId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local UI only state for checking if expanded HTML overlay is open or not
  const [isHtmlExpanded, setIsHtmlExpanded] = useState(false);

  // Escape closes the overlay, same pattern as the extension's capture overlay (content.ts)
  // registered only while expanded, and cleaned up on close/unmount so it doesn't fire
  // on every escape press
  useEffect(() => {
    if (!isHtmlExpanded) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsHtmlExpanded(false);
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isHtmlExpanded]);

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
    onSuccess: (report) => {
      void queryClient.invalidateQueries({
        queryKey: ['reports', workspaceId],
      });
      void queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      toast.success(`Status updated to "${report.status}"`);
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
      toast.success('Report deleted');
    },
  });

  if (isLoading)
    return (
      <p className="text-sm text-gray-400">Loading in report details...</p>
    );
  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load in report details: {error.message}
      </p>
    );
  }
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
      <Link
        to={backToPath}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        Back to list of reports
      </Link>

      <h2 className="mt-4 mb-4 text-2xl font-semibold text-white">
        Report details
      </h2>

      <img
        src={screenshotUrl}
        alt="Reported screenshot of the bug"
        className="max-w-lg rounded-md border border-gray-800"
      />

      <div className="mt-6 space-y-6 rounded-md border border-gray-700 p-4">
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-gray-300 uppercase">
            Status:
          </h3>
          <select
            className={`${inputClassName} mt-2`}
            value={report.status}
            disabled={statusMutation.isPending}
            onChange={(event) =>
              statusMutation.mutate(event.target.value as ReportStatus)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
                className="bg-gray-900 text-gray-100"
              >
                {option}
              </option>
            ))}
          </select>
          {statusMutation.isError && (
            <p className="mt-2 text-sm text-red-400">
              Failed to update status: {statusMutation.error.message}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold tracking-wide text-gray-300 uppercase">
            Page:
          </h3>
          {report.documentTitle && (
            <p className="mt-2 text-sm text-gray-100">{report.documentTitle}</p>
          )}
          <a
            href={report.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-sm break-all text-blue-400 hover:text-blue-300"
          >
            {report.pageUrl}
          </a>
          {/* referrer is usually going to be empty (direct navigation, typed URL, bookmark) */}
          {report.referrer && (
            <p className="mt-1 text-xs break-all text-gray-500">
              Referred from: {report.referrer}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold tracking-wide text-gray-300 uppercase">
            Browser:
          </h3>
          {/* Only userAgent and language are real captured values, browserInfo also has
              browserName/browserVersion/os fields, but those are currently hardcoded in
              the extension ('chrome'/'unknown'/'unknown'), not actually detected */}
          <p className="mt-2 text-sm break-all text-gray-300">
            {report.browserInfo.userAgent}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Language: {report.browserInfo.language}
          </p>
        </section>

        <section>
          <h3 className="text-xs font-semibold tracking-wide text-gray-300 uppercase">
            Note:
          </h3>
          {/* wrap-break-word - fixes issue of a long string flowing out of the card */}
          <p className="mt-2 text-sm text-gray-300 wrap-break-word">
            {report.note}
          </p>
        </section>
      </div>

      <div className="mt-4">
        <Button
          variant="danger"
          disabled={deleteMutation.isPending}
          onClick={() => {
            // window.confirm — a plain native guard, no custom modal system exists yet, and
            // deletion also permanently removes the screenshot file, so it's worth one extra step.
            if (
              window.confirm(
                'Delete this report? This action cannot be undone after confirmation.',
              )
            ) {
              deleteMutation.mutate();
            }
          }}
        >
          Delete report
        </Button>
      </div>
      {deleteMutation.isError && (
        <p className="mt-2 text-sm text-red-400">
          Failed to delete report: {deleteMutation.error.message}
        </p>
      )}

      {/* preserves the whitespace (spaces, tabs, newlines) as they appear in the source string
      so this will display the HTML and proper clean format in the report details
      If <pre> wasn't used, HTML would be forced into 1 line if a <p> was used for example */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Captured HTML
          </h3>
          <button
            onClick={() => setIsHtmlExpanded(true)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Expand
          </button>
        </div>
        {/* whitespace-pre-wrap + break-words, still a <pre> (whitespace/newlines preserved), but
            long lines wrap instead of forcing horizontal scroll
            max-h-64 + overflow-y-auto caps how much vertical space this takes in the normal page flow
            the Expand button is what gets the rest in the overlay below */}
        <pre className="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-3 text-xs whitespace-pre-wrap wrap-break-word text-gray-300">
          {report.domSnapshot.html}
        </pre>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Captured errors ({report.errors.length})
        </h3>
        {report.errors.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No errors were captured around the time of this report.
          </p>
        ) : (
          <ul className="mt-2 max-h-64 divide-y divide-gray-800 overflow-y-auto rounded-md border border-gray-800">
            {report.errors.map((capturedError, index) => (
              <li key={index} className="p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      capturedError.type === 'error'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-orange-900 text-orange-200'
                    }`}
                  >
                    {capturedError.type}
                  </span>
                  <span className="text-gray-500">
                    {new Date(capturedError.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 wrap-break-word text-gray-300">
                  {capturedError.message}
                </p>
                {capturedError.stack && (
                  <pre className="mt-1 overflow-x-auto text-gray-500">
                    {capturedError.stack}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent request only, and only method/url/status, never bodies or headers
           Catches hiddenish stuff like  a fetch() that resolves with a 500 and gets ignored by the
          page's own code, which might produce a broken UI with no thrown error and nothing visible in a
          screenshot */}
      <section className="mt-6">
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Recent network requests ({report.networkRequests.length})
        </h3>
        {report.networkRequests.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No network activity was captured around the time of this report.
          </p>
        ) : (
          <ul className="mt-2 max-h-64 divide-y divide-gray-800 overflow-y-auto rounded-md border border-gray-800 text-xs">
            {report.networkRequests.map((request, index) => (
              <li key={index} className="flex items-center gap-2 p-2">
                <span
                  className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center font-medium ${getStatusBadgeClassName(request.statusCode)}`}
                >
                  {request.statusCode ?? 'failed'}
                </span>
                <span className="w-14 shrink-0 text-gray-500">
                  {request.method}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-300">
                  {request.url}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isHtmlExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">Captured HTML</span>
            <button
              onClick={() => setIsHtmlExpanded(false)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Close (Esc)
            </button>
          </div>
          <pre className="flex-1 overflow-auto rounded-md border border-gray-800 bg-gray-900 p-4 text-sm whitespace-pre-wrap wrap-break-word text-gray-300">
            {report.domSnapshot.html}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ReportDetailPanel;
