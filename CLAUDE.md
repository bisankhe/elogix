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
   *Enforced by:* `npm run generate` followed by a clean `git diff`. The `contract`
   job that did this automatically lives in `.github/workflows/ci.yml.bak` and is
   parked, so until it is switched back on **this rule is enforced by you, locally**.

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

**GitHub Actions is parked**, by decision on 2026-08-30 — the workflow is kept as
`.github/workflows/ci.yml.bak` so it can be restored by renaming it back. Nothing runs
on push, so `npm run check` before committing is the only gate there is.

After changing any route or schema: **`npm run generate`** and commit the result. With
CI parked, nothing catches the drift for you.

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

### Comparing against the prototype

The prototype runs. It is a Vite app on mock data, so it needs no backend, and having it
open beside the rebuild is the only reliable way to match it:

```bash
cd legacy && npm install && npx vite --port 5174
# sign in with admin@demo.com / Admin@2083
```

`components/AppShell.tsx` was built against it directly — the emoji-headed collapsible
module tree, the marker dot that turns blue when active, the role pill, the Ctrl-K search
box, the EN|NPR chip, the breadcrumb strip with Nepal Standard Time, the AES-256 chip in
the foot. Match new screens the same way rather than guessing.

### Seeing the UI

A real headed Chromium runs against a virtual display, which is enough to verify
screens and catch console errors. Claude for Chrome is also installed as of
2026-08-30, so the browser can be driven interactively as well — but the two scripts
below stay the verification of record, because they fail the build and a conversation
does not.

`bash start-gui.sh` brings up the whole desktop — Xvfb, fluxbox, x11vnc and noVNC — and
is safe to re-run; anything already up is left alone. Then open port **6080** from the
Ports tab and add `/vnc.html`, and you can drive the browser yourself.

Leave 6080 **Private**. Codespaces forwards it to your authenticated session either way,
and x11vnc runs with `-nopw`, so Public means anyone with the URL can control the desktop.

```bash
bash start-gui.sh                                   # desktop on :1, noVNC on 6080
cd apps/web && DISPLAY=:1 node scripts/screenshot.mjs   # every screen, with good data
cd apps/web && DISPLAY=:1 node scripts/scenarios.mjs    # empty states, refusals, mobile

# A browser to drive by hand on the desktop, if the extension is not being used:
DISPLAY=:1 ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome \
  --no-sandbox --disable-dev-shm-usage --window-size=1600,1000 \
  --user-data-dir=/tmp/chrome-profile http://localhost:5173 &
```

Both scripts exit non-zero on a console error, page error or unexpected 4xx/5xx, so they
double as smoke tests. `headless: false` is deliberate: it renders through the same path
a user's browser does.

`uv run python -m elogix_api.seed_scenarios` creates a second tenant, `startup`, empty
and on the trial plan — which is what makes every empty state and the entitlement-filtered
nav reachable at all.

**Every UI change should be looked at.** Several real bugs so far were invisible to a
green test suite and obvious in a screenshot: an hour of phantom overtime on every day,
an empty Positions screen, a sidebar that ate a phone viewport, and a leave refusal that
replaced the API's exact reason with a guess.

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
- **A multipart upload passes `body: {file}`, not a hand-built `FormData`.** The
  generated operation already spreads `formDataBodySerializer`, so it assembles the
  multipart and lets the browser set the boundary; passing `FormData` fights the client.
- **Invalidate a generated query with `invalidate()` from `lib/queries.ts`**, never
  with a bare string key. The generated client builds keys as
  `[{_id: 'opName', baseUrl, path}]`, so `invalidateQueries({queryKey: ['opName']})`
  matches nothing and fails *silently* — the write lands, nothing refetches, and the
  screen shows stale data until a reload. Eleven of these had accumulated across five
  screens, the oldest since phase 05, and the one that surfaced it was an onboarding
  button that stayed on "Onboard as employee" after the employee had been created.
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
- **`POST /auth/register-company` is the only unauthenticated write in the system.**
  Four guards stand in for the login it cannot have: the plan is not a request field, so
  a signup can only ever create a trial; slugs are validated against a reserved list;
  requests are rate limited per IP; and the response is identical whether the email was
  already registered, so signup is not an enumeration oracle. The limiter in
  `core/ratelimit.py` is in-process and therefore per-worker — stated there rather than
  pretended away, and the real limit belongs in front of the app.
