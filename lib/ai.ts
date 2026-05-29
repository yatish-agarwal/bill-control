import OpenAI from "openai";

// OpenRouter — drop-in OpenAI-compatible API with 100+ models
// Default: Gemini 2.0 Flash (fast, cheap, great at document reading)
// Override by setting AI_MODEL env var e.g. "anthropic/claude-3-haiku"
const MODEL = process.env.AI_MODEL ?? "google/gemini-2.0-flash-001";

// Lazy init — only created at request time so build doesn't fail without the key
function getClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    defaultHeaders: {
      "HTTP-Referer": process.env.VERCEL_URL ?? "http://localhost:3000",
      "X-Title": "Bill Control App",
    },
  });
}

// Convert file to OpenRouter vision format
// Both images and PDFs are sent as data URLs — Gemini and most vision models accept both
function toImageUrl(base64: string, mediaType: string): OpenAI.ChatCompletionContentPartImage {
  return {
    type: "image_url",
    image_url: { url: `data:${mediaType};base64,${base64}` },
  };
}

export async function parseInvoice(base64File: string, mediaType: string): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          toImageUrl(base64File, mediaType),
          { type: "text", text: INVOICE_PARSE_PROMPT },
        ],
      },
    ],
  });

  return response.choices[0].message.content ?? "{}";
}

const INVOICE_PARSE_PROMPT = `Extract the following fields from this invoice and return ONLY a valid JSON object with no extra text:
{
  "vendor": "vendor/supplier name",
  "vendorBillNo": "invoice/bill number",
  "billDate": "date of invoice in YYYY-MM-DD format",
  "dueDate": "payment due date in YYYY-MM-DD format, empty string if not found",
  "billAmount": "total amount before GST as a number string",
  "gst": "GST/tax amount as a number string, 0 if none",
  "tds": "TDS amount as a number string, 0 if none",
  "netAmount": "final payable amount as a number string",
  "billType": "one of: Material, Service, Labour, Utility, Rent, Other",
  "poNumber": "PO number if mentioned, else empty string"
}
If a field cannot be determined, use an empty string. Return only the JSON, nothing else.`;

export async function runThreeWayMatch(
  invoiceBase64: string, invoiceType: string,
  poBase64: string, poType: string,
  grnBase64: string, grnType: string,
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Document 1 — INVOICE:" },
          toImageUrl(invoiceBase64, invoiceType),
          { type: "text", text: "Document 2 — PURCHASE ORDER (PO):" },
          toImageUrl(poBase64, poType),
          { type: "text", text: "Document 3 — GOODS RECEIPT NOTE (GRN):" },
          toImageUrl(grnBase64, grnType),
          { type: "text", text: THREE_WAY_MATCH_PROMPT },
        ],
      },
    ],
  });

  return response.choices[0].message.content ?? "{}";
}

const THREE_WAY_MATCH_PROMPT = `Perform a 3-way match between the Invoice, PO, and GRN above.
Return ONLY a valid JSON object with no extra text:
{
  "poVendor": "vendor name on PO",
  "invoiceVendor": "vendor name on invoice",
  "vendorMatch": true/false,
  "poNumber": "PO number on PO",
  "invoicePoNumber": "PO number referenced on invoice",
  "poNumberMatch": true/false,
  "poQty": "quantity on PO",
  "grnQty": "quantity on GRN",
  "invoiceQty": "quantity on invoice",
  "qtyMatch": true/false (all three match),
  "poRate": "unit rate on PO",
  "invoiceRate": "unit rate on invoice",
  "rateMatch": true/false,
  "poAmount": "total amount on PO",
  "invoiceAmount": "total amount on invoice",
  "amountMatch": true/false (within 1 rupee tolerance),
  "gstOnPo": "GST rate/amount on PO",
  "gstOnInvoice": "GST rate/amount on invoice",
  "gstMatch": true/false,
  "overallMatch": true/false (all checks passed),
  "discrepancies": ["list of specific discrepancies, empty array if none"],
  "rawSummary": "2-3 sentence plain English summary of the match result"
}
Be strict: if a field is missing from any document, mark the match false and note it in discrepancies.
Return only the JSON, nothing else.`;
