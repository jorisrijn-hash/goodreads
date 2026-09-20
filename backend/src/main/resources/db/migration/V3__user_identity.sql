-- Checkpoint C. The Checkpoint A table carried email, password_hash and display_name
-- but no username, which signup, the /api/v1/me projection and public profile URLs all
-- need. app_user is empty, so NOT NULL is added directly rather than backfilled.
ALTER TABLE app_user ADD COLUMN username text;

-- Case-insensitively unique: "Joris" and "joris" must not be two accounts. Stored in
-- the case the reader chose, compared lowercased.
CREATE UNIQUE INDEX app_user_username_lower_key ON app_user (lower(username));

ALTER TABLE app_user
    ALTER COLUMN username SET NOT NULL,
    ADD CONSTRAINT app_user_username_format
        CHECK (username ~ '^[A-Za-z0-9_]{3,30}$');

-- Present on the identity projection from the start so the frontend never has to
-- branch on its absence. Populated in a later checkpoint.
ALTER TABLE app_user ADD COLUMN avatar_url text;

-- Exactly one demo account may exist. A partial unique index expresses that directly
-- rather than relying on application code to enforce it.
CREATE UNIQUE INDEX app_user_single_demo ON app_user (is_demo) WHERE is_demo;
