"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

interface FormData {
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
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { spApprover: "Pallab" },
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
          spStatus: "Approved",
          spApprover: data.spApprover,
          spComments: data.spComments,
          spApprovedOn: new Date().toISOString().split("T")[0],
          currentStage: "MD Approval",
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">Approved</h2>
          <p className="text-gray-500 text-sm mb-6">Bill sent to MD Approval queue</p>
          <button onClick={() => router.push("/")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-orange-600">Stage 4</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">SP Approval</h1>
            <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
          </div>
          <button onClick={() => router.push("/")} className="text-xs text-blue-600 hover:underline mt-1">← Dashboard</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Bill No." value={bill.vendorBillNo} />
            <InfoRow label="Net Payable" value={`₹${bill.finalNetPayable || bill.netAmount}`} />
            <InfoRow label="Site" value={bill.siteProject} />
            <InfoRow label="Verified By" value={bill.verifiedBy || "—"} />
            <InfoRow label="Tally Voucher" value={bill.tallyVoucherNo || "—"} />
          </div>
          {bill.verificationComments && (
            <p className="mt-3 text-xs text-gray-500"><span className="font-medium">Verification notes:</span> {bill.verificationComments}</p>
          )}
          {bill.billPdfLink && (
            <a href={bill.billPdfLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <FileText className="w-3.5 h-3.5" /> View Bill PDF
            </a>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 break-all">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5 space-y-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Approver *</label>
              <input {...register("spApprover", { required: "Required" })}
                className={`${inp} ${errors.spApprover ? "border-red-400 bg-red-50" : ""}`} placeholder="Name" />
              {errors.spApprover && <p className="text-xs text-red-500 mt-0.5">{errors.spApprover.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Comments</label>
              <textarea {...register("spComments")} className={inp} rows={2} placeholder="Optional" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Approve & Send to MD"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function Spinner() {
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
}

function NotFound() {
  return <div className="min-h-screen flex items-center justify-center text-gray-500">Bill not found</div>;
}
