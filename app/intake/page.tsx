"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

const SITES = [
  "Dhulagarh", "Dankuni", "HO / Kolkata", "Bhubaneswar", "Noida", "Pune",
  "Detroj", "Kheda", "New Mumbai", "New Ahmedabad", "CLCC",
  "Noida-ZEPTO", "DHLG-ZEPTO", "Kheda-ZEPTO", "Dankuni-ZEPTO",
];

const BILL_TYPES = [
  "WH Electricity", "WH Rent", "Office Rent", "Internet / Telecom",
  "Cloud / Software", "Manpower Services", "Against PO", "Asset Purchase",
  "Advance Payment", "Consumables", "Consulting", "Pest Control", "Other",
];

const SOURCES = ["Email", "Hard Copy", "Courier", "WhatsApp", "Other"];

const SA_LIST = ["Jyoti", "Arpan", "Jaya", "Souro", "Prantika", "Pronoy"];

const schema = z.object({
  source: z.string().min(1, "Required"),
  siteProject: z.string().min(1, "Required"),
  vendor: z.string().min(1, "Required"),
  vendorBillNo: z.string().min(1, "Required"),
  billDate: z.string().min(1, "Required"),
  dueDate: z.string(),
  billType: z.string().min(1, "Required"),
  poNumber: z.string(),
  billAmount: z.string().min(1, "Required"),
  gst: z.string(),
  tds: z.string(),
  netAmount: z.string().min(1, "Required"),
  assignedTo: z.string().min(1, "Required"),
  intakeBy: z.string().min(1, "Required"),
});

type FormData = {
  source: string; siteProject: string; vendor: string; vendorBillNo: string;
  billDate: string; dueDate: string; billType: string; poNumber: string;
  billAmount: string; gst: string; tds: string; netAmount: string;
  assignedTo: string; intakeBy: string;
};

export default function IntakePage() {
  const router = useRouter();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedFields, setParsedFields] = useState<Partial<FormData> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gst: "0", tds: "0" },
  });

  const billAmount = watch("billAmount");
  const gst = watch("gst");
  const tds = watch("tds");

  const handleParseInvoice = useCallback(async () => {
    if (!invoiceFile) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", invoiceFile);
      const res = await fetch("/api/parse-invoice", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedFields(data);
      const fields: (keyof FormData)[] = [
        "vendor", "vendorBillNo", "billDate", "dueDate",
        "billAmount", "gst", "tds", "netAmount", "billType", "poNumber",
      ];
      fields.forEach((f) => { if (data[f]) setValue(f, data[f]); });
    } catch (e) {
      alert("Parse failed: " + String(e));
    } finally {
      setParsing(false);
    }
  }, [invoiceFile, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setSuccess(result.billId);
    } catch (e) {
      alert("Submit failed: " + String(e));
    } finally {
      setSubmitting(false);
    }
  };

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
              onClick={() => { setSuccess(null); setInvoiceFile(null); setParsedFields(null); }}
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
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Stage 1</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Bill Intake</h1>
          <p className="text-sm text-gray-500 mt-1">Log every new bill within 24 hours of receipt</p>
        </div>

        {/* Invoice Upload + Auto-parse */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" /> Invoice Upload &amp; Auto-Fill
          </h2>
          <FileDropzone label="Upload Invoice (PDF / Image)" file={invoiceFile} onChange={setInvoiceFile} />
          {invoiceFile && (
            <button
              type="button"
              onClick={handleParseInvoice}
              disabled={parsing}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {parsing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing invoice…</>
                : <><Sparkles className="w-4 h-4" /> Parse &amp; Auto-fill</>}
            </button>
          )}
          {parsedFields && (
            <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fields auto-filled — review and correct if needed
            </p>
          )}
        </div>

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
              <Field label="PO Number" error={errors.poNumber?.message}>
                <input {...register("poNumber")} className={inp()} placeholder="If applicable" />
              </Field>
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Amounts (₹)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Bill Amount *" error={errors.billAmount?.message}>
                <input {...register("billAmount")} className={inp(errors.billAmount)} placeholder="0" />
              </Field>
              <Field label="GST" error={errors.gst?.message}>
                <input {...register("gst")} className={inp()} placeholder="0" />
              </Field>
              <Field label="TDS" error={errors.tds?.message}>
                <input {...register("tds")} className={inp()} placeholder="0" />
              </Field>
              <Field label="Net Amount *" error={errors.netAmount?.message}>
                <input {...register("netAmount")} className={inp(errors.netAmount)} placeholder="0" />
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
              Auto-calculate net amount
            </button>
          </div>

          {/* Routing */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Routing</h2>
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Submit Bill"}
          </button>
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
