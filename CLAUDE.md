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

### Seeing the UI

There is no Claude browser extension here, but a real headed Chromium runs against a
virtual display, which is enough to verify screens and to catch console errors:

```bash
npx playwright install --with-deps chromium   # once
Xvfb :99 -screen 0 1600x1000x24 &             # a display to render into
cd apps/web && DISPLAY=:99 node scripts/screenshot.mjs
```

The script logs in, captures every screen to `/tmp/elogix-shots/`, and exits non-zero on
any console error, page error or 4xx/5xx response — so it doubles as a smoke test.
`headless: false` is deliberate: it renders through the same path a user's browser does.

To *watch* it live rather than screenshot it, add a VNC bridge and open port 6080:

```bash
sudo apt-get install -y x11vnc novnc websockify
x11vnc -display :99 -forever -shared -nopw -rfbport 5901 &
websockify --web=/usr/share/novnc 6080 localhost:5901 &
```

A `401` on `/api/v1/auth/refresh` during a cold load is expected, not a bug: the app
asks for a new access token on startup and there is no refresh cookie until you sign in.

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
  one, or a down-then-up cycle fails with "type already exists". Related: `add_column`
  with an enum does *not* create the type the way `create_table` does — call
  `.create(op.get_bind(), checkfirst=True)` first.
- **Tenant isolation is application-level only.** There is no row-level security; the
  `.where(Model.company_id == current_user.company_id)` clause in each query is the whole
  boundary, so one forgotten filter is a silent cross-tenant leak. Every tenant-scoped
  read must get a case in `TENANT_SCOPED_READS` in `tests/test_tenant_isolation.py` —
  that parametrised sweep is the only thing standing behind those clauses.
- **A table with two composite uniques on the same leading column needs an explicit
  constraint name.** The `uq_` naming convention keys off `column_0_name` only, so
  `UniqueConstraint("company_id", "code")` and `UniqueConstraint("company_id", "rank")`
  both resolve to `uq_<table>_company_id` and the second fails at CREATE TABLE. See
  `GradeLevel.__table_args__`.
- **UI work starts from `src/components/ui.tsx`**, not from inline styles. The prototype
  had 19 shared components imported by zero of 545 pages and 23,567 inline styles; these
  primitives exist so that using them is easier than not.
- **Enum columns use `enum_column()` from `modules/employee/enums.py`**, not
  `String(...)`. A plain string column loads back as `str`, so
  `employee.status is EmployeeStatus.EXITED` is silently always false — that bug let an
  already-exited employee be exited again. `native_enum=False` also avoids leaving a
  Postgres type behind for a downgrade to forget.
- **An employee's placement is dated, never overwritten.** Department, designation,
  grade and position live in `employee_assignments` with `effective_from`/`effective_to`,
  and the open row (`effective_to IS NULL`) is the current one. Payroll in phase 06 needs
  to know where someone sat *in the month being paid*. Never add these as columns on
  `employees`, and never add salary there either.
- **A migration touching a populated table needs three steps**: add the column nullable,
  backfill with `op.execute`, then `alter_column(..., nullable=False)`. Autogenerate
  emits a NOT NULL column with no default, which fails outright. The same applies in
  reverse in `downgrade` — see the phase 03 revision for both directions.
- **Statutory rules live in `nepal/`, not in the modules that use them.** They are
  legal constants, they need reviewing by a person against the Act, and every one of
  them is a *default* that a per-company policy row can override — `nepal/labour.py`
  carries an explicit unverified warning saying so.
- **Attendance is derived, never edited.** `attendance_punches` is the append-only truth;
  `attendance_days` is computed from it and safe to rebuild. A correction adds a
  `regularisation`-sourced punch and reprocesses — it never edits the day record, so the
  original device reading survives and a dispute stays settleable.
- **Deduct the unpunched break.** Almost nobody punches out for lunch, so a 09:00–18:00
  pair against an 8-hour shift looks like an hour of overtime. Counting it produced 69
  hours of phantom overtime in one seeded month, which payroll would pay at 1.5x. The
  deduction never takes worked time below the shift's scheduled hours, so a short day is
  not docked for a lunch nobody took.
