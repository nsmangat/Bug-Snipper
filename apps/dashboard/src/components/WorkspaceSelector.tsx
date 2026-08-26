import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getWorkspaces } from '../api/workspaces';

function WorkspaceSelector() {
  const navigate = useNavigate();
  // Reads the :workspaceId route param this component itself doesn't own — App.tsx defines the
  // route, this just reads whatever's currently in the URL to know which option to show selected.
  const { workspaceId } = useParams();

  const {
    data: workspaces,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  });

  if (isLoading) return <p>Loading in workspaces...</p>;
  if (error) return <p>Failed to load in workspaces: {error.message}</p>;

  return (
    <select
      value={workspaceId ?? ''}
      // Navigating is the only state change, no local selected workspace state
      // The URL is basically like the state, and useParams just reads it back out
      onChange={(event) => navigate(`/workspaces/${event.target.value}`)}
    >
      <option value="" disabled>
        Select a workspace
      </option>
      {workspaces?.map((workspace) => (
        <option key={workspace.id} value={workspace.id}>
          {workspace.name}
        </option>
      ))}
    </select>
  );
}

export default WorkspaceSelector;
