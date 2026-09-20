-- Cover keys were stored as "covers/<shard>/<id>", but the storage root is already the
-- covers directory, so files landed at covers/covers/<shard>/<id> and nothing resolved.
-- The key now holds only "<shard>/<id>"; the serving path supplies the rest.
UPDATE book
   SET cover_key = regexp_replace(cover_key, '^covers/', '')
 WHERE cover_key LIKE 'covers/%';
