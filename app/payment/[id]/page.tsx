"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { BillHistory } from "@/components/BillHistory";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface FormData {
  paymentDate: string;
  paidFrom: string;
  utrChequeNo: string;
  releasedBy: string;
}

// Placeholder bank list — replace with the real accounts when provided.
const BANKS = ["HDFC Bank", "ICICI Bank", "Axis Bank", "State Bank of India", "Kotak Mahindra Bank"];

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
      releasedBy: "Tara",
    },
  });

  useEffect(() => {
    fetch(`/api/bills/${id}`)
      .then((r) => r.json())
      .then((b) => { setBill(b && !b.error ? b : null); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [id]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          paymentStatus: "Released",
          currentStage: "Payment Entry",
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`);
      setDone(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!bill) return <NotFound />;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-sm w-full">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Released</h2>
          <p className="text-gray-500 text-sm mb-6">Bill moved to Payment Entry (Tally voucher posting)</p>
          <button onClick={() => router.push("/")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-600">Stage 6</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Payment Release</h1>
            <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
          </div>
          <button onClick={() => router.push("/")} className="text-xs text-blue-600 hover:underline mt-1">← Dashboard</button>
        </div>

        <BillHistory bill={bill} />

        {error && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 break-all">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Payment Date *</label>
                <input type="date" {...register("paymentDate", { required: "Required" })}
                  className={`${inp} ${errors.paymentDate ? "border-red-400 bg-red-50" : ""}`} />
                {errors.paymentDate && <p className="text-xs text-red-500 mt-0.5">{errors.paymentDate.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Paid From (Bank) *</label>
                <input list="bank-list" {...register("paidFrom", { required: "Required" })}
                  className={`${inp} ${errors.paidFrom ? "border-red-400 bg-red-50" : ""}`} placeholder="Select or type bank" />
                <datalist id="bank-list">
                  {BANKS.map((b) => <option key={b} value={b} />)}
                </datalist>
                {errors.paidFrom && <p className="text-xs text-red-500 mt-0.5">{errors.paidFrom.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">UTR / Cheque # *</label>
                <input {...register("utrChequeNo", { required: "Required" })}
                  className={`${inp} ${errors.utrChequeNo ? "border-red-400 bg-red-50" : ""}`} placeholder="Transaction reference" />
                {errors.utrChequeNo && <p className="text-xs text-red-500 mt-0.5">{errors.utrChequeNo.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Released By *</label>
                <input {...register("releasedBy", { required: "Required" })}
                  className={`${inp} ${errors.releasedBy ? "border-red-400 bg-red-50" : ""}`} placeholder="Your name" />
                {errors.releasedBy && <p className="text-xs text-red-500 mt-0.5">{errors.releasedBy.message}</p>}
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Release Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function Spinner() {
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
}

function NotFound() {
  return <div className="min-h-screen flex items-center justify-center text-gray-500">Bill not found</div>;
}
