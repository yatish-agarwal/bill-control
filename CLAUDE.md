# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Who I Am Building For
**Company:** Warehousing/logistics company (multi-site operations across India)
**Tool:** Bill Control App — accounts payable workflow, bill collection to payment
**Users:** Intake Resource (logs bills), Site Accountants (verify + Tally), Pallab/SP (batch approval), MD (final approval), Tara/BA (payment release)
**Problem:** Bills arrive from 5+ scattered sources, get lost, verification is inconsistent, no single source of truth between sites

---

## The Non-Negotiable Sequence
1. Read this file completely
2. Read `SCHEMA.md` completely
3. Read `DECISIONS.md` completely
4. Only then write code

If `SCHEMA.md` does not exist — stop and build it first.
If `DECISIONS.md` does not exist — create it as an empty file.

---

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build — must pass before deploying
npm run lint       # ESLint
npx tsc --noEmit   # type-check without building
npx vercel --prod  # deploy to production
```

No test suite yet. `npm run build` must succeed with zero errors before any commit.

---

## Rule 1 — Schema Before Code
- All column names, positions, types, and allowed values are in `SCHEMA.md`
- The authoritative column registry in code is `lib/sheets.ts → COL_MAP` (1-based integers)
- Never hardcode a column letter — always derive via `rowToCol(COL_MAP[field])`
- Never assume a column exists — check `SCHEMA.md` first
- If a column is not in `SCHEMA.md`, it does not get coded
- Run a read against the real Google Sheet before writing any new feature
- ID format: `BILL-NNNN` (zero-padded 4 digits). Defined once, never deviated from.
- Date format: `YYYY-MM-DD` everywhere — sheet storage, forms, API responses. No other format.

## Rule 2 — One Vertical Slice at a Time
A vertical slice = list page + detail page + create/edit + one action, working end to end.
- Complete one slice fully before starting the next
- "Complete" means: tested against real data, written to real sheet, verified by opening the app
- Order: read (list) → read (detail) → write (create) → write (action/status change)
- Do not build all API routes first. Do not build all forms first.

## Rule 3 — Real Data, Not Invented Data
- After every write: open the actual Google Sheet and confirm correct columns, format, value
- Never trust only the API response
- Before building any feature: check what existing data actually looks like
  - What ID formats exist in the sheet right now?
  - What status values exist (including any legacy ones)?
  - Which fields are blank on old records?

## Rule 4 — Write Decisions Down Immediately
Every business decision goes into `DECISIONS.md` the moment it is made.
Format: `[DATE] DECISION: [what] REASON: [why]`
If a decision is not in `DECISIONS.md`, ask the user to confirm before coding.

## Rule 5 — Handle Legacy Data Explicitly
- Before building status logic: list every status value in the real data
- Before building ID logic: list every ID format in the real data
- Before building date logic: check the actual format stored in the sheet
- Code must handle old/missing values gracefully — never assume clean data

## Rule 6 — Pin These Three Things Globally
1. ID format → `BILL-NNNN`, defined in `SCHEMA.md`
2. Date storage format → `YYYY-MM-DD`, defined in `SCHEMA.md`
3. Status vocabulary → exhaustive list per entity in `SCHEMA.md`, no synonyms

## Rule 7 — The Four Tests Before Moving On
After every slice:
1. **Happy path** — all fields filled, normal flow
2. **Empty path** — optional fields blank, record doesn't exist, sheet returns nothing
3. **Legacy path** — old ID formats, missing columns, legacy status values
4. **Duplicate path** — submit the same bill twice, what happens?
Fix any failures before starting the next slice.

## Rule 8 — Git Discipline
- One commit per completed slice (not per file change)
- Commit message: what feature was completed, not what files changed
- Never commit broken code
- If something breaks: `git diff` to find what changed, fix it, commit the fix separately

## Rule 9 — When to Stop and Ask
Stop and ask before:
- Any destructive operation (delete, overwrite, deactivate)
- Any schema change (adding/removing columns in `COL_MAP` or the sheet)
- Any decision that affects more than one part of the app
- Anything where two reasonable approaches exist

## Rule 10 — Definition of Done
A feature is done when:
- [ ] Works against real data, not mock data
- [ ] Legacy data (old formats, missing fields) does not break it
- [ ] Write was verified directly in the Google Sheet
- [ ] Decision/behaviour is documented in `DECISIONS.md`
- [ ] Committed to git with a clear message

---

## Architecture

### Data flow
```
Google Sheet ("Bill Register" tab)
  Row 1 = group labels (INTAKE, VERIFICATION, etc.)
  Row 2 = column headers
  Row 3+ = bill data
    ↕  googleapis JWT auth (service account)
