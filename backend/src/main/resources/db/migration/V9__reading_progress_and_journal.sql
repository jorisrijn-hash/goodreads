-- Checkpoint E: reading progress and the private journal.
--
-- The tables were prepared in V1 and have never held a row: progress_update and
-- reading_event have no Java code yet, and library_item.progress_percent was never
-- written. So this tightens their contracts to what the product actually promises
-- rather than migrating data. Verified against production before writing: 0 rows in
-- library_item, progress_update and reading_event, and no non-null progress columns.
--
-- No backfill. Journal history begins when this ships; reconstructing SAVED/STARTED/
-- FINISHED from library_item's timestamps would infer event semantics those columns
-- cannot prove.

-- ------------------------------------------------------------------- events --
-- STATUS_CHANGED covers the moves that are neither starting, finishing, setting aside,
-- resuming nor restarting (for example putting a book back on the Want to Read list).
--
-- REMOVED goes: reading_event rows cascade with their library_item, so an event saying
-- "removed" could never outlive the removal it describes.
ALTER TABLE reading_event DROP CONSTRAINT reading_event_type_valid;
ALTER TABLE reading_event
    ADD CONSTRAINT reading_event_type_valid CHECK (event_type IN
        ('SAVED','STARTED','FINISHED','ABANDONED','RESUMED','RESTARTED','STATUS_CHANGED'));

-- Every event lands the item in a status; only a first save has no previous one. The
-- journal reads its wording from the event type together with these two columns, so
-- they have to be trustworthy.
ALTER TABLE reading_event ALTER COLUMN to_status SET NOT NULL;
ALTER TABLE reading_event
    ADD CONSTRAINT reading_event_to_status_valid
        CHECK (to_status IN ('WANT_TO_READ','CURRENTLY_READING','READ','DNF'));
ALTER TABLE reading_event
    ADD CONSTRAINT reading_event_from_status_valid
        CHECK (from_status IS NULL OR from_status IN ('WANT_TO_READ','CURRENTLY_READING','READ','DNF'));

-- ----------------------------------------------------------------- progress --
-- Percentages are whole numbers throughout the product: with a page count the server
-- derives them from the page, and without one the reader enters 0-100. numeric(5,2)
-- promised a precision nothing produces.
ALTER TABLE progress_update ALTER COLUMN percent TYPE smallint USING percent::smallint;
ALTER TABLE library_item   ALTER COLUMN progress_percent TYPE smallint USING progress_percent::smallint;

-- The note limit is the product's limit (1000), the same number the field, the request
-- validation and the service use. library_item.save_note is a different field and keeps
-- its own 2000.
ALTER TABLE progress_update DROP CONSTRAINT progress_update_note_len;
ALTER TABLE progress_update
    ADD CONSTRAINT progress_update_note_len CHECK (note IS NULL OR char_length(note) <= 1000);

-- When the current position was last recorded. Lets Book Detail say "Updated today" and
-- the Home feature show progress without reading the history.
ALTER TABLE library_item ADD COLUMN progress_updated_at timestamptz;

-- Unchanged on purpose: page >= 0 and percent 0-100 on both tables, "a progress update
-- must carry a page or a percent", the append-only history, its per-item indexes, the
-- cascades, and UNIQUE (user_id, book_id). A page can never be checked against the
-- book's length in the database (it is in another table), so the service enforces that.
