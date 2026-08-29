import { Link, Outlet } from 'react-router-dom';
import WorkspaceSelector from './WorkspaceSelector';

// This wraps every route
// WorkspaceSelector needs to render even before any workspace is picked. useParams() inside WorkspaceSelector still
// returns undefined workspaceId on "/" and the real one on "/workspaces/:workspaceId"
// (or deeper), because React Router merges params from the entire matched branch, not just
// routes at or above this component's own nesting level
function DashboardLayout() {
  return (
    <div>
      <h1>Reports Dashboard</h1>
      {/*using <nav> as navigational block since workspace and domain management links will be added */}
      <nav>
        <Link to="/organizations">Manage organizations</Link>
        {' | '}
        <Link to="/workspaces">Manage workspaces</Link>
      </nav>
      <WorkspaceSelector />
      <Outlet />
    </div>
  );
}

export default DashboardLayout;
