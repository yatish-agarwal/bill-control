# SCHEMA.md — Bill Control App

Single source of truth for all data structures. Read this before writing any code.

---

## Google Sheet Structure

**Sheet name:** `Bill Register` (exact, case-sensitive)
**Row 1:** Group labels — INTAKE, VERIFICATION, TALLY, APPROVALS, PAYMENT, TRACKING (AUTO)
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

## Column Map (1-based) — 43 columns total (A–AQ)

| # | Field Key | Header in Sheet | Group | Type | Notes |
|---|---|---|---|---|---|
| 1 | `billId` | Bill ID | INTAKE | string | `BILL-NNNN` |
| 2 | `dateReceived` | Date Received | INTAKE | date | `YYYY-MM-DD` |
| 3 | `source` | Source | INTAKE | string | Email, Hard Copy, Courier, WhatsApp, Other |
| 4 | `siteProject` | Site / Project | INTAKE | string | See Site Master |
| 5 | `vendor` | Vendor | INTAKE | string | Free text |
| 6 | `vendorBillNo` | Vendor Bill No. | INTAKE | string | Free text — store as RAW |
| 7 | `billDate` | Bill Date | INTAKE | date | `YYYY-MM-DD` |
| 8 | `dueDate` | Due Date | INTAKE | date | `YYYY-MM-DD` or empty |
| 9 | `billType` | Bill Type | INTAKE | string | See Bill Types below |
| 10 | `poNumber` | PO Number | INTAKE | string | Free text or empty — store as RAW |
| 11 | `billAmount` | Bill Amount (₹) | INTAKE | number string | Numeric, no commas — store as RAW |
| 12 | `gst` | GST (₹) | INTAKE | number string | Numeric or `0` — store as RAW |
| 13 | `tds` | TDS (₹) | INTAKE | number string | Numeric or `0` — store as RAW |
| 14 | `netAmount` | Net Amount (₹) | INTAKE | number string | Numeric — store as RAW |
| 15 | `billPdfLink` | Bill PDF Link | INTAKE | string | URL or empty |
| 16 | `assignedTo` | Assigned To (SA) | INTAKE | string | Jyoti, Arpan, Jaya, Souro, Prantika, Pronoy |
| 17 | `intakeBy` | Intake By | INTAKE | string | Free text |
| 18 | `intakeDate` | Intake Date | INTAKE | date | `YYYY-MM-DD` |
| 19 | `verificationStatus` | Verification Status | VERIFICATION | string | See status vocab below |
| 20 | `verifiedBy` | Verified By | VERIFICATION | string | Free text |
| 21 | `verifiedOn` | Verified On | VERIFICATION | date | `YYYY-MM-DD` |
| 22 | `verificationComments` | Verification Comments | VERIFICATION | string | Free text |
| 23 | `supportingDocLink` | Supporting Doc Link | VERIFICATION | string | URL or empty |
| 24 | `finalNetPayable` | Final Net Payable (₹) | VERIFICATION | number string | Numeric — store as RAW |
| 25 | `tallyVoucherNo` | Tally Voucher # | TALLY | string | Free text — store as RAW |
| 26 | `tallyEntryDate` | Tally Entry Date | TALLY | date | `YYYY-MM-DD` |
| 27 | `spStatus` | SP Status | APPROVALS | string | See status vocab below |
| 28 | `spApprover` | SP Approver | APPROVALS | string | Free text |
| 29 | `spApprovedOn` | SP Approved On | APPROVALS | date | `YYYY-MM-DD` |
| 30 | `spComments` | SP Comments | APPROVALS | string | Free text |
| 31 | `mdStatus` | MD Status | APPROVALS | string | See status vocab below |
| 32 | `mdApprover` | MD Approver | APPROVALS | string | Free text |
| 33 | `mdApprovedOn` | MD Approved On | APPROVALS | date | `YYYY-MM-DD` |
| 34 | `mdComments` | MD Comments | APPROVALS | string | Free text |
| 35 | `paymentStatus` | Payment Status | PAYMENT | string | See status vocab below |
| 36 | `paymentDate` | Payment Date | PAYMENT | date | `YYYY-MM-DD` |
| 37 | `utrChequeNo` | UTR / Cheque # | PAYMENT | string | Free text — store as RAW |
| 38 | `releasedBy` | Released By | PAYMENT | string | Free text |
| 39 | `currentStage` | Current Stage | TRACKING | string | See stage vocab below |
| 40 | `currentOwner` | Current Owner | TRACKING | string | Free text |
| 41 | `daysInStage` | Days in Stage | TRACKING | number string | Auto-calculated |
| 42 | `totalAgeing` | Total Ageing (Days) | TRACKING | number string | Auto-calculated |
| 43 | `paymentAdviceSent` | Payment Advice Sent | TRACKING | string | Yes, No |

---

## Status Vocabularies

### BillStage (column 39 — currentStage)
`Intake` | `Verification` | `Tally` | `SP Approval` | `MD Approval` | `Payment` | `Closed`

### VerificationStatus (column 19)
`Pending` | `In Progress` | `Done` | `On Hold` | `Sent Back`

### ApprovalStatus (columns 27, 31 — spStatus, mdStatus)
`Pending` | `Approved` | `Sent Back` | `Held`

### PaymentStatus (column 35)
`Pending` | `Approved for Payment` | `Released` | `Held`

---

## Bill Types (column 9)
`WH Electricity` | `WH Rent` | `Office Rent` | `Internet / Telecom` | `Cloud / Software`
`Manpower Services` | `Against PO` | `Asset Purchase` | `Advance Payment`
`Consumables` | `Consulting` | `Pest Control` | `Other`

---

## Bill Type → Verification Mode

| Bill Type | Verification Mode | V1 Approach |
|---|---|---|
| WH Electricity | Sanity check vs last month | Flag if >20% higher — SA notes in comments |
| WH Rent / Office Rent | Agreement check | Confirm matches Recurring Bill Master |
| Internet / Telecom / Cloud | Contract check | Confirm matches contracted plan amount |
| Manpower Services | Central team sign-off | Shrikant/Joyeeta verify offline, upload doc |
| Against PO | 3-way match | Use 3-way match tool on verify page |
| Asset Purchase | 3-way match | Use 3-way match tool on verify page |
| Advance Payment | SP judgement | Invoice only — SA uploads relevant doc |
| Consumables | SP judgement | Invoice only — lightweight, no checklist |
| Consulting / Pest Control / Other | SP judgement | Invoice only |

V1 verification: simplified single form for all bill types. SA fills printed checklist,
scans or photographs it, uploads to Google Drive, pastes link in `supportingDocLink`.

---

## Sites (known values for siteProject)
Dhulagarh, Dankuni, HO / Kolkata, Bhubaneswar, Noida, Pune, Detroj, Kheda,
New Mumbai, New Ahmedabad, CLCC, Noida-ZEPTO, DHLG-ZEPTO, Kheda-ZEPTO, Dankuni-ZEPTO

---

## RAW vs USER_ENTERED
Use `RAW` valueInputOption for:
`billAmount`, `gst`, `tds`, `netAmount`, `finalNetPayable`,
`vendorBillNo`, `poNumber`, `tallyVoucherNo`, `utrChequeNo`

Use `USER_ENTERED` for everything else (dates, text fields, status fields).
