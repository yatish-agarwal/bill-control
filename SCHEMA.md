# SCHEMA.md — Bill Control App

Single source of truth for all data structures. Read this before writing any code.

---

## Google Sheet Structure

**Sheet name:** `Bill Register` (exact, case-sensitive)
**Row 1:** Group labels — INTAKE, VERIFICATION, TALLY, APPROVALS, PAYMENT, PAYMENT ENTRY, TRACKING (AUTO)
**Row 2:** Column headers
**Row 3+:** Bill data (`DATA_START_ROW = 3`)

---

## ID Format

`BILL-NNNN` — zero-padded 4 digits. Examples: `BILL-0001`, `BILL-0042`, `BILL-0200`
Never use any other format. Never omit the prefix. Never use slashes or spaces.

---

## Date Format

`YYYY-MM-DD` everywhere — stored in sheet, sent in API, rendered in forms.
No DD/MM/YYYY. No MM-DD-YYYY. No timestamps in bill fields.

---

## Column Map (1-based) — 49 columns total (A–AW)

| # | Field Key | Header in Sheet | Group |
|---|---|---|---|
| 1 | `billId` | Bill ID | INTAKE |
| 2 | `dateReceived` | Date Received | INTAKE |
| 3 | `source` | Source | INTAKE |
| 4 | `siteProject` | Site / Project | INTAKE |
| 5 | `vendor` | Vendor | INTAKE |
| 6 | `vendorBillNo` | Vendor Bill No. | INTAKE |
| 7 | `billDate` | Bill Date | INTAKE |
| 8 | `dueDate` | Due Date | INTAKE |
| 9 | `billType` | Bill Type | INTAKE |
| 10 | `poNumber` | PO / PI Number | INTAKE |
| 11 | `billAmount` | Bill Amount (₹) | INTAKE |
| 12 | `gst` | GST (₹) | INTAKE |
| 13 | `tds` | TDS (₹) | INTAKE |
| 14 | `netAmount` | Net Amount (₹) | INTAKE |
| 15 | `billPdfLink` | Bill PDF Link | INTAKE |
| 16 | `assignedTo` | Assigned To (SA) | INTAKE |
| 17 | `intakeBy` | Intake By | INTAKE |
| 18 | `intakeDate` | Intake Date | INTAKE |
| 19 | `verificationStatus` | Verification Status | VERIFICATION |
| 20 | `vendorLedgerChecked` | Vendor Ledger Checked | VERIFICATION |
| 21 | `adjustment` | Adjustment (₹) | VERIFICATION |
| 22 | `adjustmentRemarks` | Adjustment Remarks | VERIFICATION |
| 23 | `finalNetPayable` | Final Net Payable (₹) | VERIFICATION |
| 24 | `supportingDocLink` | Supporting Doc | VERIFICATION |
| 25 | `verificationComments` | Verification Comments | VERIFICATION |
| 26 | `verifiedBy` | Verified By | VERIFICATION |
| 27 | `verifiedOn` | Verified On | VERIFICATION |
| 28 | `tallyVoucherNo` | Tally Voucher # | TALLY |
| 29 | `tallyEntryDate` | Tally Entry Date | TALLY |
| 30 | `spStatus` | SP Status | APPROVALS |
| 31 | `spApprover` | SP Approver | APPROVALS |
| 32 | `spApprovedOn` | SP Approved On | APPROVALS |
| 33 | `spComments` | SP Comments | APPROVALS |
| 34 | `mdStatus` | MD Status | APPROVALS |
| 35 | `mdApprover` | MD Approver | APPROVALS |
| 36 | `mdApprovedOn` | MD Approved On | APPROVALS |
| 37 | `mdComments` | MD Comments | APPROVALS |
| 38 | `paymentStatus` | Payment Status | PAYMENT |
| 39 | `paymentDate` | Payment Date | PAYMENT |
| 40 | `paidFrom` | Paid From (Bank) | PAYMENT |
| 41 | `utrChequeNo` | UTR / Cheque # | PAYMENT |
| 42 | `releasedBy` | Released By | PAYMENT |
| 43 | `paymentVoucherNo` | Payment Voucher # | PAYMENT ENTRY |
| 44 | `paymentVoucherDate` | Payment Voucher Date | PAYMENT ENTRY |
| 45 | `currentStage` | Current Stage | TRACKING |
| 46 | `currentOwner` | Current Owner | TRACKING |
| 47 | `daysInStage` | Days in Stage | TRACKING |
| 48 | `totalAgeing` | Total Ageing (Days) | TRACKING |
| 49 | `isDuplicate` | Duplicate | TRACKING |

---

## Status Vocabularies

### BillStage (col 45 — currentStage)
`Intake` | `Verification` | `Tally` | `SP Approval` | `MD Approval` | `Payment` | `Payment Entry` | `Closed`

### VerificationStatus (col 19)
`Pending` | `In Progress` | `Done` | `On Hold`

### ApprovalStatus (cols 30, 34 — spStatus, mdStatus)
`Pending` | `Approved`

### PaymentStatus (col 38)
`Pending` | `Released`

### YesNo (cols 20, 49)
`Yes` | `No` | `` (empty)

---

## Sites (col 4 — siteProject)
Dhulagarh, Dhulagarh-ZEPTO, Dankuni, HO / Kolkata, Bhubaneswar,
Noida, Pune, Detroj, Kheda, Taloja, Vavdi, CLCC

---

## Bill Types (col 9 — billType)
Electricity, Rent, Manpower, Consumables, Services, Staff Expenses,
Advance against PO/PI, Purchase against PO, Repair & Maintenance,
IT, Asset Rental, Travelling, Others

---

## SA List (col 16 — assignedTo)
Jyoti, Arpan, Jaya, Souro, Prantika, Pronoy

---

## RAW vs USER_ENTERED
Use `RAW` for: `billAmount`, `gst`, `tds`, `netAmount`, `adjustment`,
`finalNetPayable`, `vendorBillNo`, `poNumber`, `tallyVoucherNo`,
`utrChequeNo`, `paymentVoucherNo`

Use `USER_ENTERED` for everything else (dates, text, status fields).

---

## Duplicate Detection
At intake: if same `vendor` + same `vendorBillNo` already exists in the sheet,
set `isDuplicate = "Yes"` and show a red warning. Allow submission — do not block.
On dashboard: bills with `isDuplicate = "Yes"` are highlighted red.

---

## Edit Rules (Option B)
Data from any stage is editable by the stage owner until the next stage is approved.
- Verification + Tally fields: editable until SP approves
- SP fields: editable until MD approves
- MD fields: editable until payment is released
- Payment fields: editable until payment voucher is entered
Bills never move backward. Stage only advances on explicit action.
