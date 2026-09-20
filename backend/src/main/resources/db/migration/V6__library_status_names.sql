-- Reading status values spelled out.
--
-- V1 used the compact WANT/READING. The domain language everywhere else -- the product
-- brief, the UI, the API -- says "want to read" and "currently reading", and a reader
-- looking at an API response should not have to translate. library_item is still empty,
-- so this is a rename with nothing to migrate.
ALTER TABLE library_item DROP CONSTRAINT library_item_status_valid;

UPDATE library_item SET status = 'WANT_TO_READ'      WHERE status = 'WANT';
UPDATE library_item SET status = 'CURRENTLY_READING' WHERE status = 'READING';

ALTER TABLE library_item
    ADD CONSTRAINT library_item_status_valid
        CHECK (status IN ('WANT_TO_READ', 'CURRENTLY_READING', 'READ', 'DNF'));
