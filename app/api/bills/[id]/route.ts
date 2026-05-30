import { NextResponse } from "next/server";
import { getBillById, updateBillFields } from "@/lib/sheets";
import { BillStage } from "@/lib/types";

// Workflow order — a bill may stay or move forward, never backward.
const STAGE_ORDER: BillStage[] = [
  "Intake", "Verification", "Tally", "SP Approval",
  "MD Approval", "Payment", "Payment Entry", "Closed",
];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bill = await getBillById(id);
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bill);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bill = await getBillById(id);
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const fields = await req.json();

    // Reject backward stage transitions (stale tab, direct-URL re-submit of an
    // already-advanced bill). Field edits are still allowed; only regression is blocked.
    if (fields.currentStage) {
      const from = STAGE_ORDER.indexOf(bill.currentStage);
      const to = STAGE_ORDER.indexOf(fields.currentStage as BillStage);
      if (to !== -1 && from !== -1 && to < from) {
        return NextResponse.json(
          { error: `Bill is already at "${bill.currentStage}" — cannot move back to "${fields.currentStage}".` },
          { status: 409 }
        );
      }
    }

    await updateBillFields(bill.rowIndex, fields);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
