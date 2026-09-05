import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getOrganizations } from '../api/organizations';
import { createWorkspace, getWorkspaces } from '../api/workspaces';
import Button from './ui/Button';
import { inputClassName } from './ui/inputStyles';

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
    onSuccess: (workspace) => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setWorkspaceName('');
      toast.success(`Created workspace "${workspace.name}"`);
    },
  });

  if (organizationsLoading) {
    return <p className="text-sm text-gray-400">Loading organizations...</p>;
  }
  if (organizationsError) {
    return (
      <p className="text-sm text-red-400">
        Failed to load organizations: {organizationsError.message}
      </p>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-white">Workspaces</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = workspaceName.trim();
          if (trimmed && organizationId) {
            createMutation.mutate({ organizationId, name: trimmed });
          }
        }}
        className="flex gap-2"
      >
        <select
          className={inputClassName}
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          disabled={createMutation.isPending}
        >
          <option value="" disabled className="bg-gray-900 text-gray-100">
            Select an organization
          </option>
          {organizations?.map((organization) => (
            <option
              key={organization.id}
              value={organization.id}
              className="bg-gray-900 text-gray-100"
            >
              {organization.name}
            </option>
          ))}
        </select>
        <input
          className={inputClassName}
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          placeholder="Workspace name"
          disabled={createMutation.isPending}
        />
        <Button
          type="submit"
          disabled={createMutation.isPending || !organizationId}
        >
          Create
        </Button>
      </form>
      {createMutation.isError && (
        <p className="mt-2 text-sm text-red-400">
          Failed to create workspace: {createMutation.error.message}
        </p>
      )}

      {workspacesLoading && (
        <p className="mt-4 text-sm text-gray-400">Loading workspaces...</p>
      )}
      {workspacesError && (
        <p className="mt-4 text-sm text-red-400">
          Failed to load workspaces: {workspacesError.message}
        </p>
      )}
      {workspaces && (
        <ul className="mt-4 divide-y divide-gray-700 rounded-md border border-gray-700">
          {workspaces.map((workspace) => (
            <li key={workspace.id} className="px-4 py-3 text-sm text-gray-100">
              {workspace.name}{' '}
              <span className="text-gray-500">
                (
                {organizationNamesById.get(workspace.organizationId) ??
                  'unknown organization'}
                )
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WorkspacesPage;
