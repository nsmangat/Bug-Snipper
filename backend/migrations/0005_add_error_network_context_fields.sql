-- Adding additional info for the bug report: page title, referrer (i.e. last page visited before
-- page of the ss), recent JS errors/unhandled rejections, and a summary of recent network requests
-- All have default values, so if records were added before this update, shouldn't affect any of them

alter table reports
  add column document_title text not null default '',
  add column referrer text not null default '',
  add column errors jsonb not null default '[]'::jsonb,
  add column network_requests jsonb not null default '[]'::jsonb;
