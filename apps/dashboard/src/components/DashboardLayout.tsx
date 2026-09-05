import { Link, Outlet } from 'react-router-dom';
import WorkspaceSelector from './WorkspaceSelector';

// This wraps every route
// WorkspaceSelector needs to render even before any workspace is picked. useParams() inside WorkspaceSelector still
// returns undefined workspaceId on "/" and the real one on "/workspaces/:workspaceId"
// or deeper, because React Router merges params from the entire matched branch, not just
// routes at or above this component's nesting level
function DashboardLayout() {
  return (
    // min-h-screen so the black background fills the full viewport even when page content is short
    // Colors hardcoded to contrast with default dark bg i.e. bg-black, text-white, ect.
    <div className="min-h-screen bg-black">
      <header className="border-b border-gray-800 bg-gray-900">
        {/* mx-auto + max-w-5xl centers this bar and caps the width on wide screens */}
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-white">
            Reports Dashboard
          </h1>
          <nav className="flex gap-4 text-sm font-medium text-gray-300">
            <Link to="/organizations" className="hover:text-white">
              Manage organizations
            </Link>
            <Link to="/workspaces" className="hover:text-white">
              Manage workspaces
            </Link>
          </nav>
        </div>
      </header>

      {/* Secondary bar for the workspace selector */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-5xl px-6 py-3">
          <WorkspaceSelector />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
