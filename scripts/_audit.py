import json, urllib.request
from collections import Counter

d = json.load(urllib.request.urlopen("http://localhost:3000/api/bills"))
ids = [b["billId"] for b in d]
dupes = {k: v for k, v in Counter(ids).items() if v > 1}
real_vendors = Counter(b.get("vendor") for b in d)
summary = {
    "total": len(d),
    "unique_ids": len(set(ids)),
    "duplicate_ids": dupes,
    "id_min": min(ids) if ids else None,
    "id_max": max(ids) if ids else None,
    "vendors": dict(real_vendors),
}
open("/tmp/audit_summary.json", "w").write(json.dumps(summary, indent=2))
