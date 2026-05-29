import { google } from "googleapis";
import { Bill, BillStage } from "./types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_NAME = "Bill Register";
const DATA_START_ROW = 3; // Row 1 = group labels, Row 2 = column headers

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// Authoritative column registry — 1-based, matches sheet exactly.
// Column 49 = AW. Never hardcode a column letter — always derive via colLetter().
export const COL_MAP = {
  // INTAKE (1–18)
  billId: 1, dateReceived: 2, source: 3, siteProject: 4, vendor: 5,
  vendorBillNo: 6, billDate: 7, dueDate: 8, billType: 9, poNumber: 10,
  billAmount: 11, gst: 12, tds: 13, netAmount: 14, billPdfLink: 15,
  assignedTo: 16, intakeBy: 17, intakeDate: 18,
  // VERIFICATION (19–27)
  verificationStatus: 19, vendorLedgerChecked: 20,
  adjustment: 21, adjustmentRemarks: 22, finalNetPayable: 23,
  supportingDocLink: 24, verificationComments: 25, verifiedBy: 26, verifiedOn: 27,
  // TALLY (28–29)
  tallyVoucherNo: 28, tallyEntryDate: 29,
  // SP APPROVAL (30–33)
  spStatus: 30, spApprover: 31, spApprovedOn: 32, spComments: 33,
  // MD APPROVAL (34–37)
  mdStatus: 34, mdApprover: 35, mdApprovedOn: 36, mdComments: 37,
  // PAYMENT (38–42)
  paymentStatus: 38, paymentDate: 39, paidFrom: 40, utrChequeNo: 41, releasedBy: 42,
  // PAYMENT ENTRY (43–44)
  paymentVoucherNo: 43, paymentVoucherDate: 44,
  // TRACKING (45–49)
  currentStage: 45, currentOwner: 46, daysInStage: 47, totalAgeing: 48, isDuplicate: 49,
} as const;

// Fields that must be written with RAW to prevent Sheets from mangling numbers.
const RAW_FIELDS = new Set<keyof typeof COL_MAP>([
  "billAmount", "gst", "tds", "netAmount",
  "adjustment", "finalNetPayable",
  "vendorBillNo", "poNumber", "tallyVoucherNo", "utrChequeNo", "paymentVoucherNo",
]);

// Convert 1-based column number → letter(s). e.g. 1→A, 28→AB, 49→AW
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function rowToBill(row: (string | number | boolean | null)[], rowIndex: number): Bill {
  const v = (col: keyof typeof COL_MAP) => String(row[COL_MAP[col] - 1] ?? "");
  return {
    rowIndex,
    billId: v("billId"), dateReceived: v("dateReceived"), source: v("source"),
    siteProject: v("siteProject"), vendor: v("vendor"), vendorBillNo: v("vendorBillNo"),
    billDate: v("billDate"), dueDate: v("dueDate"), billType: v("billType"),
    poNumber: v("poNumber"), billAmount: v("billAmount"), gst: v("gst"),
    tds: v("tds"), netAmount: v("netAmount"), billPdfLink: v("billPdfLink"),
    assignedTo: v("assignedTo"), intakeBy: v("intakeBy"), intakeDate: v("intakeDate"),
    verificationStatus: (v("verificationStatus") || "Pending") as Bill["verificationStatus"],
    vendorLedgerChecked: v("vendorLedgerChecked"),
    adjustment: v("adjustment"), adjustmentRemarks: v("adjustmentRemarks"),
    finalNetPayable: v("finalNetPayable"), supportingDocLink: v("supportingDocLink"),
    verificationComments: v("verificationComments"),
    verifiedBy: v("verifiedBy"), verifiedOn: v("verifiedOn"),
    tallyVoucherNo: v("tallyVoucherNo"), tallyEntryDate: v("tallyEntryDate"),
    spStatus: (v("spStatus") || "Pending") as Bill["spStatus"],
    spApprover: v("spApprover"), spApprovedOn: v("spApprovedOn"), spComments: v("spComments"),
    mdStatus: (v("mdStatus") || "Pending") as Bill["mdStatus"],
    mdApprover: v("mdApprover"), mdApprovedOn: v("mdApprovedOn"), mdComments: v("mdComments"),
    paymentStatus: (v("paymentStatus") || "Pending") as Bill["paymentStatus"],
    paymentDate: v("paymentDate"), paidFrom: v("paidFrom"),
    utrChequeNo: v("utrChequeNo"), releasedBy: v("releasedBy"),
    paymentVoucherNo: v("paymentVoucherNo"), paymentVoucherDate: v("paymentVoucherDate"),
    currentStage: (v("currentStage") || "Intake") as BillStage,
    currentOwner: v("currentOwner"), daysInStage: v("daysInStage"),
    totalAgeing: v("totalAgeing"), isDuplicate: v("isDuplicate"),
  };
}