- **Provisioning creates no placeholder document rows.** The compliance view reads "a
  row exists" as *held*, so seeding the ten statutory documents made a brand-new company
  open on "10 in order, 0 missing" — a checklist that lies on the one day it matters
  most. The view lists all ten from `nepal/company.py` regardless. Found in a screenshot.
- **One company per tenant**, by decision on 2026-08-30. The prototype modelled
  tenant → group companies → companies → branches but defined `companies` twice with
  clashing id types, never created the `tenants` table its `tenant_id` referenced, and
  read that `tenant_id` from a request header — there was no coherent hierarchy to
  inherit. If a customer later needs several registered companies under one group, the
  cheap path is preserved deliberately: `company_id` means *one legal entity*, and the
  caller's active company arrives on the token as a single value, so a group feature
  adds a **switcher**, not a wider filter. The 164 `.where(Model.company_id ==
  user.company_id)` clauses then stay exactly as they are. Letting one request span
  several companies at once is the expensive version, and it is the one to refuse.
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
- **Show the API's error, never a guess.** `lib/errors.ts` has `apiErrorMessage`; the
  server already computes a precise refusal ("Only 7.00 day(s) of Sick Leave available;
  50.00 requested") and rendering "something may be wrong" instead teaches people the app
  does not know why it refused them.
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
    core/                       auth, security, deps, entitlements, storage, csv
    modules/<domain>/           models.py schemas.py router.py service.py
    var/documents/              uploaded files, content-addressed by tenant (gitignored)
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
openapi.json                    GENERATED and committed. Regenerate after any route
                                or schema change; nothing checks it while CI is parked.
legacy/                         the frozen prototype, for reference only
```

`modules/` and `features/` are named after the seven phases, so a phase boundary is a
folder boundary: phase 03 is `modules/employee/` and nothing else.

---

## Build order

00 walking skeleton · 01 identity, tenancy, entitlements · 02 org structure ·
03 employee master · 04 attendance and roster · 05 leave · 06 payroll, tax, SSF ·
07 self-service, documents, reports · 08 exit and final settlement ·
09 hiring and onboarding

This is a dependency chain, not a priority ranking — each phase produces the tables the
next one needs, so nothing gets built twice against mocked inputs. Payroll is last in the
core *deliberately*: it consumes phases 03–05, and its tests get written before its code.

**Current state: phases 00–09 are done**, proven by 387 tests against a real Postgres
with the schema built by running the migrations from zero. Module access is denied
server-side, no endpoint returns another tenant's rows, a tenant can be provisioned into
a complete org chart, an employee can be hired through to offboarded with history
preserved, a month of attendance can be captured, corrected and exported as payroll
input, leave balances accrue across a full year with approvals adjusting them
atomically, that attendance export and those balances turn into payslips whose every
figure is reproducible by hand, a person can sign in and see their own record — and
only their own — and a leaver can be paid what they are owed, itemised, against the
statutory fifteen-day clock. A candidate can be taken from requisition to accepted
offer to a person on the payroll, with the salary they agreed to.

Phase 01 originally shipped row-level security as a second isolation layer; it was
removed by decision on 2026-08-30, so tenant isolation is the query filters alone. If it
is ever reinstated, the thing to know is that Postgres exempts superusers from policies
even on a `FORCE ROW LEVEL SECURITY` table — the app would need a `NOSUPERUSER`,
`NOBYPASSRLS` role, which is why the removed version had two database URLs.

`modules/employee` is deliberately thin — phase 03 owns its real field set.

`modules/settlement` is gated on `ModuleCode.PAYROLL` rather than a module of its own:
a company able to pay salaries but not final dues would be the wrong way round, since
the final payment is the one with a legal deadline.

**Phase 06 shipped with its tax tables unverified, and that is a release blocker, not
a footnote.** The engine is done and every number in it is proven against a hand
calculation, but the slab values themselves came from the prototype and no named person
has checked them against the Finance Act. `tax_scales.is_verified` is false for all four
seeded scales, the payroll screen leads with a warning saying so, and naming a verifier
through `PUT /payroll/tax-scales/{id}` is what flips it. **Nobody may be paid from these
figures until someone signs them off.**

The prototype's engine had five demonstrable defects, each now a named regression test in
`tests/test_payroll_compute.py`: SSF charged to the employee at the employer's 20% rate;
SSF relieved twice, once as a contribution and again as retirement-fund allowance;
incentives annualised on top of an already-annual figure; the 1% social security band
missing entirely; and an FY 2083-84 single table whose bands did not sum to its own
brackets. Port the intent, never the arithmetic.

Two structural rules the engine depends on: the **order of operations** in
`payroll/compute.py` is the fix for the double-relief bug and its comments explain why
each step sits where it does; and **overtime is rated on the full basic, not the prorated
one**, so an absent day is not deducted twice.

**Phase 07 answered the open question about the 524 screens: no.** Self-service is one
screen with five tabs, and reports is one screen with three. The prototype's forty report
pages were mostly the same filtered table with a different `WHERE`; what is here are the
questions that differ in kind — who works here, what leave is owed, what was paid — each
exporting to CSV from the same query that draws the table. Anything that is "the employee
list, filtered" belongs on the employee list, filtered.

Three things from phase 07 that constrain what comes next:

- **Self-service is a second isolation axis, not a screen.** Tenant isolation keeps Acme
  out of Globex; `CurrentEmployeeDep` keeps one Acme employee out of another's payslip.
  No route under `/ess` takes an employee id in a path, query or body, so there is
  nothing to substitute — `tests/test_ess.py` sweeps every one of them to prove it.
- **Uploaded files are hostile until proven otherwise.** `modules/employee/documents.py`
  serves everything as an attachment with `nosniff`, allowlists the content types, and
  never lets a filename reach a path. The key is the content hash.
- **Report exports are escaped against formula injection.** A cell starting `=`, `+`,
  `-` or `@` is executed by Excel when the file opens, and every cell in an HR report is
  free text somebody typed. `core/csv_export.py` guards text and deliberately does not
  guard numbers.

**Phase 08 closed a hole rather than opening a tier.** Phase 03's "done when" —
hired, edited, documented, offboarded, history preserved — was satisfied, but that is
offboarding in the *record* sense. Full-and-final settlement fell between phase 03 and
phase 06 with nobody owning it, and it is a legal obligation with a deadline. Four rules
it established:

- **Gratuity is not owed twice.** The employer's 20% SSF contribution is PF 10% +
  gratuity 8.33% + insurance 1.67%, so for an enrolled employee the gratuity has already
  gone into the fund monthly. It accrues only for someone not contributing.
  `EmployeeSalary.contributes_to_ssf` decides. Unverified, like the slabs.
- **Notice pay changes sign with who ended it.** `ExitInitiator` is required input, not
  an assumption — backwards moves money the wrong way.
- **Settlement tax is the marginal charge**: tax on (year-to-date + settlement) less tax
  on year-to-date, plus any shortfall under-withheld earlier, because this is the last
  payment that can collect it. Over-withholding is *not* refunded out of a settlement.
- **Every line carries a `basis` string.** "Gratuity: 0.00" starts an argument; "nil,
  because it was already paid monthly into SSF" ends one.

**Phase 09 (hiring) departs from the prototype's ATS on three points**, all about who
is allowed to decide something:

- **No AI score.** `ATSApplication.ai_score` was written by a language model and
  `list_applications` ordered by it, so an LLM decided who a recruiter looked at first.
  Applications are ordered by arrival; a test asserts no field named `*score*` exists.
- **Every stage move is a row.** `application_events` is append-only, and a rejection
  without a reason is refused — it is the decision most likely to be challenged later.
- **The candidate's offer link is an unguessable token on an unauthenticated router**,
  never the offer's id. A candidate has no login and no tenant. The token is returned
  once on send and appears in no list, because whoever holds it can answer the offer.

Requisitions draw against `Position.headcount`, which is what that column was for, and
onboarding copies placement from the requisition's position and the offered salary
straight into `employee_salaries` — so nothing between the offer letter and payroll is
retyped.

**Phase 10 is unscoped.** What remains from the artifact's tiers is performance and
goals, training, then the v3 business tier (vendor and outsource management, compliance,
finance) and the optional AI and BI layer. The artifact also flags the public career
portal as the one genuine case for a separate SSR app — worth deciding when the ATS
grows a public face, which it has not yet.

---

## Decisions still open

- **Who signs off on the tax and labour rules?** Needs a named human before payroll or
  any settlement ships. The prototype's engine triple-deducts SSF; the slab table could
  not be verified from code alone. Phase 08 added three more to the same list, all in
  `nepal/settlement.py`: the gratuity rule, the 15-day deadline, and whether a leaver's
  whole encashable balance is paid out or only the part above the carry-forward ceiling.

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
