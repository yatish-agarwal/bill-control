"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Loader2, FileText, AlertTriangle } from "lucide-react";

interface FormData {
  vendorLedgerChecked: "Yes" | "No";
  adjustment: string;
  adjustmentRemarks: string;
  finalNetPayable: string;
  supportingDocLink: string;
  verificationComments: string;
  verifiedBy: string;
  verificationStatus: "Done" | "On Hold";
}

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { verificationStatus: "Done", vendorLedgerChecked: "No", adjustment: "0" },
  });

  useEffect(() => {
    fetch(`/api/bills/${id}`)
      .then((r) => r.json())
      .then((b: Bill) => {
        if (!b || (b as { error?: string }).error) { setBill(null); setLoading(false); return; }
        setBill(b);
        setValue("finalNetPayable", b.finalNetPayable || b.netAmount || "");
        if (b.adjustment) setValue("adjustment", b.adjustment);
        if (b.adjustmentRemarks) setValue("adjustmentRemarks", b.adjustmentRemarks);
        if (b.vendorLedgerChecked === "Yes") setValue("vendorLedgerChecked", "Yes");
        if (b.supportingDocLink) setValue("supportingDocLink", b.supportingDocLink);
        if (b.verificationComments) setValue("verificationComments", b.verificationComments);
        if (b.verifiedBy) setValue("verifiedBy", b.verifiedBy);
        setLoading(false);
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [id, setValue]);

  const adjustment = watch("adjustment");

  const recalc = () => {
    if (!bill) return;
    const net = parseFloat(bill.netAmount || "0") - parseFloat(adjustment || "0");
    setValue("finalNetPayable", net.toFixed(2));
  };

  const onSubmit = async (data: FormData) => {
    if (!bill) return;
    setSubmitting(true);
    setError(null);
    try {
      const advance = data.verificationStatus === "Done";
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          verifiedOn: advance ? new Date().toISOString().split("T")[0] : "",
          currentStage: advance ? "Tally" : "Verification",
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`);
      router.push("/");
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!bill) return <NotFound />;

  const status = watch("verificationStatus");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Stage 2</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Verification</h1>
            <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
          </div>
          <button onClick={() => router.push("/")} className="text-xs text-blue-600 hover:underline mt-1">
            ← Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Bill No." value={bill.vendorBillNo} />
            <InfoRow label="Bill Date" value={bill.billDate} />
            <InfoRow label="Bill Type" value={bill.billType} />
            <InfoRow label="PO / PI No." value={bill.poNumber || "—"} />
            <InfoRow label="Net Amount" value={`₹${bill.netAmount}`} />
            <InfoRow label="Site" value={bill.siteProject} />
            <InfoRow label="Due Date" value={bill.dueDate || "—"} />
            <InfoRow label="Status" value={<Badge label={bill.verificationStatus || "Pending"} />} />
          </div>
          {bill.billPdfLink && (
            <div className="mt-3">
              <a href={bill.billPdfLink} target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> View Bill PDF
              </a>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 break-all">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Verification Checklist</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Vendor ledger checked?</p>
                  <p className="text-xs text-gray-400">Confirm against Tally / books before passing</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4"
                    checked={watch("vendorLedgerChecked") === "Yes"}
                    onChange={(e) => setValue("vendorLedgerChecked", e.target.checked ? "Yes" : "No")} />
                  <span className="text-sm text-gray-600">Checked</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Adjustment / Deduction (₹)</label>
                  <input {...register("adjustment")} onBlur={recalc} className={inp} placeholder="0" inputMode="decimal" />
                  <p className="text-xs text-gray-400 mt-1">Advance recovered, short supply, etc.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Final Net Payable (₹) *</label>
                  <input
                    {...register("finalNetPayable", {
                      required: "Required",
                      pattern: { value: /^\d+(\.\d{1,2})?$/, message: "Enter a valid amount" },
                    })}
                    className={`${inp} ${errors.finalNetPayable ? "border-red-400 bg-red-50" : ""}`}
                    placeholder="Confirmed payable" inputMode="decimal"
                  />
                  <button type="button" onClick={recalc} className="mt-1 text-xs text-blue-600 hover:underline">
                    Recalculate (Net − Adjustment)
                  </button>
                  {errors.finalNetPayable && <p className="text-xs text-red-500 mt-0.5">{errors.finalNetPayable.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Adjustment Remarks</label>
                <input {...register("adjustmentRemarks")} className={inp} placeholder="Reason for any difference between net and payable" />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Verified By *</label>
                <input
                  {...register("verifiedBy", { required: "Required" })}
                  className={`${inp} ${errors.verifiedBy ? "border-red-400 bg-red-50" : ""}`}
                  placeholder="Your name"
                />
                {errors.verifiedBy && <p className="text-xs text-red-500 mt-0.5">{errors.verifiedBy.message}</p>}
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Supporting Doc Link</label>
                <input {...register("supportingDocLink")} className={inp} placeholder="Drive link to checklist / supporting docs" />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Comments</label>
                <textarea {...register("verificationComments")} className={inp} rows={3} placeholder="Notes, discrepancies, actions taken…" />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Outcome *</label>
                <select {...register("verificationStatus")} className={inp}>
                  <option value="Done">Done — ready for Tally</option>
                  <option value="On Hold">On Hold — issue found</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 ${
              status === "Done" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : status === "Done" ? "Submit — Move to Tally" : "Submit — Hold for Review"}
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
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function NotFound() {
  return <div className="min-h-screen flex items-center justify-center text-gray-500">Bill not found</div>;
}
