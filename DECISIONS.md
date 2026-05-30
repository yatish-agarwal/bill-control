# DECISIONS.md — Bill Control App

Every business and technical decision recorded here. Format:
`[DATE] DECISION: [what was decided] REASON: [why]`

---

[2026-05-29] DECISION: Google Sheets as the database.
REASON: Team already uses Sheets; avoids infrastructure overhead at this stage. Known tradeoff: no atomic writes, no uniqueness guarantees. Revisit if concurrent usage causes duplicate ID issues.

[2026-05-29] DECISION: OpenRouter + Gemini 2.0 Flash as the AI model.
REASON: ~10× cheaper than Claude Sonnet for invoice parsing and 3-way match. Model override available via AI_MODEL env var without code change.

[2026-05-29] DECISION: No authentication system.
REASON: Small known team (5 roles). User identity captured via name fields in forms. Add auth when workflow is stable and team size grows.

[2026-05-29] DECISION: Bill ID format is BILL-NNNN (zero-padded 4 digits).
REASON: Human-readable, sortable, unambiguous. No slashes (breaks URLs). No auto-increment from Sheets (not reliable) — generated from row count + 1 at write time. Known race condition: two simultaneous intakes can collide. Acceptable at current volume.

[2026-05-29] DECISION: Date format is YYYY-MM-DD everywhere.
REASON: ISO standard, sorts correctly as a string, unambiguous across locales.

[2026-05-29] DECISION: Bill type verification rules not yet implemented in code.
REASON: Required real vendor data analysis before rules could be defined. Analysis now complete (see SCHEMA.md → Bill Type Verification Mode). Implementation is next.

[2026-05-29] DECISION: Consumables kept in bill control system, not moved to petty cash.
REASON: These are client-reimbursable expenses — need a paper trail. Lightweight verification track (SP judgement only, no checklist) planned but not yet built.

[2026-05-29] DECISION: Manpower verification is upload-only (no attendance sheet parsing).
REASON: Shrikant/Joyeeta already verify manually outside the system. App captures their sign-off and supporting document upload. Full manpower verification tool is a separate future project.

[2026-05-29] DECISION: lib/anthropic.ts left in codebase but unused.
REASON: Replaced by lib/ai.ts (OpenRouter). Not deleted yet in case rollback is needed. Do not import from it.

[2026-05-29] DECISION: No caching layer on Google Sheets reads.
REASON: Current volume is low. getBillById does a full sheet read on every call. Add caching only when response times become a problem.

[2026-05-29] DECISION: valueInputOption is USER_ENTERED by default in sheets.ts.
REASON: Handles date and text formatting well. Exception: numeric/code fields (amounts, voucher numbers, UTR, PAN, IFSC) must use RAW to prevent Google Sheets from converting them to scientific notation or dates. Currently not all numeric fields use RAW — this is a known bug to fix.


[2026-05-29] DECISION: Schema reduced from 51 columns to 43 columns.
REASON: Removed the 9-column verification checklist (poValid, grnExists, qtyMatches, rateMatches, gstCorrect, vendorLedgerChecked, vendorOutstanding, advanceRecovery, dnCnAdj). V1 verification is simplified: SA fills a printed physical checklist per bill type, scans it, uploads to Google Drive, and pastes the URL in `supportingDocLink` (col 23). `finalNetPayable` moves to col 24. This removes a major barrier to adoption without losing the audit trail.

[2026-05-29] DECISION: Added `supportingDocLink` column (col 23) to VERIFICATION section.
REASON: SA needs to attach the physical checklist scan as evidence. URL-based link is simpler than in-app file upload at this stage; Google Drive is already in use.

[2026-05-29] DECISION: 3-way match tool retained in verify page, shown only for Against PO / Asset Purchase bill types.
REASON: These bill types require documentary evidence. Match result auto-fills the comments field. SA still records final verdict manually (Done / On Hold).

[2026-05-29] DECISION: Bill types updated to full operational list: WH Electricity, WH Rent, Office Rent, Internet / Telecom, Cloud / Software, Manpower Services, Against PO, Asset Purchase, Advance Payment, Consumables, Consulting, Pest Control, Other.
REASON: Previous list (Material, Service, Labour, Utility, Other) was a placeholder. New list matches the actual vendor bill types observed in the team's vendor list analysis.

[2026-05-29] DECISION: SA list updated to Jyoti, Arpan, Jaya, Souro, Prantika, Pronoy.
REASON: Prantika and Pronoy added based on workbook vendor list analysis showing they are active site accountants.

