import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { createDomain, deleteDomain, getDomains } from '../api/domains';

function DomainsPage() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [hostname, setHostname] = useState('');
  const [pathPrefix, setPathPrefix] = useState('');

  const {
    data: domains,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['domains', workspaceId],
    queryFn: () => getDomains(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (input: { hostname: string; pathPrefix: string | null }) =>
      createDomain(workspaceId!, input.hostname, input.pathPrefix),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['domains', workspaceId],
      });
      setHostname('');
      setPathPrefix('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDomain(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['domains', workspaceId],
      });
    },
  });

  return (
    <div>
      <p>
        <Link to="..">Back to list of reports</Link>
      </p>
      <h2>Allowlisted domains</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmedHostname = hostname.trim();
          if (trimmedHostname) {
            createMutation.mutate({
              hostname: trimmedHostname,
              pathPrefix: pathPrefix.trim() || null,
            });
          }
        }}
      >
        <input
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          placeholder="Hostname (ex. CollegeName.edu)"
          disabled={createMutation.isPending}
        />
        <input
          value={pathPrefix}
          onChange={(event) => setPathPrefix(event.target.value)}
          placeholder="Path prefix (optional, ex. /courses/101)"
          disabled={createMutation.isPending}
        />
        <button type="submit" disabled={createMutation.isPending}>
          Add domain
        </button>
      </form>
      {/* This mutation's error message comes straight from the backend's response body (see
          api/domains.ts) instead of generic 400 since the duplicate hostname case needs to
          say why it failed, since "request failed" error wouldn't explain that this
          exact hostname+prefix is already registered */}
      {createMutation.isError && <p>{createMutation.error.message}</p>}

      {isLoading && <p>Loading domains...</p>}
      {error && <p>Failed to load domains: {error.message}</p>}
      {domains && (
        <ul>
          {domains.map((domain) => (
            <li key={domain.id}>
              {domain.hostname}
              {domain.pathPrefix ? domain.pathPrefix : ' (no path prefix)'}{' '}
              <button
                onClick={() => deleteMutation.mutate(domain.id)}
                disabled={deleteMutation.isPending}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DomainsPage;
