import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizations } from '../api/organizations';
import { createWorkspace, getWorkspaces } from '../api/workspaces';

function WorkspacesPage() {
  const queryClient = useQueryClient();
  const [workspaceName, setWorkspaceName] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  const {
    data: organizations,
    isLoading: organizationsLoading,
    error: organizationsError,
  } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  const {
    data: workspaces,
    isLoading: workspacesLoading,
    error: workspacesError,
  } = useQuery({
    // Same key WorkspaceSelector uses
    // Invalidating ['workspaces'] below refreshes both this page's workspace list and the dropdown in DashboardLayout,
    // since the cach is being shared by the use of this key, no actual reference between the 2 pages
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  });

  // Workspace only stores organizationId, not the organization's name, so mapping id to name
  // so that when displaying the workspaces, can also show the organization name they associated with
  // Could've used org name or joined on these 2 properties in the backend, but would then have to change
  // the response shape, this is a bit more simple
  const organizationNamesById = new Map(
    organizations?.map((organization) => [organization.id, organization.name]),
  );

  const createMutation = useMutation({
    mutationFn: (input: { organizationId: string; name: string }) =>
      createWorkspace(input.organizationId, input.name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setWorkspaceName('');
    },
  });

  if (organizationsLoading) return <p>Loading organizations...</p>;
  if (organizationsError) {
    return <p>Failed to load organizations: {organizationsError.message}</p>;
  }

  return (
    <div>
      <h2>Workspaces</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = workspaceName.trim();
          if (trimmed && organizationId) {
            createMutation.mutate({ organizationId, name: trimmed });
          }
        }}
      >
        <select
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          disabled={createMutation.isPending}
        >
          <option value="" disabled>
            Select an organization
          </option>
          {organizations?.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <input
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          placeholder="Workspace name"
          disabled={createMutation.isPending}
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !organizationId}
        >
          Create
        </button>
      </form>
      {createMutation.isError && (
        <p>Failed to create workspace: {createMutation.error.message}</p>
      )}

      {workspacesLoading && <p>Loading workspaces...</p>}
      {workspacesError && (
        <p>Failed to load workspaces: {workspacesError.message}</p>
      )}
      {workspaces && (
        <ul>
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              {workspace.name} (
              {organizationNamesById.get(workspace.organizationId) ??
                'unknown organization'}
              )
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WorkspacesPage;
