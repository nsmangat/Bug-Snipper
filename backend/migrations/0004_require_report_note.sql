-- Makes a report's note required with a min and max char requirement
-- This is to help distinguish between reports when viewed on the dashboard

alter table reports alter column note set not null;

alter table reports add constraint reports_note_length_check
  check (char_length(note) between 1 and 200);
