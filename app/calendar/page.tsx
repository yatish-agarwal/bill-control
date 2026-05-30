"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Loader2, Plus, RefreshCw, AlertTriangle, X, CalendarDays } from "lucide-react";

interface CalRow {
  rowIndex: number;
  vendor: string;
  site: string;
  billType: string;
  frequency: string;
  agreedAmount: string;
  months: string[];
}
interface CalData {
  months: string[];
  rows: CalRow[];
}

const SITES = [
  "Dhulagarh", "Dhulagarh-ZEPTO", "Dankuni", "HO / Kolkata", "Bhubaneswar",
  "Noida", "Pune", "Detroj", "Kheda", "Taloja", "Vavdi", "CLCC",
];
const BILL_TYPES = [
  "Electricity", "Rent", "Manpower", "Consumables", "Services", "Staff Expenses",
  "Advance against PO/PI", "Purchase against PO", "Repair & Maintenance",
  "IT", "Asset Rental", "Travelling", "Others",
];
const FREQUENCIES = ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "One-Time"];

// Click a cell to cycle through these. Manual tracking — nothing auto-marks.
const CYCLE = ["", "Expected", "Received", "Paid", "N/A"];
const CELL_STYLE: Record<string, string> = {
  "": "bg-white text-gray-300 hover:bg-gray-50",
  Expected: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  Received: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  Paid: "bg-green-100 text-green-800 hover:bg-green-200",
  "N/A": "bg-gray-100 text-gray-400 hover:bg-gray-200",
};
const CELL_LABEL: Record<string, string> = {
  "": "—", Expected: "Exp", Received: "Rcvd", Paid: "Paid", "N/A": "N/A",
};

interface AddForm {
  vendor: string; site: string; billType: string; frequency: string; agreedAmount: string;
}

export default function CalendarPage() {
  const [data, setData] = useState<CalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // "rowIndex:monthIndex" being saved
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddForm>({
    defaultValues: { frequency: "Monthly" },
  });

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setData(d);
        else { setData(null); setError(d?.error || "Failed to load calendar"); }
        setLoading(false);
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const cycleCell = async (row: CalRow, monthIndex: number) => {
    if (!data) return;
    const current = row.months[monthIndex] ?? "";
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    const key = `${row.rowIndex}:${monthIndex}`;
    setSaving(key);

    // optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) =>
        r.rowIndex === row.rowIndex
          ? { ...r, months: r.months.map((m, i) => (i === monthIndex ? next : m)) }
          : r
      );
      return { ...prev, rows };
    });

    try {
      const res = await fetch("/api/calendar/cell", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: row.rowIndex, monthIndex, status: next }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`);
    } catch (e) {
      setError(String(e));
      load(); // revert to server truth on failure
    } finally {
      setSaving(null);
    }
  };

  const onAdd = async (form: AddForm) => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`);
      reset({ frequency: "Monthly", vendor: "", site: "", billType: "", agreedAmount: "" });
      setShowAdd(false);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bill Calendar</h1>
            <p className="text-xs text-gray-500 mt-0.5">Recurring bills tracker — click a month to mark Expected / Received / Paid</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">← Dashboard</Link>
          <button onClick={load} aria-label="Refresh calendar" title="Refresh"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add Recurring Bill
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 break-all">{error}</p>
          </div>
        )}

        {/* legend */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          {(["Expected", "Received", "Paid", "N/A"] as const).map((s) => (
            <span key={s} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${CELL_STYLE[s]}`}>
              {CELL_LABEL[s]} <span className="text-gray-500">= {s}</span>
            </span>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No recurring bills set up yet</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-indigo-600 hover:underline">
                Add the first recurring bill →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-3 text-left font-medium sticky left-0 bg-gray-50 z-10">Vendor</th>
                    <th className="px-3 py-3 text-left font-medium">Site</th>
                    <th className="px-3 py-3 text-left font-medium">Type</th>
                    <th className="px-3 py-3 text-left font-medium">Freq</th>
                    <th className="px-3 py-3 text-right font-medium">Agreed ₹</th>
                    {data.months.map((m) => (
                      <th key={m} className="px-2 py-3 text-center font-medium whitespace-nowrap">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((row) => (
                    <tr key={row.rowIndex} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white z-10">{row.vendor}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.site}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.billType}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{row.frequency}</td>
                      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{row.agreedAmount || "—"}</td>
                      {data.months.map((_, mi) => {
                        const status = row.months[mi] ?? "";
                        const key = `${row.rowIndex}:${mi}`;
                        return (
                          <td key={mi} className="px-1 py-1 text-center">
                            <button
                              onClick={() => cycleCell(row, mi)}
                              disabled={saving === key}
                              title="Click to change status"
                              className={`w-14 py-1 rounded text-xs font-medium transition-colors ${CELL_STYLE[status] ?? CELL_STYLE[""]} disabled:opacity-50`}
                            >
                              {saving === key ? "…" : (CELL_LABEL[status] ?? status)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {data ? `${data.rows.length} recurring bill${data.rows.length === 1 ? "" : "s"} · ${data.months.length} months` : ""}
        </p>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Add Recurring Bill</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Vendor *</label>
                <input {...register("vendor", { required: "Required" })}
                  className={`${inp} ${errors.vendor ? "border-red-400 bg-red-50" : ""}`} placeholder="Vendor name" />
                {errors.vendor && <p className="text-xs text-red-500 mt-0.5">{errors.vendor.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Site *</label>
                  <select {...register("site", { required: "Required" })}
                    className={`${inp} ${errors.site ? "border-red-400 bg-red-50" : ""}`}>
                    <option value="">Select…</option>
                    {SITES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {errors.site && <p className="text-xs text-red-500 mt-0.5">{errors.site.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Bill Type *</label>
                  <select {...register("billType", { required: "Required" })}
                    className={`${inp} ${errors.billType ? "border-red-400 bg-red-50" : ""}`}>
                    <option value="">Select…</option>
                    {BILL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  {errors.billType && <p className="text-xs text-red-500 mt-0.5">{errors.billType.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Frequency</label>
                  <select {...register("frequency")} className={inp}>
                    {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Agreed Amount (₹)</label>
                  <input {...register("agreedAmount")} className={inp} placeholder="Optional" inputMode="decimal" />
                </div>
              </div>
              <button type="submit" disabled={adding}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Add to Calendar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
