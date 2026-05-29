"use client";

import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

interface MatchRowProps {
  label: string;
  left: string;
  right: string;
  match: boolean | null;
}

export function MatchRow({ label, left, right, match }: MatchRowProps) {
  const Icon =
    match === null ? MinusCircle : match ? CheckCircle2 : XCircle;
  const color =
    match === null ? "text-gray-400" : match ? "text-green-600" : "text-red-500";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="text-right">
        <span className="text-sm text-gray-600">{left || "—"}</span>
        <p className="text-xs text-gray-400">{label} (Invoice)</p>
      </div>
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <span className="text-sm text-gray-600">{right || "—"}</span>
        <p className="text-xs text-gray-400">{label} (PO/GRN)</p>
      </div>
    </div>
  );
}

interface MatchSummaryProps {
  overallMatch: boolean;
  discrepancies: string[];
  rawSummary: string;
}

export function MatchSummary({ overallMatch, discrepancies, rawSummary }: MatchSummaryProps) {
  return (
    <div className={`rounded-lg p-4 mt-4 ${overallMatch ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        {overallMatch ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span className={`font-semibold text-sm ${overallMatch ? "text-green-700" : "text-red-700"}`}>
          {overallMatch ? "3-Way Match Passed" : "3-Way Match Failed"}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-2">{rawSummary}</p>
      {discrepancies.length > 0 && (
        <ul className="text-sm text-red-700 space-y-1 mt-2">
          {discrepancies.map((d, i) => (
            <li key={i} className="flex gap-2">
              <span>•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
