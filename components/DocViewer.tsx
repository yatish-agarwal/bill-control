"use client";

import { useState } from "react";
import { FileText, X, ExternalLink, AlertTriangle } from "lucide-react";

// Turn common share links into an embeddable preview URL.
// - Google Drive file links → /preview (renders in an iframe)
// - Google Docs/Sheets/Slides → /preview
// - Anything else → returned as-is (iframe may be blocked; we offer a new-tab fallback)
function toEmbedUrl(raw: string): string {
  const url = raw.trim();
  // Drive file: https://drive.google.com/file/d/<ID>/view?... → /preview
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  // Drive open?id=<ID>
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) return `https://drive.google.com/file/d/${driveOpen[1]}/preview`;
  // Google Docs editors → /preview
  const gdoc = url.match(/(docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[^/]+)/);
  if (gdoc) return `https://${gdoc[1]}/preview`;
  return url;
}

// A clickable chip that opens the document in an in-app popup viewer.
export function DocLink({ label, url }: { label: string; url: string }) {
  const [open, setOpen] = useState(false);
  if (!url || !url.trim()) return null;
  const embed = toEmbedUrl(url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        <FileText className="w-3.5 h-3.5" /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-800 truncate">{label}</h3>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                </a>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-gray-100">
              <iframe
                src={embed}
                title={label}
                className="w-full h-full"
                allow="autoplay"
              />
              {/* Fallback notice for links that refuse to embed (X-Frame-Options) */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 border border-gray-200 rounded-full px-3 py-1.5 shadow text-[11px] text-gray-500">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                If the preview is blank,{" "}
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  open in a new tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
