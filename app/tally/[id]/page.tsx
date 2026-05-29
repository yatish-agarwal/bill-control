"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { Loader2, CheckCircle2 } from "lucide-react";

interface FormData {
  tallyVoucherNo: string;
  tallyEntryDate: string;
}

export default function TallyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { tallyEntryDate: new Date().toISOString().split("T")[0] },
  });

  useEffect(() => {
    fetch(`/api/bills/${id}`).then((r) => r.json()).then((b) => { setBill(b); setLoading(false); });
  }, [id]);

  const onSubmit = async (data: FormData) => {
    if (!bill) return;
    setSubmitting(true);
    try {
      await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, currentStage: "SP Approval" }),
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
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-sm w-full">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Tally Entry Recorded</h2>
          <p className="text-gray-500 text-sm mb-6">Bill moved to SP Approval queue</p>
          <button onClick={() => router.push("/")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">Stage 3</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Tally Entry</h1>
          <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor} · ₹{bill.finalNetPayable || bill.netAmount}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Bill No." value={bill.vendorBillNo} />
            <InfoRow label="Net Payable" value={`₹${bill.finalNetPayable || bill.netAmount}`} />
            <InfoRow label="Verified By" value={bill.verifiedBy || "—"} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Tally Voucher Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Tally Voucher # *</label>
                <input {...register("tallyVoucherNo", { required: "Required" })}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${errors.tallyVoucherNo ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                  placeholder="VCH-0001" />
                {errors.tallyVoucherNo && <p className="text-xs text-red-500 mt-0.5">{errors.tallyVoucherNo.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Entry Date *</label>
                <input type="date" {...register("tallyEntryDate", { required: "Required" })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Record & Move to SP Approval"}
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
