# Backend Docs

Backend-specific documentation lives here.

## Structure

- [`db/`](db/) — SQL migration files and current schema snapshot. Migrations are numbered sequentially; apply them in order against a fresh PostgreSQL database. The `OUTDATED/` subfolder contains superseded migrations kept for historical reference.
- [`BACKEND_REVCLEAR_v1.1.0.md`](BACKEND_REVCLEAR_v1.1.0.md) — Full backend API reference.

## Database

To stand up a fresh database, apply migrations in `db/` in numeric order starting from `013_claim_integrity_and_indexes.sql`. The current schema snapshot is in [`db/revclear_schema_current.sql`](db/revclear_schema_current.sql).
