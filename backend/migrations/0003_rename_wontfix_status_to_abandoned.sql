-- Renames the 'wontfix' report status value to 'abandoned' for clarity

alter table reports drop constraint reports_status_check;

update reports set status = 'abandoned' where status = 'wontfix';

alter table reports add constraint reports_status_check
  check (status in ('open', 'in_progress', 'resolved', 'abandoned'));
