import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getWorkspaces } from '../api/workspaces';
import { inputClassName } from './ui/inputStyles';

function WorkspaceSelector() {
  const navigate = useNavigate();
  // Reads the :workspaceId route param from the URL
  // In the initial '/' route this will be undefined so value='' meaning nothing's been selected yet,
  // but when selected, calls the onChange, which calls navigate() which basically begins the re-render from BrowserRouter
  // which re-renders every component below since BrowserRouter wraps everything
  // This is the re-render which now has url that contains a workplace id so useParams will then have a value
  const { workspaceId } = useParams();

  const {
    data: workspaces,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  });

  if (isLoading)
    return <p className="text-sm text-gray-400">Loading in workspaces...</p>;

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load in workspaces: {error.message}
      </p>
    );
  }

  return (
    <select
      className={inputClassName}
      value={workspaceId ?? ''}
      // Navigating is the only state change, no local selected workspace state
      // The URL is basically like the state, and useParams just reads it back out
      onChange={(event) => navigate(`/workspaces/${event.target.value}`)}
    >
      {/* bg-gray-900+text-gray-100 on <option> isn't guaranteed since a lot of browsers
          render an open <select>'s dropdown list using native OS chrome that might ignore CSS
          so this might visibly apply depending on OS/browser
          The <select> itself (closed state) isn't affected by this and always follows inputClassName */}
      <option value="" disabled className="bg-gray-900 text-gray-100">
        Select a workspace
      </option>
      {workspaces?.map((workspace) => (
        <option
          key={workspace.id}
          value={workspace.id}
          className="bg-gray-900 text-gray-100"
        >
          {workspace.name}
        </option>
      ))}
    </select>
  );
}

export default WorkspaceSelector;
