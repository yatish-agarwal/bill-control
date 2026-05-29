"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle2, XCircle, PauseCircle } from "lucide-react";

interface FormData {
  spStatus: "Approved" | "Sent Back" | "Held";
  spApprover: string;
  spComments: string;
}

export default function SPApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: { spApprover: "Pallab", spStatus: "Approved" },
  });
  const status = watch("spStatus");

  useEffect(() => {
    fetch(`/api/bills/${id}`).then((r) => r.json()).then((b) => { setBill(b); setLoading(false); });
  }, [id]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const nextStage = data.spStatus === "Approved" ? "MD Approval" : "Verification";
      await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, spApprovedOn: new Date().toISOString().split("T")[0], currentStage: nextStage }),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-blue-600" /></div>;
  if (!bill) return <div className="min-h-screen flex items-center justify-center text-gray-500">Bill not found</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-sm">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Decision Recorded</h2>
          <p className="text-gray-500 text-sm mb-6">
            {status === "Approved" ? "Bill moved to MD Approval" : status === "Sent Back" ? "Bill sent back for re-verification" : "Bill held for clarification"}
          </p>
          <button onClick={() => router.push("/")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-600">Stage 4</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">SP Approval</h1>
          <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Bill No." value={bill.vendorBillNo} />
            <InfoRow label="Site" value={bill.siteProject} />
            <InfoRow label="Bill Type" value={bill.billType} />
            <InfoRow label="Bill Amount" value={`₹${bill.billAmount}`} />
            <InfoRow label="GST" value={`₹${bill.gst}`} />
            <InfoRow label="TDS" value={`₹${bill.tds}`} />
            <InfoRow label="Final Net Payable" value={`₹${bill.finalNetPayable || bill.netAmount}`} />
            <InfoRow label="Tally Voucher" value={bill.tallyVoucherNo || "—"} />
            <InfoRow label="Verified By" value={bill.verifiedBy || "—"} />
          </div>
          {bill.verificationComments && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Verification Comments</p>
              <p className="text-sm text-gray-700">{bill.verificationComments}</p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Badge label={`Verification: ${bill.verificationStatus || "Pending"}`} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Decision</h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["Approved", "Sent Back", "Held"] as const).map((opt) => {
                const Icon = opt === "Approved" ? CheckCircle2 : opt === "Sent Back" ? XCircle : PauseCircle;
                const color = opt === "Approved" ? "border-green-500 bg-green-50 text-green-700" : opt === "Sent Back" ? "border-red-500 bg-red-50 text-red-700" : "border-orange-500 bg-orange-50 text-orange-700";
                return (
                  <button key={opt} type="button" onClick={() => setValue("spStatus", opt)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${status === opt ? color : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-600 mb-1 block">Approver Name *</label>
              <input {...register("spApprover")} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Comments {status !== "Approved" ? "*" : "(optional)"}</label>
              <textarea {...register("spComments")} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Approval note / reason for send-back…" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className={`w-full py-3 text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 ${
              status === "Approved" ? "bg-green-600 hover:bg-green-700" : status === "Sent Back" ? "bg-red-600 hover:bg-red-700" : "bg-orange-500 hover:bg-orange-600"
            }`}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : `Confirm: ${status}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
