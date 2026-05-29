"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Bill, ThreeWayMatchResult } from "@/lib/types";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Badge } from "@/components/ui/Badge";
import { MatchRow, MatchSummary } from "@/components/ui/MatchIndicator";
import { Loader2, Zap, AlertCircle, FileText } from "lucide-react";

interface FormData {
  verificationStatus: "Done" | "On Hold";
  verifiedBy: string;
  verificationComments: string;
  supportingDocLink: string;
  finalNetPayable: string;
}

const THREE_WAY_TYPES = new Set(["Against PO", "Asset Purchase"]);

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 3-way match state (optional — only relevant for Against PO / Asset Purchase)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [poFile, setPoFile] = useState<File | null>(null);
  const [grnFile, setGrnFile] = useState<File | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<ThreeWayMatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { verificationStatus: "Done" },
  });

  useEffect(() => {
    fetch(`/api/bills/${id}`)
      .then((r) => r.json())
      .then((b: Bill) => {
        setBill(b);
        // Pre-fill finalNetPayable from netAmount
        setValue("finalNetPayable", b.netAmount || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, setValue]);

  const runMatch = async () => {
    if (!invoiceFile || !poFile || !grnFile) return;
    setMatching(true);
    setMatchError(null);
    setMatchResult(null);
    try {
      const fd = new FormData();
      fd.append("invoice", invoiceFile);
      fd.append("po", poFile);
      fd.append("grn", grnFile);
      const res = await fetch("/api/three-way-match", { method: "POST", body: fd });
      const data: ThreeWayMatchResult = await res.json();
      if ("error" in data) throw new Error(String((data as { error: string }).error));
      setMatchResult(data);
      // Auto-fill comments with match summary for convenience
      const summary = data.overallMatch
        ? "3-way match passed."
        : `3-way match issues: ${data.discrepancies.join("; ")}`;
      setValue("verificationComments", summary);
    } catch (e) {
      setMatchError(String(e));
    } finally {
      setMatching(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!bill) return;
    setSubmitting(true);
    try {
      await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          verifiedOn: new Date().toISOString().split("T")[0],
          currentStage: data.verificationStatus === "Done" ? "Tally" : "Verification",
        }),
      });
      router.push("/");
    } catch (e) {
      alert("Error: " + String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!bill) return <NotFound />;

  const showThreeWay = THREE_WAY_TYPES.has(bill.billType);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Stage 2</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Verification</h1>
          <p className="text-sm text-gray-500 mt-1">{bill.billId} · {bill.vendor}</p>
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <InfoRow label="Vendor" value={bill.vendor} />
            <InfoRow label="Bill No." value={bill.vendorBillNo} />
            <InfoRow label="Bill Date" value={bill.billDate} />
            <InfoRow label="Bill Type" value={bill.billType} />
            <InfoRow label="PO No." value={bill.poNumber || "—"} />
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

        {/* 3-Way Match — only shown for Against PO and Asset Purchase */}
        {showThreeWay && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> 3-Way Match (Invoice × PO × GRN)
            </h2>
            <p className="text-xs text-gray-400 mb-4">Upload all three documents to run AI-assisted comparison.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <FileDropzone label="Invoice" file={invoiceFile} onChange={setInvoiceFile} />
              <FileDropzone label="Purchase Order (PO)" file={poFile} onChange={setPoFile} />
              <FileDropzone label="GRN" file={grnFile} onChange={setGrnFile} />
            </div>
            <button
              type="button"
              onClick={runMatch}
              disabled={!invoiceFile || !poFile || !grnFile || matching}
              className="w-full py-2.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {matching
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Running match…</>
                : <><Zap className="w-4 h-4" /> Run 3-Way Match</>}
            </button>
            {matchError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {matchError}
              </div>
            )}
            {matchResult && (
              <div className="mt-4">
                <div className="divide-y divide-gray-100 bg-gray-50 rounded-xl p-4">
                  <MatchRow label="Vendor" left={matchResult.invoiceVendor} right={matchResult.poVendor} match={matchResult.vendorMatch} />
                  <MatchRow label="PO Number" left={matchResult.invoicePoNumber} right={matchResult.poNumber} match={matchResult.poNumberMatch} />
                  <MatchRow label="Quantity" left={matchResult.invoiceQty} right={`PO: ${matchResult.poQty}  GRN: ${matchResult.grnQty}`} match={matchResult.qtyMatch} />
                  <MatchRow label="Rate" left={matchResult.invoiceRate} right={matchResult.poRate} match={matchResult.rateMatch} />
                  <MatchRow label="Amount" left={matchResult.invoiceAmount} right={matchResult.poAmount} match={matchResult.amountMatch} />
                  <MatchRow label="GST" left={matchResult.gstOnInvoice} right={matchResult.gstOnPo} match={matchResult.gstMatch} />
                </div>
                <MatchSummary overallMatch={matchResult.overallMatch} discrepancies={matchResult.discrepancies} rawSummary={matchResult.rawSummary} />
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Verification */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Verification</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Final Net Payable (₹) *</label>
                  <input
                    {...register("finalNetPayable", { required: "Required" })}
                    className={`${inp} ${errors.finalNetPayable ? "border-red-400 bg-red-50" : ""}`}
                    placeholder="Confirmed payable amount"
                  />
                  {errors.finalNetPayable && <p className="text-xs text-red-500 mt-0.5">{errors.finalNetPayable.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Outcome *</label>
                  <select {...register("verificationStatus")} className={inp}>
                    <option value="Done">Done — ready for Tally</option>
                    <option value="On Hold">On Hold — issue found</option>
                  </select>
                </div>
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
                <label className="text-xs text-gray-600 mb-1 block">Comments</label>
                <textarea
                  {...register("verificationComments")}
                  className={inp}
                  rows={3}
                  placeholder="Notes, discrepancies, actions taken…"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Supporting Doc Link</label>
                <input
                  {...register("supportingDocLink")}
                  className={inp}
                  placeholder="Google Drive link to scanned checklist / supporting document"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Fill in printed checklist, scan/photo it, upload to Drive, paste link here.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 ${
              watch("verificationStatus") === "Done"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : watch("verificationStatus") === "Done"
                ? "Submit — Move to Tally"
                : "Submit — Hold for Review"}
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
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">Bill not found</div>
  );
}
