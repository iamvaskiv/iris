-- Prototype storage: JSON documents grouped in collections (see src/lib/server/store.ts).
CREATE TABLE docs (
	collection TEXT NOT NULL,
	id TEXT NOT NULL,
	value TEXT NOT NULL,
	-- Bumped on every write, so concurrent updates can detect each other.
	version INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (collection, id)
);
