"use client";

const colors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Done: "bg-green-100 text-green-800",
  Approved: "bg-green-100 text-green-800",
  Released: "bg-green-100 text-green-800",
  "On Hold": "bg-orange-100 text-orange-800",
  Held: "bg-orange-100 text-orange-800",
  "Sent Back": "bg-red-100 text-red-800",
  "Approved for Payment": "bg-teal-100 text-teal-800",
  Intake: "bg-gray-100 text-gray-700",
  Verification: "bg-blue-100 text-blue-800",
  Tally: "bg-purple-100 text-purple-800",
  "SP Approval": "bg-orange-100 text-orange-800",
  "MD Approval": "bg-yellow-100 text-yellow-800",
  Payment: "bg-teal-100 text-teal-800",
  "Payment Entry": "bg-indigo-100 text-indigo-800",
  Closed: "bg-green-100 text-green-800",
};

export function Badge({ label }: { label: string }) {
  const cls = colors[label] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
