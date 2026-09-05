import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrganization, getOrganizations } from '../api/organizations';
import Button from './ui/Button';
import { inputClassName } from './ui/inputStyles';

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
      <h2 className="mb-4 text-xl font-semibold text-white">Organizations</h2>

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
        className="flex gap-2"
      >
        <input
          className={inputClassName}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Organization name"
          disabled={createMutation.isPending}
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Create
        </Button>
      </form>
      {createMutation.isError && (
        <p className="mt-2 text-sm text-red-400">
          Failed to create organization: {createMutation.error.message}
        </p>
      )}

      {isLoading && (
        <p className="mt-4 text-sm text-gray-400">Loading organizations...</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-400">
          Failed to load organizations: {error.message}
        </p>
      )}
      {organizations && (
        <ul className="mt-4 divide-y divide-gray-700 rounded-md border border-gray-700">
          {organizations.map((organization) => (
            <li
              key={organization.id}
              className="px-4 py-3 text-sm text-gray-100"
            >
              {organization.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrganizationsPage;
