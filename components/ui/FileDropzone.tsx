"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, X } from "lucide-react";

interface Props {
  label: string;
  accept?: Record<string, string[]>;
  file: File | null;
  onChange: (f: File | null) => void;
}

export function FileDropzone({ label, accept, file, onChange }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) onChange(accepted[0]); },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ?? { "application/pdf": [], "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
  });

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      {file ? (
        <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
          <FileText className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
          <button onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {isDragActive ? "Drop it here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WEBP</p>
        </div>
      )}
    </div>
  );
}
