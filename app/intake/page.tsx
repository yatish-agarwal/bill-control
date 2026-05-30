"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, AlertTriangle, Copy } from "lucide-react";

const SITES = [
  "Dhulagarh", "Dhulagarh-ZEPTO", "Dankuni", "HO / Kolkata", "Bhubaneswar",
  "Noida", "Pune", "Detroj", "Kheda", "Taloja", "Vavdi", "CLCC",
];

const BILL_TYPES = [
  "Electricity", "Rent", "Manpower", "Consumables", "Services", "Staff Expenses",
  "Advance against PO/PI", "Purchase against PO", "Repair & Maintenance",
  "IT", "Asset Rental", "Travelling", "Others",
];

const SOURCES = ["Email", "Hard Copy", "Courier", "WhatsApp", "Other"];

const SA_LIST = ["Jyoti", "Arpan", "Jaya", "Souro", "Prantika", "Pronoy"];

// Amount fields are stored as strings but must be valid numbers (no commas/letters).
const money = (required: boolean) =>
  z.string().refine(
    (v) => (v.trim() === "" ? !required : /^\d+(\.\d{1,2})?$/.test(v.trim())),
    required ? "Enter a valid amount" : "Must be a number"
  );

const schema = z.object({
  source: z.string().min(1, "Required"),
  siteProject: z.string().min(1, "Required"),
  vendor: z.string().min(1, "Required"),
  vendorBillNo: z.string().min(1, "Required"),
  billDate: z.string().min(1, "Required"),
  dueDate: z.string(),
  billType: z.string().min(1, "Required"),
  poNumber: z.string(),
  billAmount: money(true),
  gst: money(false),
  tds: money(false),
  netAmount: money(true),
  billPdfLink: z.string(),
  assignedTo: z.string().min(1, "Required"),
  intakeBy: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

// Fields that persist across "Submit & Next" — the data-entry person logs many
// bills for the same site/source in one sitting, so these stay sticky.
const STICKY: (keyof FormData)[] = ["source", "siteProject", "assignedTo", "intakeBy"];

type LoggedBill = { billId: string; vendor: string; isDuplicate: boolean };

export default function IntakePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [logged, setLogged] = useState<LoggedBill[]>([]);
  const [lastDup, setLastDup] = useState<LoggedBill | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, getValues, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { gst: "0", tds: "0" },
    });

  const billAmount = watch("billAmount");
  const gst = watch("gst");
  const tds = watch("tds");

  const save = async (data: FormData): Promise<LoggedBill | null> => {
    setSubmitError(null);
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`);
    return { billId: result.billId, vendor: data.vendor, isDuplicate: !!result.isDuplicate };
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const b = await save(data);
      if (b) setSuccess(b.billId);
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitAndNext = handleSubmit(async (data: FormData) => {
    setSubmitting(true);
    try {
      const b = await save(data);
      if (b) {
        setLogged((prev) => [b, ...prev]);
        setLastDup(b.isDuplicate ? b : null);
        // Preserve sticky fields, clear the rest for the next bill.
        const keep = STICKY.reduce<Partial<FormData>>((acc, k) => {
          acc[k] = getValues(k);
          return acc;
        }, {});
        reset({ gst: "0", tds: "0", ...keep } as FormData);
      }
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  });

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-sm w-full">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bill Logged</h2>
          <p className="text-gray-500 mb-1">Bill ID</p>
          <p className="text-2xl font-mono font-bold text-blue-700 mb-6">{success}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(null); reset({ gst: "0", tds: "0" }); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Log Another
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Stage 1</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Bill Intake</h1>
            <p className="text-sm text-gray-500 mt-1">Log every new bill within 24 hours of receipt</p>
          </div>
          <button onClick={() => router.push("/")} className="text-xs text-blue-600 hover:underline mt-1">
            ← Dashboard
          </button>
        </div>

        {logged.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Logged this session ({logged.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {logged.map((b) => (
                <span key={b.billId}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono ${b.isDuplicate ? "bg-rose-100 text-rose-700" : "bg-green-100 text-green-700"}`}>
                  {b.billId}
                  {b.isDuplicate && <Copy className="w-3 h-3" />}
                </span>
              ))}
            </div>
          </div>
        )}

        {lastDup && (
          <div className="mb-4 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
            <Copy className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">Possible duplicate — {lastDup.billId} saved anyway</p>
              <p className="text-xs text-rose-500 mt-0.5">
                A bill with the same vendor + vendor bill no. already exists. It was logged and flagged for review.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Submit failed</p>
              <p className="text-xs text-red-500 mt-0.5 break-all">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Bill Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Bill Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vendor *" error={errors.vendor?.message}>
                <input {...register("vendor")} className={inp(errors.vendor)} placeholder="Vendor name" />
              </Field>
              <Field label="Vendor Bill No. *" error={errors.vendorBillNo?.message}>
                <input {...register("vendorBillNo")} className={inp(errors.vendorBillNo)} placeholder="Invoice #" />
              </Field>
              <Field label="Bill Date *" error={errors.billDate?.message}>
                <input type="date" {...register("billDate")} className={inp(errors.billDate)} />
              </Field>
              <Field label="Due Date" error={errors.dueDate?.message}>
                <input type="date" {...register("dueDate")} className={inp()} />
              </Field>
              <Field label="Bill Type *" error={errors.billType?.message}>
                <select {...register("billType")} className={inp(errors.billType)}>
                  <option value="">Select…</option>
                  {BILL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="PO / PI Number" error={errors.poNumber?.message}>
                <input {...register("poNumber")} className={inp()} placeholder="If applicable" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bill PDF Link" error={errors.billPdfLink?.message}>
                  <input {...register("billPdfLink")} className={inp()} placeholder="Paste Drive / cloud link to the bill PDF" />
                </Field>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Amounts (₹)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Bill Amount *" error={errors.billAmount?.message}>
                <input {...register("billAmount")} className={inp(errors.billAmount)} placeholder="0" inputMode="decimal" />
              </Field>
              <Field label="GST" error={errors.gst?.message}>
                <input {...register("gst")} className={inp()} placeholder="0" inputMode="decimal" />
              </Field>
              <Field label="TDS" error={errors.tds?.message}>
                <input {...register("tds")} className={inp()} placeholder="0" inputMode="decimal" />
              </Field>
              <Field label="Net Amount *" error={errors.netAmount?.message}>
                <input {...register("netAmount")} className={inp(errors.netAmount)} placeholder="0" inputMode="decimal" />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => {
                const net = (
                  parseFloat(billAmount || "0") +
                  parseFloat(gst || "0") -
                  parseFloat(tds || "0")
                ).toFixed(2);
                setValue("netAmount", net);
              }}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Auto-calculate net (Bill + GST − TDS)
            </button>
          </div>

          {/* Routing — sticky fields */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Routing</h2>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Stays filled for next bill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Source *" error={errors.source?.message}>
                <select {...register("source")} className={inp(errors.source)}>
                  <option value="">Select…</option>
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Site / Project *" error={errors.siteProject?.message}>
                <select {...register("siteProject")} className={inp(errors.siteProject)}>
                  <option value="">Select…</option>
                  {SITES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Assign To (SA) *" error={errors.assignedTo?.message}>
                <select {...register("assignedTo")} className={inp(errors.assignedTo)}>
                  <option value="">Select…</option>
                  {SA_LIST.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Intake By *" error={errors.intakeBy?.message}>
                <input {...register("intakeBy")} className={inp(errors.intakeBy)} placeholder="Your name" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSubmitAndNext}
              disabled={submitting}
              className="flex-1 py-3 bg-white border-2 border-blue-600 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & Next"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Submit & Finish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inp(err?: any) {
  return `w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
    err ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
  }`;
}
