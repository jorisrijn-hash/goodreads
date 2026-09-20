-- Phase 1 core schema: identity, catalog, library, reading.
-- Editions are deliberately absent: the data spike measured 0/35 page-count
-- recovery from editions and ~100x row fan-out, so one Open Library canonical
-- *work* is stored as one book row with its primary-edition fields denormalised.

-- ---------------------------------------------------------------- identity --
CREATE TABLE app_user (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    display_name  text        NOT NULL,
    is_demo       boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_user_email_key UNIQUE (email),
    CONSTRAINT app_user_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT app_user_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 80)
);

-- ----------------------------------------------------------------- catalog --
CREATE TABLE author (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_key      text NOT NULL,              -- Open Library /authors/OL...A
    name            text NOT NULL,
    slug            text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT author_source_key_key UNIQUE (source_key),
    CONSTRAINT author_slug_key       UNIQUE (slug)
);

CREATE TABLE genre (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug    text NOT NULL,
    name    text NOT NULL,
    CONSTRAINT genre_slug_key UNIQUE (slug)
);

CREATE TABLE book (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_key      text NOT NULL,              -- Open Library /works/OL...W
    slug            text NOT NULL,
    title           text NOT NULL,
    description     text,
    published_year  int,
    -- Nullable by design. Ingest requires it (catalogue quality gate), but the
    -- domain must still support percentage-only progress for any book lacking it.
    page_count      int,
    language        text,
    isbn13          text,
    cover_source_id bigint,                     -- Open Library cover_i
    cover_key       text,                       -- path in our own object storage
    raw_subjects    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- re-map genres without re-ingest
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT book_source_key_key UNIQUE (source_key),
    CONSTRAINT book_slug_key       UNIQUE (slug),
    CONSTRAINT book_page_count_sane   CHECK (page_count IS NULL OR page_count BETWEEN 40 AND 2000),
    CONSTRAINT book_published_year_sane CHECK (published_year IS NULL OR published_year BETWEEN 1000 AND 2100)
);

CREATE TABLE book_author (
    book_id   bigint NOT NULL REFERENCES book(id)   ON DELETE CASCADE,
    author_id bigint NOT NULL REFERENCES author(id) ON DELETE CASCADE,
    position  int    NOT NULL DEFAULT 0,
    PRIMARY KEY (book_id, author_id)
);
CREATE INDEX book_author_author_idx ON book_author (author_id);

CREATE TABLE book_genre (
    book_id  bigint NOT NULL REFERENCES book(id)  ON DELETE CASCADE,
    genre_id bigint NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);
CREATE INDEX book_genre_genre_idx ON book_genre (genre_id);

-- ----------------------------------------------------------------- library --
-- One row per (user, book). Status is a STATE on this row, never a shelf.
-- Rating/review columns are intentionally absent: not in Phase 1.
CREATE TABLE library_item (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    book_id          bigint NOT NULL REFERENCES book(id)     ON DELETE CASCADE,
    status           text   NOT NULL,
    current_page     int,
    progress_percent numeric(5,2),
    started_at       timestamptz,
    finished_at      timestamptz,
    save_reason      text,
    save_note        text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT library_item_user_book_key UNIQUE (user_id, book_id),
    CONSTRAINT library_item_status_valid CHECK (status IN ('WANT','READING','READ','DNF')),
    CONSTRAINT library_item_save_reason_valid CHECK (save_reason IS NULL OR save_reason IN
        ('RECOMMENDED','SAW_ONLINE','SCHOOL_OR_WORK','AUTHOR_INTEREST','OTHER')),
    CONSTRAINT library_item_current_page_sane CHECK (current_page IS NULL OR current_page >= 0),
    CONSTRAINT library_item_percent_sane CHECK (progress_percent IS NULL OR progress_percent BETWEEN 0 AND 100),
    CONSTRAINT library_item_note_len CHECK (save_note IS NULL OR char_length(save_note) <= 2000)
);
CREATE INDEX library_item_user_status_idx   ON library_item (user_id, status);
CREATE INDEX library_item_user_updated_idx  ON library_item (user_id, updated_at DESC);
CREATE INDEX library_item_user_finished_idx ON library_item (user_id, finished_at DESC)
    WHERE finished_at IS NOT NULL;
CREATE INDEX library_item_book_idx          ON library_item (book_id);

-- ----------------------------------------------------------------- reading --
-- Append-only. Never updated, never deleted while the library item lives.
-- This table is the substrate for the Reading Journal.
CREATE TABLE progress_update (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    library_item_id bigint NOT NULL REFERENCES library_item(id) ON DELETE CASCADE,
    page            int,
    percent         numeric(5,2),
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT progress_update_page_sane    CHECK (page IS NULL OR page >= 0),
    CONSTRAINT progress_update_percent_sane CHECK (percent IS NULL OR percent BETWEEN 0 AND 100),
    CONSTRAINT progress_update_has_a_value  CHECK (page IS NOT NULL OR percent IS NOT NULL),
    CONSTRAINT progress_update_note_len     CHECK (note IS NULL OR char_length(note) <= 2000)
);
CREATE INDEX progress_update_item_created_idx ON progress_update (library_item_id, created_at DESC);

-- Status transitions are recorded so the Journal can render "Started reading",
-- "Finished reading", "Set aside" without inferring them from mutable columns.
CREATE TABLE reading_event (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    library_item_id bigint NOT NULL REFERENCES library_item(id) ON DELETE CASCADE,
    event_type      text   NOT NULL,
    from_status     text,
    to_status       text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reading_event_type_valid CHECK (event_type IN
        ('SAVED','STARTED','FINISHED','ABANDONED','RESUMED','RESTARTED','REMOVED'))
);
CREATE INDEX reading_event_item_created_idx ON reading_event (library_item_id, created_at DESC);
