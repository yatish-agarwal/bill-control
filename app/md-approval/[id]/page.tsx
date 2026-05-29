"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle2, XCircle, PauseCircle } from "lucide-react";

interface FormData {
  mdStatus: "Approved" | "Sent Back" | "Held";
  mdApprover: string;
  mdComments: string;
}

export default function MDApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: { mdStatus: "Approved", mdApprover: "" },
  });
  const status = watch("mdStatus");

  useEffect(() => {
    fetch(`/api/bills/${id}`).then((r) => r.json()).then((b) => { setBill(b); setLoading(false); });
  }, [id]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const nextStage = data.mdStatus === "Approved" ? "Payment" : data.mdStatus === "Sent Back" ? "SP Approval" : "MD Approval";
      await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          mdApprovedOn: new Date().toISOString().split("T")[0],
          currentStage: nextStage,
          paymentStatus: data.mdStatus === "Approved" ? "Pending" : undefined,
        }),
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
          <h2 className="text-xl font-bold mb-2">MD Decision Recorded</h2>
          <p className="text-gray-500 text-sm mb-6">
            {status === "Approved" ? "Bill released to payment queue" : status === "Sent Back" ? "Bill returned to SP" : "Bill held — awaiting more info"}
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
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Stage 5</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">MD Approval</h1>
          <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Site" value={bill.siteProject} />
            <InfoRow label="Bill Amount" value={`₹${bill.billAmount}`} />
            <InfoRow label="GST" value={`₹${bill.gst}`} />
            <InfoRow label="TDS Deduction" value={`₹${bill.tds}`} />
            <InfoRow label="Final Net Payable" value={`₹${bill.finalNetPayable || bill.netAmount}`} />
            <InfoRow label="Tally Voucher" value={bill.tallyVoucherNo || "—"} />
            <InfoRow label="SP Approver" value={bill.spApprover || "—"} />
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Badge label={`Verification: ${bill.verificationStatus}`} />
            <Badge label={`SP: ${bill.spStatus}`} />
          </div>
          {bill.spComments && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">SP Comments</p>
              <p className="text-sm text-gray-700">{bill.spComments}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">MD Decision</h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["Approved", "Sent Back", "Held"] as const).map((opt) => {
                const Icon = opt === "Approved" ? CheckCircle2 : opt === "Sent Back" ? XCircle : PauseCircle;
                const color = opt === "Approved" ? "border-green-500 bg-green-50 text-green-700" : opt === "Sent Back" ? "border-red-500 bg-red-50 text-red-700" : "border-orange-500 bg-orange-50 text-orange-700";
                return (
                  <button key={opt} type="button" onClick={() => setValue("mdStatus", opt)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${status === opt ? color : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-600 mb-1 block">MD Name *</label>
              <input {...register("mdApprover")} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="MD name" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Comments</label>
              <textarea {...register("mdComments")} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Approval note / reason for hold…" />
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
