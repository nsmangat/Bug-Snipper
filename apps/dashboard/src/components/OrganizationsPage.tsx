import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrganization, getOrganizations } from '../api/organizations';

function OrganizationsPage() {
  const queryClient = useQueryClient();
  // Unlike workspaceId/status, name is just text typed into a form
  // it has no reason to be shareable, bookmarkable, or survive a refresh, so
  // useState hook better to use here than params hooks
  const [name, setName] = useState('');

  const {
    data: organizations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setName('');
    },
  });

  return (
    <div>
      <h2>Organizations</h2>

      <form
        onSubmit={(event) => {
          // preventDefault to prevent browser's default behaviour i.e. don't want
          // full page refresh on form submit since useMutation takes care of it
          event.preventDefault();
          // Trim to remove whitespaces from begining and ending of name
          const trimmedName = name.trim();
          if (trimmedName) {
            createMutation.mutate(trimmedName);
          }
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Organization name"
          disabled={createMutation.isPending}
        />
        <button type="submit" disabled={createMutation.isPending}>
          Create
        </button>
      </form>
      {createMutation.isError && (
        <p>Failed to create organization: {createMutation.error.message}</p>
      )}

      {isLoading && <p>Loading organizations...</p>}
      {error && <p>Failed to load organizations: {error.message}</p>}
      {organizations && (
        <ul>
          {organizations.map((organization) => (
            <li key={organization.id}>{organization.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrganizationsPage;
