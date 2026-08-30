# eLogix HRMS — rebuild (branch `dev`)

This branch is the rebuild. `main` is the old prototype and stays frozen as the UX and
feature spec. The full reasoning, stack table and phase plan live in the
**eLogix Rebuild Order** artifact:
https://claude.ai/code/artifact/c37cbcce-8956-455e-9596-72b07a116ef8

The prototype's 1030 files are preserved under `legacy/` for reference. Read them; port
deliberately; trust none of it untested. Nothing under `legacy/` is built, linted, tested
or deployed — it is documentation that happens to be executable.

---

## The two rules everything else serves

1. **SQLAlchemy models are the only source of schema truth.** All DDL through Alembic
   autogenerate. No hand-written `.sql`, ever. One id type: UUID.
   *Enforced by:* `apps/api/src/elogix_api/db/registry.py` plus `tests/test_registry.py`,
   which fails if a `modules/*/models.py` is not registered.
2. **The frontend API client is generated from the OpenAPI spec.** Nothing in
   `packages/api-client/` is hand-written.
   *Enforced by:* the `contract` job in CI — it regenerates and fails on any diff.

The prototype died of exactly two things: type drift (202 foreign keys Postgres rejected)
and contract drift (35 of 46 frontend calls hit routes that did not exist). Those two
rules are the whole point. Everything else in the stack is negotiable.

---

## Run it

```bash
npm install                # workspace root — installs web + api-client
cd apps/api && uv sync     # python deps
cp .env.example .env       # then set SECRET_KEY to 32+ chars

npm run db:up              # postgres 18 in docker, :5432
npm run api                # FastAPI on :5000, --reload
npm run web                # Vite on :5173, proxies /api → :5000
```

Checks: `npm run check` (ruff + ty + pytest + web build), or `check:api` / `check:web`.
After changing any route or schema: **`npm run generate`** and commit the result —
otherwise CI fails on drift.

Seed development data (idempotent) — creates tenant `acme` and logs in as
`admin@acme.com.np` / `devpassword123`:

```bash
cd apps/api && uv run python -m elogix_api.seed
```

Test database is separate (`elogix_test`) and created once:

```bash
docker exec elogix_dev_db psql -U elogix -d elogix -c "CREATE DATABASE elogix_test;"
```

The suite drops and rebuilds `public` by running the migrations from zero, so it proves
the migrations work rather than trusting `metadata.create_all`.

---

## Gotchas

- **Use `localhost`, not `127.0.0.1`, for the Vite dev server.** Vite 8 binds IPv6
  localhost only; `curl 127.0.0.1:5173` returns nothing at all. The API on :5000 is fine
  on either.
- **Postgres 18 images mount at `/var/lib/postgresql`, not `.../data`.** The old
  convention crash-loops on startup with a long message about `pg_ctlcluster`.
- **`npm audit` needs the `js-yaml` override** in the root `package.json`. Every
  `@hey-api/openapi-ts` release currently pulls a js-yaml with an open DoS advisory;
  pinning js-yaml to `^5.4.1` clears it. Don't drop the override to "simplify".
- **Routing is TanStack Router, file-based.** A route is a file under `src/routes/`
  exporting `Route = createFileRoute('/path')({...})`. Put filter and pagination state in
  typed search params (`validateSearch` with Zod), not component state — the screens are
  filtered tables and their state belongs in the URL. Links to routes that do not exist
  are compile errors.
- **Every route needs a `tags=[...]`.** Operation ids are generated as `{tag}-{name}`
  (`main.py:_operation_id`), which is what makes the client read `metaHealth` instead of
  `healthApiHealthGet`. An untagged route lands under `default`.
- **`.env` lives at the repo root**, and `settings.py` resolves it by absolute path, so
  the API can be started from any directory.
- **Don't use `.test` email addresses.** `email-validator` rejects reserved TLDs
  (`.test`, `.invalid`, `.localhost`), so a fixture using one fails with a 422 that looks
  like an auth bug. Fixtures and seed data use `*.com.np`.
- **The `@/` alias is declared twice** — `resolve.alias` in `vite.config.ts` and `paths`
  in `tsconfig.app.json`. Both must be edited together, or the build passes and the
  typecheck fails (or worse, the reverse). No `baseUrl`: TS 6 deprecates it.