export async function getAllBills(): Promise<Bill[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A${DATA_START_ROW}:AW`,
  });
  const rows = res.data.values ?? [];
  return rows
    .map((row, i) => rowToBill(row, DATA_START_ROW + i))
    .filter((b) => b.billId);
}

export async function getBillById(billId: string): Promise<Bill | null> {
  const bills = await getAllBills();
  return bills.find((b) => b.billId === billId) ?? null;
}

// Check if a bill with the same vendor + vendorBillNo already exists.
export async function checkDuplicate(vendor: string, vendorBillNo: string): Promise<boolean> {
  const bills = await getAllBills();
  return bills.some(
    (b) =>
      b.vendor.trim().toLowerCase() === vendor.trim().toLowerCase() &&
      b.vendorBillNo.trim().toLowerCase() === vendorBillNo.trim().toLowerCase()
  );
}

export async function appendBill(data: Partial<Bill>): Promise<{ billId: string; isDuplicate: boolean }> {
  const sheets = getSheets();
  const allBills = await getAllBills();
  const newId = `BILL-${String(allBills.length + 1).padStart(4, "0")}`;
  const today = new Date().toISOString().split("T")[0];

  // Duplicate check
  const duplicate =
    data.vendor && data.vendorBillNo
      ? allBills.some(
          (b) =>
            b.vendor.trim().toLowerCase() === data.vendor!.trim().toLowerCase() &&
            b.vendorBillNo.trim().toLowerCase() === data.vendorBillNo!.trim().toLowerCase()
        )
      : false;

  // Build text/date row first (USER_ENTERED)
  const textRow = new Array(49).fill("");
  textRow[COL_MAP.billId - 1]             = newId;
  textRow[COL_MAP.dateReceived - 1]       = data.dateReceived ?? today;
  textRow[COL_MAP.source - 1]             = data.source ?? "";
  textRow[COL_MAP.siteProject - 1]        = data.siteProject ?? "";
  textRow[COL_MAP.vendor - 1]             = data.vendor ?? "";
  textRow[COL_MAP.billDate - 1]           = data.billDate ?? "";
  textRow[COL_MAP.dueDate - 1]            = data.dueDate ?? "";
  textRow[COL_MAP.billType - 1]           = data.billType ?? "";
  textRow[COL_MAP.billPdfLink - 1]        = data.billPdfLink ?? "";
  textRow[COL_MAP.assignedTo - 1]         = data.assignedTo ?? "";
  textRow[COL_MAP.intakeBy - 1]           = data.intakeBy ?? "";
  textRow[COL_MAP.intakeDate - 1]         = today;
  textRow[COL_MAP.verificationStatus - 1] = "Pending";
  textRow[COL_MAP.spStatus - 1]           = "Pending";
  textRow[COL_MAP.mdStatus - 1]           = "Pending";
  textRow[COL_MAP.paymentStatus - 1]      = "Pending";
  textRow[COL_MAP.currentStage - 1]       = "Verification";
  textRow[COL_MAP.currentOwner - 1]       = data.assignedTo ?? "";
  textRow[COL_MAP.isDuplicate - 1]        = duplicate ? "Yes" : "No";

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A${DATA_START_ROW}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [textRow] },
  });

  // Write RAW fields (numbers + codes) separately to prevent Sheets mangling
  const freshBills = await getAllBills();
  const newBill = freshBills.find((b) => b.billId === newId);
  if (newBill) {
    const rawFields: Partial<Record<keyof typeof COL_MAP, string>> = {};
    if (data.vendorBillNo) rawFields.vendorBillNo = data.vendorBillNo;
    if (data.poNumber)     rawFields.poNumber     = data.poNumber;
    if (data.billAmount)   rawFields.billAmount   = data.billAmount;
    if (data.gst != null)  rawFields.gst          = data.gst;
    if (data.tds != null)  rawFields.tds          = data.tds;
    if (data.netAmount)    rawFields.netAmount    = data.netAmount;
    if (Object.keys(rawFields).length > 0) {
      await updateBillFields(newBill.rowIndex, rawFields);
    }
  }

  return { billId: newId, isDuplicate: duplicate };
}

export async function updateBillFields(
  rowIndex: number,
  fields: Partial<Record<keyof typeof COL_MAP, string>>
): Promise<void> {
  const sheets = getSheets();

  const rawData:  { range: string; values: string[][] }[] = [];
  const textData: { range: string; values: string[][] }[] = [];

  for (const [key, value] of Object.entries(fields)) {
    const colNum = COL_MAP[key as keyof typeof COL_MAP];
    const range = `${SHEET_NAME}!${colLetter(colNum)}${rowIndex}`;
    const entry = { range, values: [[value ?? ""]] };
    (RAW_FIELDS.has(key as keyof typeof COL_MAP) ? rawData : textData).push(entry);
  }

  const requests: Promise<unknown>[] = [];
  if (rawData.length > 0) {
    requests.push(
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { valueInputOption: "RAW", data: rawData },
      })
    );
  }
  if (textData.length > 0) {
    requests.push(
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { valueInputOption: "USER_ENTERED", data: textData },
      })
    );
  }
  await Promise.all(requests);
}
