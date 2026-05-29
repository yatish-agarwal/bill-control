export type BillStage =
  | "Intake"
  | "Verification"
  | "Tally"
  | "SP Approval"
  | "MD Approval"
  | "Payment"
  | "Payment Entry"
  | "Closed";

export type VerificationStatus = "Pending" | "In Progress" | "Done" | "On Hold";
export type ApprovalStatus = "Pending" | "Approved";
export type PaymentStatus = "Pending" | "Released";

export interface Bill {
  rowIndex: number; // actual sheet row (1-based)

  // INTAKE (cols 1–18)
  billId: string;
  dateReceived: string;
  source: string;
  siteProject: string;
  vendor: string;
  vendorBillNo: string;
  billDate: string;
  dueDate: string;
  billType: string;
  poNumber: string;
  billAmount: string;
  gst: string;
  tds: string;
  netAmount: string;
  billPdfLink: string;
  assignedTo: string;
  intakeBy: string;
  intakeDate: string;

  // VERIFICATION (cols 19–27)
  verificationStatus: VerificationStatus;
  vendorLedgerChecked: string;
  adjustment: string;
  adjustmentRemarks: string;
  finalNetPayable: string;
  supportingDocLink: string;
  verificationComments: string;
  verifiedBy: string;
  verifiedOn: string;

  // TALLY (cols 28–29)
  tallyVoucherNo: string;
  tallyEntryDate: string;

  // SP APPROVAL (cols 30–33)
  spStatus: ApprovalStatus;
  spApprover: string;
  spApprovedOn: string;
  spComments: string;

  // MD APPROVAL (cols 34–37)
  mdStatus: ApprovalStatus;
  mdApprover: string;
  mdApprovedOn: string;
  mdComments: string;

  // PAYMENT (cols 38–42)
  paymentStatus: PaymentStatus;
  paymentDate: string;
  paidFrom: string;
  utrChequeNo: string;
  releasedBy: string;

  // PAYMENT ENTRY (cols 43–44)
  paymentVoucherNo: string;
  paymentVoucherDate: string;

  // TRACKING (cols 45–49)
  currentStage: BillStage;
  currentOwner: string;
  daysInStage: string;
  totalAgeing: string;
  isDuplicate: string;
}

export interface ParsedInvoiceFields {
  vendor?: string;
  vendorBillNo?: string;
  billDate?: string;
  dueDate?: string;
  billAmount?: string;
  gst?: string;
  tds?: string;
  netAmount?: string;
  billType?: string;
  poNumber?: string;
}

export interface ThreeWayMatchResult {
  poVendor: string;
  invoiceVendor: string;
  vendorMatch: boolean;
  poNumber: string;
  invoicePoNumber: string;
  poNumberMatch: boolean;
  poQty: string;
  grnQty: string;
  invoiceQty: string;
  qtyMatch: boolean;
  poRate: string;
  invoiceRate: string;
  rateMatch: boolean;
  poAmount: string;
  invoiceAmount: string;
  amountMatch: boolean;
  gstOnPo: string;
  gstOnInvoice: string;
  gstMatch: boolean;
  overallMatch: boolean;
  discrepancies: string[];
  rawSummary: string;
}
