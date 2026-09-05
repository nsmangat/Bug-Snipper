import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createDomain, deleteDomain, getDomains } from '../api/domains';
import Button from './ui/Button';
import { inputClassName } from './ui/inputStyles';

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
    onSuccess: (domain) => {
      void queryClient.invalidateQueries({
        queryKey: ['domains', workspaceId],
      });
      setHostname('');
      setPathPrefix('');
      toast.success(`Added domain "${domain.hostname}"`);
    },
  });

  const deleteMutation = useMutation({
    // Before used deleteDomain(id) which resolved to void, but need delete details for toast,
    // so the mutate() call passes the hostname with the id so that info can be used throughout the mutation,
    // including onSuccess's second argument
    mutationFn: (domain: { id: string; hostname: string }) =>
      deleteDomain(domain.id),
    // _data is deleteDomain(domain.id)'s return, not used but need to specify since js parameters
    // are positional i.e. accessing 2nd and beyond variables means _data needs to be specified
    // Using _ to flag to ESlinter that this variable is purposefully not being used
    onSuccess: (_data, domain) => {
      void queryClient.invalidateQueries({
        queryKey: ['domains', workspaceId],
      });
      toast.success(`Removed domain "${domain.hostname}"`);
    },
  });

  return (
    <div>
      <p className="mb-4">
        <Link to=".." className="text-sm text-blue-400 hover:text-blue-300">
          Back to list of reports
        </Link>
      </p>
      <h2 className="mb-4 text-xl font-semibold text-white">
        Allowlisted domains
      </h2>

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
        className="flex gap-2"
      >
        <input
          className={inputClassName}
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          placeholder="Hostname (ex. CollegeName.edu)"
          disabled={createMutation.isPending}
        />
        <input
          className={inputClassName}
          value={pathPrefix}
          onChange={(event) => setPathPrefix(event.target.value)}
          placeholder="Path prefix (optional, ex. /courses/101)"
          disabled={createMutation.isPending}
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Add domain
        </Button>
      </form>
      {/* This mutation's error message comes straight from the backend's response body (see
          api/domains.ts) instead of generic 400 since the duplicate hostname case needs to
          say why it failed, since "request failed" error wouldn't explain that this
          exact hostname+prefix is already registered */}
      {createMutation.isError && (
        <p className="mt-2 text-sm text-red-400">
          {createMutation.error.message}
        </p>
      )}

      {isLoading && (
        <p className="mt-4 text-sm text-gray-400">Loading domains...</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-400">
          Failed to load domains: {error.message}
        </p>
      )}
      {domains && (
        <ul className="mt-4 divide-y divide-gray-700 rounded-md border border-gray-700">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="flex items-center justify-between px-4 py-3 text-sm text-gray-100"
            >
              <span>
                {domain.hostname}
                <span className="text-gray-500">
                  {domain.pathPrefix ? domain.pathPrefix : ' (no path prefix)'}
                </span>
              </span>
              <Button
                variant="danger"
                onClick={() =>
                  deleteMutation.mutate({
                    id: domain.id,
                    hostname: domain.hostname,
                  })
                }
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DomainsPage;
