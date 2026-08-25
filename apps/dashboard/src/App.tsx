import { useQuery } from '@tanstack/react-query';
import { getReports } from './api/reports';

function App() {
  // queryKey is the cache key this result is stored under
  // Any other useQuery elsewhere in the tree with the same key
  // ['reports'] shares this exact cached result instead of re-fetching.
  const {
    data: reports,
    isLoading, // Boolean flag to indicate if request is currently in progress or not,
    // changes once data or error is resolved
    error, // Same error as getReports' throw new error(...)
  } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
  });

  return (
    <div>
      <h1>Reports Dashboard</h1>
      {isLoading && <p>Loading in reports...</p>}
      {error && <p>Failed to load in reports: {error.message}</p>}
      {reports && (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              [{report.status}] {report.domain} — {report.pageUrl}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
