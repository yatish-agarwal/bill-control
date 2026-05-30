"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Bill } from "@/lib/types";
import { BillHistory } from "@/components/BillHistory";
import { Loader2 } from "lucide-react";

// Read-only view of a bill's complete record — used for Closed bills (and any
// bill anyone wants to inspect without acting on it).
export default function BillViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bills/${id}`)
      .then((r) => r.json())
      .then((b) => { setBill(b && !b.error ? b : null); setLoading(false); })
      .catch(() => { setBill(null); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!bill) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Bill not found</div>;
  }

  const isClosed = bill.currentStage === "Closed";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {isClosed ? "Closed Bill" : "Bill Record"}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{bill.billId}</h1>
            <p className="text-sm text-gray-500 mt-1">{bill.vendor}</p>
          </div>
          <button onClick={() => router.push("/")} className="text-xs text-blue-600 hover:underline mt-1">
            ← Dashboard
          </button>
        </div>

        {isClosed && (
          <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-green-700">✓ This bill is fully processed and paid.</span>
          </div>
        )}

        <BillHistory bill={bill} />
      </div>
    </div>
  );
}
