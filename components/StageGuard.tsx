"use client";

import Link from "next/link";
import { Bill, BillStage } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

// Maps a stage to the route that owns it. Empty route = no action page (Closed).
const STAGE_ROUTE: Record<BillStage, string> = {
  Intake: "/intake",
  Verification: "verify",
  Tally: "tally",
  "SP Approval": "sp-approval",
  "MD Approval": "md-approval",
  Payment: "payment",
  "Payment Entry": "payment-entry",
  Closed: "",
};

// Shown when someone opens a stage page for a bill that isn't at that stage.
// Prevents skipping stages forward (e.g. /payment for a bill still in Verification)
// and editing bills that have already moved on.
export function WrongStage({ bill, expected }: { bill: Bill; expected: BillStage }) {
  const actual = bill.currentStage || "Intake";
  const route = STAGE_ROUTE[actual];
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Not at this stage</h2>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-mono">{bill.billId}</span> is currently at
        </p>
        <p className="text-base font-semibold text-gray-800 mb-5">{actual}</p>
        <p className="text-xs text-gray-400 mb-6">
          This is the <span className="font-medium">{expected}</span> page. To keep the workflow
          intact, a bill can only be actioned at the stage it is in.
        </p>
        <div className="flex gap-3 justify-center">
          {actual === "Closed" ? (
            <Link href={`/bill/${bill.billId}`}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              View closed bill
            </Link>
          ) : route ? (
            <Link href={`/${route}/${bill.billId}`}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Go to {actual}
            </Link>
          ) : null}
          <Link href="/"
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
