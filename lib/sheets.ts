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

// 1-based column numbers matching the sheet exactly.
// Column 43 = AQ. Never deviate from this map.
export const COL_MAP = {
  // INTAKE (1–18)
  billId: 1, dateReceived: 2, source: 3, siteProject: 4, vendor: 5,
  vendorBillNo: 6, billDate: 7, dueDate: 8, billType: 9, poNumber: 10,
  billAmount: 11, gst: 12, tds: 13, netAmount: 14, billPdfLink: 15,
  assignedTo: 16, intakeBy: 17, intakeDate: 18,
  // VERIFICATION (19–24)
  verificationStatus: 19, verifiedBy: 20, verifiedOn: 21,
  verificationComments: 22, supportingDocLink: 23, finalNetPayable: 24,
  // TALLY (25–26)
  tallyVoucherNo: 25, tallyEntryDate: 26,
  // SP APPROVAL (27–30)
  spStatus: 27, spApprover: 28, spApprovedOn: 29, spComments: 30,
  // MD APPROVAL (31–34)
  mdStatus: 31, mdApprover: 32, mdApprovedOn: 33, mdComments: 34,
  // PAYMENT (35–38)
  paymentStatus: 35, paymentDate: 36, utrChequeNo: 37, releasedBy: 38,
  // TRACKING (39–43)
  currentStage: 39, currentOwner: 40, daysInStage: 41, totalAgeing: 42,
  paymentAdviceSent: 43,
} as const;

// Fields that must use RAW valueInputOption to prevent Sheets from mangling them.
const RAW_FIELDS = new Set<keyof typeof COL_MAP>([
  "billAmount", "gst", "tds", "netAmount", "finalNetPayable",
  "vendorBillNo", "poNumber", "tallyVoucherNo", "utrChequeNo",
]);

// Convert 1-based column number to column letter(s). e.g. 1→A, 27→AA, 43→AQ
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
    // INTAKE
    billId: v("billId"),
    dateReceived: v("dateReceived"),
    source: v("source"),
    siteProject: v("siteProject"),
    vendor: v("vendor"),
    vendorBillNo: v("vendorBillNo"),
    billDate: v("billDate"),
    dueDate: v("dueDate"),
    billType: v("billType"),
    poNumber: v("poNumber"),
    billAmount: v("billAmount"),
    gst: v("gst"),
    tds: v("tds"),
    netAmount: v("netAmount"),
    billPdfLink: v("billPdfLink"),
    assignedTo: v("assignedTo"),
    intakeBy: v("intakeBy"),
    intakeDate: v("intakeDate"),
    // VERIFICATION
    verificationStatus: (v("verificationStatus") || "Pending") as Bill["verificationStatus"],
    verifiedBy: v("verifiedBy"),
    verifiedOn: v("verifiedOn"),
    verificationComments: v("verificationComments"),
    supportingDocLink: v("supportingDocLink"),
    finalNetPayable: v("finalNetPayable"),
    // TALLY
    tallyVoucherNo: v("tallyVoucherNo"),
    tallyEntryDate: v("tallyEntryDate"),
    // SP APPROVAL
    spStatus: (v("spStatus") || "Pending") as Bill["spStatus"],
    spApprover: v("spApprover"),
    spApprovedOn: v("spApprovedOn"),
    spComments: v("spComments"),
    // MD APPROVAL
    mdStatus: (v("mdStatus") || "Pending") as Bill["mdStatus"],
    mdApprover: v("mdApprover"),
    mdApprovedOn: v("mdApprovedOn"),
    mdComments: v("mdComments"),
    // PAYMENT
    paymentStatus: (v("paymentStatus") || "Pending") as Bill["paymentStatus"],
    paymentDate: v("paymentDate"),
    utrChequeNo: v("utrChequeNo"),
    releasedBy: v("releasedBy"),
    // TRACKING
    currentStage: (v("currentStage") || "Intake") as BillStage,
    currentOwner: v("currentOwner"),
    daysInStage: v("daysInStage"),
    totalAgeing: v("totalAgeing"),
    paymentAdviceSent: v("paymentAdviceSent"),
  };
}

