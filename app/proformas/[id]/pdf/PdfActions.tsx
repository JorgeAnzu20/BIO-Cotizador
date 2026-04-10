"use client";

import { useRouter } from "next/navigation";

export default function PdfActions() {
  const router = useRouter();

  return (
    <div
      className="no-print"
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        ← Volver
      </button>

      <button
        onClick={() => window.print()}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "none",
          background: "#22d3ee",
          cursor: "pointer",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        Descargar PDF
      </button>
    </div>
  );
}
