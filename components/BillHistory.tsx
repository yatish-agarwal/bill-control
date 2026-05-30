"use client";

import { Bill } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { DocLink } from "@/components/DocViewer";
import { Check, Clock } from "lucide-react";

// Indian-format currency; fall back to raw text for legacy/blank values.
function inr(raw: string) {
  const v = (raw || "").trim();
  if (v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : `₹${v}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 break-words">{value || "—"}</p>
    </div>
  );
}

// A stage section. `done` = this stage has been completed (show as filled).
// If not started, render a muted "pending" strip so the reviewer knows the order.
function Section({
  title,
  done,
  pending,
  children,
}: {
  title: string;
  done: boolean;
  pending?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 first:border-t-0 pt-4 first:pt-0">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
            done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
          }`}
        >
          {done ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      </div>
      {pending ? (
        <p className="text-xs text-gray-400 italic pl-7">Not yet completed</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pl-7">{children}</div>
      )}
    </div>
  );
}

// Read-only, top-to-bottom record of everything entered on the bill so far.
// `highlight` = the current stage being worked on (subtle ring).
export function BillHistory({ bill }: { bill: Bill }) {
  const verifDone = !!bill.verifiedOn || bill.verificationStatus === "Done";
  const tallyDone = !!bill.tallyVoucherNo || !!bill.tallyEntryDate;
  const spDone = bill.spStatus === "Approved";
  const mdDone = bill.mdStatus === "Approved";
  const payDone = bill.paymentStatus === "Released" || !!bill.utrChequeNo;
  const entryDone = !!bill.paymentVoucherNo;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Full Bill Record</h2>
        <Badge label={bill.currentStage || "Intake"} />
      </div>

      {/* INTAKE — always present */}
      <Section title="Intake" done>
        <Row label="Bill ID" value={<span className="font-mono">{bill.billId}</span>} />
        <Row label="Vendor" value={bill.vendor} />
        <Row label="Vendor Bill No." value={bill.vendorBillNo} />
        <Row label="Bill Date" value={bill.billDate} />
        <Row label="Due Date" value={bill.dueDate} />
        <Row label="Bill Type" value={bill.billType} />
        <Row label="Site / Project" value={bill.siteProject} />
        <Row label="Source" value={bill.source} />
        <Row label="PO / PI No." value={bill.poNumber} />
        <Row label="Bill Amount" value={inr(bill.billAmount)} />
        <Row label="GST" value={inr(bill.gst)} />
        <Row label="TDS" value={inr(bill.tds)} />
        <Row label="Net Amount" value={inr(bill.netAmount)} />
        <Row label="Assigned To" value={bill.assignedTo} />
        <Row label="Intake By" value={bill.intakeBy} />
        {bill.billPdfLink && (
          <div className="col-span-2 sm:col-span-3">
            <DocLink label="View Bill PDF" url={bill.billPdfLink} />
          </div>
        )}
      </Section>

      {/* VERIFICATION */}
      <Section title="Verification" done={verifDone} pending={!verifDone && !bill.verifiedBy && !bill.verificationComments}>
        <Row label="Status" value={bill.verificationStatus} />
        <Row label="Vendor Ledger Checked" value={bill.vendorLedgerChecked} />
        <Row label="Adjustment" value={inr(bill.adjustment)} />
        <Row label="Final Net Payable" value={inr(bill.finalNetPayable)} />
        <Row label="Verified By" value={bill.verifiedBy} />
        <Row label="Verified On" value={bill.verifiedOn} />
        <div className="col-span-2 sm:col-span-3">
          <Row label="What Was Verified" value={bill.verificationComments} />
        </div>
        {bill.adjustmentRemarks && (
          <div className="col-span-2 sm:col-span-3">
            <Row label="Adjustment Remarks" value={bill.adjustmentRemarks} />
          </div>
        )}
        {bill.supportingDocLink && (
          <div className="col-span-2 sm:col-span-3">
            <DocLink label="View Supporting Document" url={bill.supportingDocLink} />
          </div>
        )}
      </Section>

      {/* TALLY */}
      <Section title="Tally Entry" done={tallyDone} pending={!tallyDone}>
        <Row label="Tally Voucher No." value={bill.tallyVoucherNo} />
        <Row label="Tally Entry Date" value={bill.tallyEntryDate} />
      </Section>

      {/* SP APPROVAL */}
      <Section title="SP Approval" done={spDone} pending={!spDone && !bill.spApprover}>
        <Row label="Status" value={bill.spStatus} />
        <Row label="Approver" value={bill.spApprover} />
        <Row label="Approved On" value={bill.spApprovedOn} />
        {bill.spComments && (
          <div className="col-span-2 sm:col-span-3">
            <Row label="SP Comments" value={bill.spComments} />
          </div>
        )}
      </Section>

      {/* MD APPROVAL */}
      <Section title="MD Approval" done={mdDone} pending={!mdDone && !bill.mdApprover}>
        <Row label="Status" value={bill.mdStatus} />
        <Row label="Approver" value={bill.mdApprover} />
        <Row label="Approved On" value={bill.mdApprovedOn} />
        {bill.mdComments && (
          <div className="col-span-2 sm:col-span-3">
            <Row label="MD Comments" value={bill.mdComments} />
          </div>
        )}
      </Section>

      {/* PAYMENT */}
      <Section title="Payment" done={payDone} pending={!payDone && !bill.utrChequeNo}>
        <Row label="Status" value={bill.paymentStatus} />
        <Row label="Payment Date" value={bill.paymentDate} />
        <Row label="Paid From" value={bill.paidFrom} />
        <Row label="UTR / Cheque No." value={bill.utrChequeNo} />
        <Row label="Released By" value={bill.releasedBy} />
      </Section>

      {/* PAYMENT ENTRY */}
      {(entryDone || bill.currentStage === "Payment Entry" || bill.currentStage === "Closed") && (
        <Section title="Payment Entry" done={entryDone} pending={!entryDone}>
          <Row label="Payment Voucher No." value={bill.paymentVoucherNo} />
          <Row label="Voucher Date" value={bill.paymentVoucherDate} />
        </Section>
      )}
    </div>
  );
}
