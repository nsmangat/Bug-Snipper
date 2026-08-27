import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getReportDetail } from '../api/reports';

function ReportDetailPanel() {
  const { reportId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReportDetail(reportId!),
    enabled: Boolean(reportId),
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
      */}
      <Link to="..">Back to list of reports</Link>

      <h2>Report details</h2>
      <img
        src={screenshotUrl}
        alt="Reported screenshot of the bug"
        style={{ maxWidth: '500px', display: 'block' }}
      />
      <p>Status: {report.status}</p>
      <p>Page: {report.pageUrl}</p>
      <p>Note: {report.note ?? '(no note)'}</p>

      {/* pre preserves the whitespace (spaces, tabs, newlines) as they appear in the source string
      so this will display the HTML and proper clean format in the report details
      If <pre> wasn't used, HTML would be forced into 1 line if a <p> was used for example */}
      <pre>{report.domSnapshot.html}</pre>
    </div>
  );
}

export default ReportDetailPanel;