export async function getAllBills(): Promise<Bill[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A${DATA_START_ROW}:AQ`,
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

export async function appendBill(data: Partial<Bill>): Promise<string> {
  const sheets = getSheets();
  const allBills = await getAllBills();
  const newId = `BILL-${String(allBills.length + 1).padStart(4, "0")}`;
  const today = new Date().toISOString().split("T")[0];

  // Build the row. RAW fields placed separately via batchUpdate to avoid Sheets mangling.
  const textRow = new Array(43).fill("");
  textRow[COL_MAP.billId - 1] = newId;
  textRow[COL_MAP.dateReceived - 1] = data.dateReceived ?? today;
  textRow[COL_MAP.source - 1] = data.source ?? "";
  textRow[COL_MAP.siteProject - 1] = data.siteProject ?? "";
  textRow[COL_MAP.vendor - 1] = data.vendor ?? "";
  textRow[COL_MAP.billDate - 1] = data.billDate ?? "";
  textRow[COL_MAP.dueDate - 1] = data.dueDate ?? "";
  textRow[COL_MAP.billType - 1] = data.billType ?? "";
  textRow[COL_MAP.billPdfLink - 1] = data.billPdfLink ?? "";
  textRow[COL_MAP.assignedTo - 1] = data.assignedTo ?? "";
  textRow[COL_MAP.intakeBy - 1] = data.intakeBy ?? "";
  textRow[COL_MAP.intakeDate - 1] = today;
  textRow[COL_MAP.verificationStatus - 1] = "Pending";
  textRow[COL_MAP.spStatus - 1] = "Pending";
  textRow[COL_MAP.mdStatus - 1] = "Pending";
  textRow[COL_MAP.paymentStatus - 1] = "Pending";
  textRow[COL_MAP.currentStage - 1] = "Verification";
  textRow[COL_MAP.currentOwner - 1] = data.assignedTo ?? "";

  // Append the row with USER_ENTERED for text/date fields
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A${DATA_START_ROW}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [textRow] },
  });

  // Now fetch the row index of the just-appended row so we can RAW-write numeric fields
  const freshBills = await getAllBills();
  const newBill = freshBills.find((b) => b.billId === newId);
  if (newBill) {
    const rawUpdates: Record<keyof typeof COL_MAP, string> = {} as Record<keyof typeof COL_MAP, string>;
    if (data.vendorBillNo) rawUpdates.vendorBillNo = data.vendorBillNo;
    if (data.poNumber) rawUpdates.poNumber = data.poNumber;
    if (data.billAmount) rawUpdates.billAmount = data.billAmount;
    if (data.gst !== undefined) rawUpdates.gst = data.gst;
    if (data.tds !== undefined) rawUpdates.tds = data.tds;
    if (data.netAmount) rawUpdates.netAmount = data.netAmount;
    if (Object.keys(rawUpdates).length > 0) {
      await updateBillFields(newBill.rowIndex, rawUpdates, "RAW");
    }
  }

  return newId;
}

export async function updateBillFields(
  rowIndex: number,
  fields: Partial<Record<keyof typeof COL_MAP, string>>,
  forceInputOption?: "RAW" | "USER_ENTERED"
): Promise<void> {
  const sheets = getSheets();

  // Split into RAW and USER_ENTERED batches
  const rawData: { range: string; values: string[][] }[] = [];
  const textData: { range: string; values: string[][] }[] = [];

  for (const [key, value] of Object.entries(fields)) {
    const colNum = COL_MAP[key as keyof typeof COL_MAP];
    const range = `${SHEET_NAME}!${colLetter(colNum)}${rowIndex}`;
    const entry = { range, values: [[value ?? ""]] };
    const isRaw = forceInputOption === "RAW" || RAW_FIELDS.has(key as keyof typeof COL_MAP);
    (isRaw ? rawData : textData).push(entry);
  }

  const requests = [];
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