- **A leave balance is a ledger, never a counter.** `leave_ledger_entries` holds signed
  rows and the balance is their `SUM`. Nothing increments a stored number, which is what
  makes approval atomic — a read-modify-write has a window two approvers can race
  through, an insert does not. It also means every balance can be explained row by row.
- **Money and entitlement are `Decimal`, never `float`.** Leave days and, from phase 06,
  pay are legal amounts that people argue about; `0.1 + 0.2` must equal `0.3`.
- **Leave and attendance are genuinely coupled**, in both directions: leave counts in
  working days using the attendance calendar, home leave accrues from days actually
  worked in the register, and approved leave marks days as `leave` rather than `absent`.
  `attendance/service.py` imports from `leave/service.py` inside the function to avoid an
  import cycle — that local import is deliberate, not an oversight.
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
    core/                       auth, security, deps, entitlements
    modules/<domain>/           models.py schemas.py router.py service.py
    nepal/                      BS dates, Labour Act, tax slabs — pure functions
  migrations/versions/          Alembic revisions
  tests/

apps/web/                       Vite + React 19 + TS + Tailwind v4
  src/index.css                 @theme design tokens carried over from the prototype
  src/components/ui.tsx         Card, Pill, Table, Button, Field — use these, always
  src/components/AppShell.tsx   sidebar + topbar + confidentiality strip
  src/routes/_app.tsx           pathless layout; the auth guard lives here, once
  src/routes/_app/**            every authenticated page
  src/routes/                   TanStack Router file routes; __root.tsx holds context
  src/routeTree.gen.ts          GENERATED by the vite plugin, but committed — `tsc -b`
                                runs before `vite build`, so a fresh clone needs it

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

**Current state: phases 00–05 are done**, proven by 154 tests against a real Postgres
with the schema built by running the migrations from zero. Module access is denied
server-side, no endpoint returns another tenant's rows, a tenant can be provisioned into
a complete org chart, an employee can be hired through to offboarded with history
preserved, a month of attendance can be captured, corrected and exported as payroll
input, and leave balances accrue across a full year with approvals adjusting them
atomically.

Phase 01 originally shipped row-level security as a second isolation layer; it was
removed by decision on 2026-08-30, so tenant isolation is the query filters alone. If it
is ever reinstated, the thing to know is that Postgres exempts superusers from policies
even on a `FORCE ROW LEVEL SECURITY` table — the app would need a `NOSUPERUSER`,
`NOBYPASSRLS` role, which is why the removed version had two database URLs.

`modules/employee` is deliberately thin — phase 03 owns its real field set.

**Phase 06 (payroll, tax and SSF) is next, and it is the highest-risk phase.** It
consumes the attendance export and the leave ledger, and it is the reason a Nepal-specific
HRMS exists at all. Two rules from the plan apply with full force: **write the tests
before the implementation**, and the FY 2083-84 slab table needs verifying against the
Finance Act by a named person before anyone is paid from it. The prototype's engine
triple-deducted SSF and reported NPR 37,500 net on a 130,000 gross — port the intent,
rewrite the maths.

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
- **Gate a module on the router, not the route**: `APIRouter(..., dependencies=[
  Depends(require_module(ModuleCode.X))])`. Every endpoint added later is then covered by
  construction rather than by the author remembering.
- Every query in a tenant-scoped module carries `.where(Model.company_id ==
  current_user.company_id)`. Nothing below the application enforces this, so treat it as
  non-optional — it was the prototype's only layer too, and it was applied inconsistently.
- The frontend may read `/api/v1/auth/entitlements` to decide what to **show**. It is
  never what decides what is **allowed** — that is `require_module`, server-side.
- `def` endpoints by default; `async def` only for genuinely IO-bound work (the AI
  proxy). Sync SQLAlchemy is deliberate — async forbids lazy loading and fails with
  `MissingGreenlet` at runtime.
- Nepali dates: the backend is authoritative for every period boundary and cutoff. The
  frontend converts for display only, never for anything touching money.
