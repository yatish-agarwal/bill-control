export type BillStage =
  | "Intake"
  | "Verification"
  | "Tally"
  | "SP Approval"
  | "MD Approval"
  | "Payment"
  | "Closed";

export type VerificationStatus = "Pending" | "In Progress" | "Done" | "On Hold" | "Sent Back";
export type ApprovalStatus = "Pending" | "Approved" | "Sent Back" | "Held";
export type PaymentStatus = "Pending" | "Approved for Payment" | "Released" | "Held";

export interface Bill {
  // Row index in sheet (1-based, actual sheet row)
  rowIndex: number;

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

  // VERIFICATION (cols 19–24)
  verificationStatus: VerificationStatus;
  verifiedBy: string;
  verifiedOn: string;
  verificationComments: string;
  supportingDocLink: string;
  finalNetPayable: string;

  // TALLY (cols 25–26)
  tallyVoucherNo: string;
  tallyEntryDate: string;

  // SP APPROVAL (cols 27–30)
  spStatus: ApprovalStatus;
  spApprover: string;
  spApprovedOn: string;
  spComments: string;

  // MD APPROVAL (cols 31–34)
  mdStatus: ApprovalStatus;
  mdApprover: string;
  mdApprovedOn: string;
  mdComments: string;

  // PAYMENT (cols 35–38)
  paymentStatus: PaymentStatus;
  paymentDate: string;
  utrChequeNo: string;
  releasedBy: string;

  // TRACKING (cols 39–43)
  currentStage: BillStage;
  currentOwner: string;
  daysInStage: string;
  totalAgeing: string;
  paymentAdviceSent: string;
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
