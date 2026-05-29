"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bill, BillStage } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, RefreshCw, AlertTriangle } from "lucide-react";

const STAGES: { stage: BillStage; label: string; color: string; route: string }[] = [
  { stage: "Verification", label: "Verification", color: "bg-blue-500", route: "verify" },
  { stage: "Tally", label: "Tally Entry", color: "bg-purple-500", route: "tally" },
  { stage: "SP Approval", label: "SP Approval", color: "bg-orange-500", route: "sp-approval" },
  { stage: "MD Approval", label: "MD Approval", color: "bg-yellow-500", route: "md-approval" },
  { stage: "Payment", label: "Payment", color: "bg-teal-500", route: "payment" },
  { stage: "Closed", label: "Closed", color: "bg-green-500", route: "" },
];

export default function Dashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BillStage | "All">("All");

  const load = () => {
    setLoading(true);
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => { setBills(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.stage] = bills.filter((b) => b.currentStage === s.stage).length;
    return acc;
  }, {});

  const overdue = bills.filter(
    (b) => b.dueDate && new Date(b.dueDate) < new Date() && b.currentStage !== "Closed"
  );

  const visible = filter === "All" ? bills : bills.filter((b) => b.currentStage === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bill Control</h1>
          <p className="text-xs text-gray-500 mt-0.5">Payables workflow — single source of truth</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/intake" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Bill
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {STAGES.map((s) => (
            <button key={s.stage} onClick={() => setFilter(filter === s.stage ? "All" : s.stage)}
              className={`rounded-xl p-3 text-center transition-all border-2 ${filter === s.stage ? "border-blue-500 bg-blue-50" : "border-transparent bg-white shadow-sm hover:shadow"}`}>
              <div className="text-2xl font-bold text-gray-800">{counts[s.stage] ?? 0}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</div>
              <div className={`w-full h-1 rounded-full mt-2 ${s.color}`} />
            </button>
          ))}
        </div>

        {overdue.length > 0 && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">{overdue.length} bill{overdue.length > 1 ? "s" : ""} past due date</p>
              <p className="text-xs text-red-500 mt-0.5">{overdue.map((b) => b.billId).join(", ")}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {filter === "All" ? `All Bills (${bills.length})` : `${filter} (${visible.length})`}
            </h2>
            {filter !== "All" && (
              <button onClick={() => setFilter("All")} className="text-xs text-blue-600 hover:underline">Clear filter</button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No bills found</p>
              {filter === "All" && (
                <Link href="/intake" className="mt-3 inline-block text-xs text-blue-600 hover:underline">
                  Log the first bill →
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Bill ID</th>
                    <th className="px-4 py-3 text-left font-medium">Vendor</th>
                    <th className="px-4 py-3 text-left font-medium">Site</th>
                    <th className="px-4 py-3 text-right font-medium">Net Payable</th>
                    <th className="px-4 py-3 text-left font-medium">Due Date</th>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-left font-medium">Owner</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((bill) => {
                    const stageInfo = STAGES.find((s) => s.stage === bill.currentStage);
                    const isOverdue =
                      bill.dueDate && new Date(bill.dueDate) < new Date() && bill.currentStage !== "Closed";
                    return (
                      <tr key={bill.billId} className={`hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{bill.billId}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">{bill.vendor}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[100px] truncate">{bill.siteProject}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          ₹{bill.finalNetPayable || bill.netAmount}
                        </td>
                        <td className={`px-4 py-3 text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                          {bill.dueDate || "—"}{isOverdue && " ⚠"}
                        </td>
                        <td className="px-4 py-3"><Badge label={bill.currentStage || "Intake"} /></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{bill.currentOwner || "—"}</td>
                        <td className="px-4 py-3">
                          {stageInfo && stageInfo.route && bill.currentStage !== "Closed" ? (
                            <Link href={`/${stageInfo.route}/${bill.billId}`}
                              className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">
                              Open →
                            </Link>
                          ) : bill.currentStage === "Closed" ? (
                            <span className="text-xs text-green-600">✓ Paid</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
