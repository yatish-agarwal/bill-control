"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { Loader2, CheckCircle2 } from "lucide-react";

interface FormData {
  paymentStatus: "Released" | "Held";
  paymentDate: string;
  utrChequeNo: string;
  releasedBy: string;
}

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      paymentStatus: "Released",
      paymentDate: new Date().toISOString().split("T")[0],
      releasedBy: "Tara",
    },
  });
  const status = watch("paymentStatus");

  useEffect(() => {
    fetch(`/api/bills/${id}`).then((r) => r.json()).then((b) => { setBill(b); setLoading(false); });
  }, [id]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          currentStage: data.paymentStatus === "Released" ? "Closed" : "Payment",
          paymentAdviceSent: data.paymentStatus === "Released" ? "Yes" : "No",
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
          <h2 className="text-xl font-bold mb-2">{status === "Released" ? "Payment Released" : "Payment Held"}</h2>
          <p className="text-gray-500 text-sm mb-6">
            {status === "Released" ? "Bill closed. Payment advice sent to vendor." : "Bill held in payment queue."}
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
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-600">Stage 6</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Payment Release</h1>
          <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Vendor Bill No." value={bill.vendorBillNo} />
            <InfoRow label="Site" value={bill.siteProject} />
            <InfoRow label="Bill Date" value={bill.billDate} />
            <InfoRow label="Due Date" value={bill.dueDate || "—"} />
            <InfoRow label="Net Payable" value={`₹${bill.finalNetPayable || bill.netAmount}`} />
            <InfoRow label="Tally Voucher" value={bill.tallyVoucherNo || "—"} />
            <InfoRow label="MD Approver" value={bill.mdApprover || "—"} />
          </div>
          {bill.mdComments && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">MD Comments</p>
              <p className="text-sm text-gray-700">{bill.mdComments}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Details</h2>

            <div className="flex gap-3 mb-5">
              {(["Released", "Held"] as const).map((opt) => (
                <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  status === opt
                    ? opt === "Released" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 text-gray-500"
                }`}>
                  <input type="radio" value={opt} {...register("paymentStatus")} className="sr-only" />
                  <span className="text-sm font-semibold">{opt}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Payment Date</label>
                <input type="date" {...register("paymentDate")} className={inp} />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">UTR / Cheque # {status === "Released" ? "*" : ""}</label>
                <input {...register("utrChequeNo")} className={inp} placeholder="UTR number or cheque #" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600 mb-1 block">Released By</label>
                <input {...register("releasedBy")} className={inp} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className={`w-full py-3 text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 ${
              status === "Released" ? "bg-teal-600 hover:bg-teal-700" : "bg-orange-500 hover:bg-orange-600"
            }`}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : status === "Released" ? "Release Payment" : "Hold Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