lib/sheets.ts  →  getAllBills · getBillById · appendBill · updateBillFields
    ↕
app/api/bills/route.ts          GET all, POST new
app/api/bills/[id]/route.ts     GET one, PATCH fields
    ↕
Page components (all "use client", fetch on mount)
```

### AI flow
```
Single file upload  →  app/api/parse-invoice/route.ts   →  lib/ai.ts  →  OpenRouter
3 file uploads      →  app/api/three-way-match/route.ts  →  lib/ai.ts  →  OpenRouter
```

### Stage → route mapping
| Stage | URL | Owner |
|---|---|---|
| Dashboard | `/` | Everyone |
| Intake | `/intake` | Intake resource |
| Verification | `/verify/[billId]` | Site Accountant |
| Tally | `/tally/[billId]` | Site Accountant |
| SP Approval | `/sp-approval/[billId]` | Pallab |
| MD Approval | `/md-approval/[billId]` | MD |
| Payment | `/payment/[billId]` | Tara |

Stage transitions are explicit — each form sets `currentStage` on submit. Nothing moves automatically.

### Key files
| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript types and status vocabularies — single source of truth |
| `lib/sheets.ts` | All Google Sheets I/O. `COL_MAP` = column registry. `rowIndex` on Bill = actual sheet row for targeted PATCH |
| `lib/ai.ts` | OpenRouter client — **lazy-init** (created inside functions, not at module level, to avoid build failure when key is absent) |
| `lib/anthropic.ts` | Dead code — do not import from it |
| `SCHEMA.md` | Authoritative column definitions, ID format, date format, status vocabularies |
| `DECISIONS.md` | Log of every business/technical decision made |

---

## Project-Specific Constraints

- **Google Sheets — no atomic writes, no uniqueness guarantees**. `appendBill` generates IDs via `allBills.length + 1` — two simultaneous requests can produce duplicate IDs. Do not change ID generation silently; log it in `DECISIONS.md`.
- **Google Sheets — always use `RAW` valueInputOption** for fields that contain numbers-as-strings (bill amounts, GST numbers, IFSCs, PAN) to prevent Google Sheets converting them to scientific notation or dates.
- **Google Sheets — `getBillById` does a full sheet read every call**. No caching. Acceptable at current scale; note this before adding any high-frequency polling.
- **Google Sheets — when mutating a row array, always spread first**: `const row = [...rows[i]]` before any mutation.
- **Next.js 16 (Turbopack)** — `params` in App Router route handlers is now a `Promise` and must be awaited: `const { id } = await params`. Read `node_modules/next/dist/docs/` before using any routing or middleware API.
- **No auth system** — user identity is entered manually in forms (name fields). Do not add auth silently; it is a future decision.
- **OpenRouter lazy-init** — the `OpenAI` client in `lib/ai.ts` must be created inside functions, not at module level. Build-time execution will fail if the key is absent.

## Known Risks in This Stack
- `getNextId` is not atomic — race condition produces duplicate `BILL-NNNN` IDs under concurrent intake
- `GOOGLE_PRIVATE_KEY` env var has literal `\n` characters — must call `.replace(/\\n/g, "\n")` before use (already in `getAuth()`)
- Sheets `toLocaleString('en-IN')` produces `"DD/MM/YYYY, HH:MM:SS"` — parse by splitting on comma first if ever reading auto-formatted timestamps
- Reading a row from the Sheets API returns a reference — spread before mutating

---

## Environment Variables

| Variable | Required | Source |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service account JSON → `client_email` |
| `GOOGLE_PRIVATE_KEY` | Yes | Service account JSON → `private_key` |
| `GOOGLE_SHEET_ID` | Yes | Sheet URL — the long ID segment |
| `OPENROUTER_API_KEY` | Yes | openrouter.ai/keys |
| `AI_MODEL` | No | Defaults to `google/gemini-2.0-flash-001` |
