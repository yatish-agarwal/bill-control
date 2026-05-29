# Bill Control App — Setup Guide

## 1. Copy env file

```bash
cp .env.local.example .env.local
```

## 2. Google Sheets — Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com) → Create a project
2. Enable **Google Sheets API**
3. Create a **Service Account** → download the JSON key
4. From the JSON key, copy into `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` → `client_email`
   - `GOOGLE_PRIVATE_KEY` → `private_key` (keep the `\n` newlines as-is)
5. Copy your Bill Register sheet's URL ID into `GOOGLE_SHEET_ID`
   - URL looks like: `docs.google.com/spreadsheets/d/THIS_PART_HERE/edit`
6. **Share your Google Sheet** with the service account email (Editor access)

## 3. Google Sheet structure

Your sheet must have a tab named exactly **`Bill Register`** with:
- Row 1: Group headers (INTAKE, VERIFICATION, etc.)
- Row 2: Column headers (Bill ID, Date Received, …)
- Row 3 onwards: Data

This matches the `Bill_Control_Workbook.xlsx` structure exactly.

## 4. Anthropic API key

Get your key from [console.anthropic.com](https://console.anthropic.com) and add it to `.env.local`.

## 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Workflow

| URL | Who uses it | Stage |
|-----|-------------|-------|
| `/` | Everyone | Dashboard |
| `/intake` | Intake Resource | Log new bill + upload invoice |
| `/verify/[billId]` | Site Accountant | Verify + 3-way match |
| `/tally/[billId]` | Site Accountant | Tally voucher entry |
| `/sp-approval/[billId]` | Pallab | Approve / send back |
| `/md-approval/[billId]` | MD | Final approval |
| `/payment/[billId]` | Tara | Release payment + UTR |

## Future: Connect PO/GRN sheets

In `app/api/three-way-match/route.ts`, replace the file-upload logic with a call to
`lib/sheets.ts` to pull PO/GRN data directly by PO number. The match prompt in
`lib/anthropic.ts` (`THREE_WAY_MATCH_PROMPT`) can then take structured JSON instead
of document uploads.
