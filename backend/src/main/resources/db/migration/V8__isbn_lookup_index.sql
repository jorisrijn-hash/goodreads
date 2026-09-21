-- Search now answers an ISBN with an exact lookup. Without an index that is a
-- sequential scan of the whole catalogue (measured at 4 ms on 9,021 rows in
-- production) — cheap today, linear tomorrow. Partial, because a fifth of the
-- catalogue has no ISBN and those rows can never match.
CREATE INDEX book_isbn13_idx ON book (isbn13) WHERE isbn13 IS NOT NULL;
