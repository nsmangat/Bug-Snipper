-- Bug fix: unique(hostname, path_prefix) from 0001 doesn't prevent duplicate
-- bare hostname registrations, because NULL !== NULL for uniqueness
-- this means every row where path_prefix IS null is treated as distinct from
-- every other one with the same hostname
--
-- A partial unique index (i.e. using WHERE condition) fixes this: 
-- it lets null participate in the uniqueness check correctly for the case where path_prefix IS NULL where
-- the table level UNIQUE constraint can't
-- The existing unique(hostname, path_prefix) constraint from 0001 is untouched and continues to reject duplicate hostname+prefix 
-- combos when path_prefix is a real, non-null value.

create unique index allowlisted_domains_hostname_null_prefix_unique
  on allowlisted_domains (hostname)
  where path_prefix is null;