[2026-05-29] DECISION: Sites list updated to 15 sites from workbook: Dhulagarh, Dankuni, HO / Kolkata, Bhubaneswar, Noida, Pune, Detroj, Kheda, New Mumbai, New Ahmedabad, CLCC, Noida-ZEPTO, DHLG-ZEPTO, Kheda-ZEPTO, Dankuni-ZEPTO.
REASON: Matches the actual operational sites derived from vendor list analysis. Previous list was incomplete.

[2026-05-29] DECISION: RAW valueInputOption now explicitly applied per-field in updateBillFields.
REASON: Previous implementation used USER_ENTERED for all fields — known bug where Sheets converts amounts to scientific notation. New sheets.ts splits updates into two batches (RAW vs USER_ENTERED) based on the RAW_FIELDS set.

[2026-05-30] DECISION: Bill ID is derived from the highest existing BILL-NNNN, not the row count.
REASON: `allBills.length + 1` re-issued an existing ID after any row deletion, causing duplicate billIds. Max-suffix+1 is collision-safe against gaps. (Concurrent-intake race still exists and is unchanged — separate known risk.)

[2026-05-30] DECISION: Backward stage transitions are rejected at the API (PATCH returns 409).
REASON: Detail pages are reachable by direct URL / stale browser tabs. Without a guard, re-submitting an earlier-stage form on an already-advanced bill regressed currentStage and overwrote later-stage data. Field edits without a stage change, and same/forward transitions, remain allowed (preserves Option-B editing).

[2026-05-30] DECISION: API boundary validates intake — vendor, vendorBillNo, netAmount required; billAmount/gst/tds/netAmount must be numeric (regex ^\d+(\.\d{1,2})?$). Returns 400 otherwise.
REASON: Client validation can be bypassed via direct API calls; a malformed POST otherwise wrote a junk row that consumed a Bill ID. Amount fields also validated on the intake and verification forms.

[2026-05-30] DECISION: updateBillFields silently ignores keys not in COL_MAP.
REASON: An unknown field name produced an empty column letter and an invalid A1 range, failing the entire batch update. Filtering unknown keys makes PATCH robust to extra fields in the request body.

[2026-05-30] DECISION: Server-stamped dates (dateReceived, intakeDate) use Asia/Kolkata, and the dashboard overdue check compares local YYYY-MM-DD strings.
REASON: `new Date().toISOString()` is UTC; on a UTC host (Vercel) audit dates landed a day behind during the IST early-morning window, and a bill due *today* was wrongly flagged overdue. The company operates only in India.

[2026-05-30] DECISION: Dashboard amounts render with Indian digit grouping (toLocaleString en-IN), falling back to raw text for non-numeric/legacy values.
REASON: Readability for the finance team; never hide a legacy value that isn't a clean number.

[2026-05-30] DECISION: Built the Bill Calendar slice (was planned since 2026-05-29 but never coded). Reads the existing "Bill Calendar" tab; new page at /calendar.
REASON: User noticed the calendar was missing. It was always in scope ("Bill Calendar to track recurring bills monthly, Apr 2026 → Mar 2027") and the sheet tab already existed with data — the app just never read it.

[2026-05-30] DECISION: Calendar layout = fixed cols A–E (Vendor, Site, Bill Type, Frequency, Agreed Amount) + one column per month (Apr 2026 → Mar 2027), read dynamically from header row 2. Data starts row 3.
REASON: Matches the pre-existing sheet tab exactly. Months are read from the header, not hardcoded, so rolling to a new FY only requires editing the sheet headers.

[2026-05-30] DECISION: Calendar cell statuses = Expected / Received / Paid / N/A / (blank). Updated manually by clicking a cell to cycle; nothing auto-marks.
REASON: User: "received is okay, then paid can also be another point" and "let's keep it manual for now. Simple." Auto-matching from the Bill Register is deferred to a later version.

[2026-05-30] DECISION: Recurring bills can be added in-app (modal form on /calendar, appends to the tab) AND read from rows entered directly in the sheet.
REASON: User chose "Both" — no-manual-work preference, but direct sheet edits must still be honoured.

---

## Open Questions (decisions not yet made)

- What is the expected bill calendar logic? Which day of month is each recurring bill expected? Who gets alerted when it hasn't arrived?
- Consumables lightweight track — does it skip Verification entirely, or just show a minimal form?
- When a bill is Sent Back from MD → does it go to SP, or all the way back to SA for re-verification?
- Should duplicate vendor bill numbers (same vendor + same bill no.) be blocked at intake or just flagged?
