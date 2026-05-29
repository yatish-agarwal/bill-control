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

---

## Open Questions (decisions not yet made)

- What is the expected bill calendar logic? Which day of month is each recurring bill expected? Who gets alerted when it hasn't arrived?
- Consumables lightweight track — does it skip Verification entirely, or just show a minimal form?
- When a bill is Sent Back from MD → does it go to SP, or all the way back to SA for re-verification?
- Should duplicate vendor bill numbers (same vendor + same bill no.) be blocked at intake or just flagged?