- **Alembic autogenerate does not drop enum types in `downgrade`.** Add an explicit
  `sa.Enum(name=...).drop(op.get_bind(), checkfirst=True)` whenever a revision creates
  one, or a down-then-up cycle fails with "type already exists".
- **`migrations/versions/` is excluded from ruff.** It is machine output; don't reformat
  it by hand.
- **Never `pkill -f <name>`** — the pattern matches the issuing shell's own command line.
  Use `pkill -x`.

---

## Layout

```
apps/api/                       FastAPI + SQLAlchemy 2.0 + Alembic, sync psycopg3
  src/elogix_api/
    main.py                     app factory; routers mounted explicitly, no try/except
    settings.py                 pydantic-settings; bad config crashes at boot
    openapi.py                  dumps the spec without starting a server
    db/base.py                  DeclarativeBase + naming convention
    db/registry.py              ← the only file Alembic reads for metadata
    db/types.py                 uuid_pk(), company_fk(), TimestampMixin
    db/session.py               engine + get_db dependency
    core/                       auth, security, tenancy, entitlements
    modules/<domain>/           models.py schemas.py router.py service.py
    nepal/                      BS dates, Labour Act, tax slabs — pure functions
  migrations/versions/          Alembic revisions
  tests/

apps/web/                       Vite + React 19 + TS + Tailwind v4
  src/routes/                   TanStack Router file routes; __root.tsx holds context
  src/routeTree.gen.ts          GENERATED by the vite plugin, but committed — `tsc -b`
                                runs before `vite build`, so a fresh clone needs it
  src/features/<domain>/        mirrors apps/api modules one-for-one

packages/api-client/            GENERATED. Never edit. `npm run generate` owns it.
openapi.json                    GENERATED and committed. CI fails if stale.
legacy/                         the frozen prototype, for reference only
```

`modules/` and `features/` are named after the seven phases, so a phase boundary is a
folder boundary: phase 03 is `modules/employee/` and nothing else.

---

## Build order

00 walking skeleton · 01 identity, tenancy, entitlements · 02 org structure ·
03 employee master · 04 attendance and roster · 05 leave · 06 payroll, tax, SSF ·
07 self-service, documents, reports

This is a dependency chain, not a priority ranking — each phase produces the tables the
next one needs, so nothing gets built twice against mocked inputs. Payroll is last in the
core *deliberately*: it consumes phases 03–05, and its tests get written before its code.

**Current state: phase 00 is done.** A fresh clone builds the database from zero
migrations, logs in, and reads employees — proven by 17 tests that run the migrations
from zero against a real Postgres. `modules/identity` and `modules/employee` exist and
are deliberately thin; phases 01 and 03 own their real field sets.

**Phase 01 is next**, and it carries the two things phase 00 knowingly left as
placeholders:
- Tokens are stored in `localStorage` (`apps/web/src/lib/auth.ts`). Phase 01 moves the
  refresh token to an httpOnly cookie and keeps the access token in memory.
- Tenant isolation is enforced by application-level query filters only. Phase 01 adds
  row-level security underneath, driven by `set_config` inside the request transaction.
  The query filters stay — belt and braces.
- There is no refresh endpoint yet, so sessions simply expire after
  `ACCESS_TOKEN_TTL_MINUTES`.

---

## Decisions still open

- **Do all 524 prototype screens need to exist?** Many are variations on a filtered table.
  A product call, worth making before phase 07.
- **Who signs off on the tax and labour rules?** Needs a named human before payroll ships.
  The prototype's engine triple-deducts SSF; the slab table could not be verified from
  code alone.

---

## Conventions

- Module routers are mounted explicitly in `main.py`, one line each. No dynamic
  discovery, no `try/except ImportError` — the prototype swallowed import errors and
  turned broken routes into silent 404s.
- `def` endpoints by default; `async def` only for genuinely IO-bound work (the AI
  proxy). Sync SQLAlchemy is deliberate — async forbids lazy loading and fails with
  `MissingGreenlet` at runtime.
- Nepali dates: the backend is authoritative for every period boundary and cutoff. The
  frontend converts for display only, never for anything touching money.
