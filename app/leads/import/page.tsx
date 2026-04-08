"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Row = Record<string, any>;

function norm(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cleanText(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cleanDoc(v: any) {
  const s = cleanText(v);
  return s.replace(/\.0$/, "").replace(/\s+/g, "");
}

function cleanPhone(v: any) {
  const s = cleanText(v);
  return s.replace(/[^\d+]/g, "");
}

function pickKey(sample: Row, includesAny: string[]) {
  const keys = Object.keys(sample || {});
  for (const k of keys) {
    const nk = norm(k);
    if (includesAny.some((t) => nk.includes(t))) return k;
  }
  return null;
}

export default function ImportLeadsPage() {
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg("");
    setPreview([]);

    const file = e.target.files?.[0];
    if (!file) return;

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // raw:false ayuda a que los valores se lean como texto “visible”
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });

    if (!rows.length) {
      setMsg("El archivo está vacío o no pude leerlo.");
      return;
    }

    // Toma una fila “real” (en tu excel hay filas vacías y una fila "Filtro")
    const sample =
      rows.find((r) => Object.keys(r).length >= 8 && (r["Empresa"] || r["RUC"] || r["Contacto"])) ?? rows[0];

    // Detecta columnas aunque tengan espacios / tildes / typos
    const kFecha = pickKey(sample, ["fecha"]);
    const kHora = pickKey(sample, ["hora"]);
    const kEmpresa = pickKey(sample, ["empresa"]);
    const kRuc = pickKey(sample, ["ruc"]);
    const kNombreContacto = pickKey(sample, ["nombre del contacto", "nombre contacto"]);
    const kContacto = pickKey(sample, ["contacto"]); // <- celular
    const kCorreo = pickKey(sample, ["correo", "email"]);
    const kAsignado = pickKey(sample, ["asig", "asign"]); // cubre "Asigando"
    const kMedio = pickKey(sample, ["medio de contacto", "medio contacto"]);
    const kProducto = pickKey(sample, ["producto"]);
    const kEtapa = pickKey(sample, ["hasta donde", "proceso de venta", "etapas"]);
    const kDetalle = pickKey(sample, ["que dijo", "detalles"]);

    // Estas vienen como "Unnamed: 11" ... etc (en tu archivo son 11..17)
    const kU11 = pickKey(sample, ["unnamed: 11"]);
    const kU12 = pickKey(sample, ["unnamed: 12"]);
    const kU13 = pickKey(sample, ["unnamed: 13"]);
    const kU14 = pickKey(sample, ["unnamed: 14"]);
    const kU15 = pickKey(sample, ["unnamed: 15"]);
    const kU16 = pickKey(sample, ["unnamed: 16"]);
    const kU17 = pickKey(sample, ["unnamed: 17"]);

    const mapped = rows
      .map((r) => {
        const empresa = cleanText(kEmpresa ? r[kEmpresa] : "");
        if (norm(empresa) === "filtro") return null; // salta fila filtro
        if (!empresa && !cleanText(kRuc ? r[kRuc] : "") && !cleanText(kContacto ? r[kContacto] : "")) return null;

        return {
          fecha: cleanText(kFecha ? r[kFecha] : "") || null,
          hora: cleanText(kHora ? r[kHora] : "") || null,

          empresa: empresa || null,
          ruc: cleanDoc(kRuc ? r[kRuc] : "") || null,
          nombre_contacto: cleanText(kNombreContacto ? r[kNombreContacto] : "") || null,

          // ✅ AQUÍ se guarda el celular REAL
          contacto: cleanPhone(kContacto ? r[kContacto] : "") || null,

          correo: cleanText(kCorreo ? r[kCorreo] : "") || null,
          asignado: cleanText(kAsignado ? r[kAsignado] : "") || null,
          medio_contacto: cleanText(kMedio ? r[kMedio] : "") || null,
          producto: cleanText(kProducto ? r[kProducto] : "") || null,

          etapa_actual: cleanText(kEtapa ? r[kEtapa] : "") || null,
          detalle: cleanText(kDetalle ? r[kDetalle] : "") || null,

          // pasos (vienen como x / ✔ / vacío)
          solicitud_datos: cleanText(kU11 ? r[kU11] : "") || null,
          envio_proforma: cleanText(kU12 ? r[kU12] : "") || null,
          demostracion: cleanText(kU13 ? r[kU13] : "") || null,
          contacto_cierre: cleanText(kU14 ? r[kU14] : "") || null,
          vendido: cleanText(kU15 ? r[kU15] : "") || null,
          post_venta: cleanText(kU16 ? r[kU16] : "") || null,
          perdida: cleanText(kU17 ? r[kU17] : "") || null,
        };
      })
      .filter(Boolean) as any[];

    if (!mapped.length) {
      setMsg("No encontré filas válidas para importar.");
      return;
    }

    setPreview(mapped.slice(0, 10));

    // Insert por lotes
    let inserted = 0;
    const batchSize = 300;

    for (let i = 0; i < mapped.length; i += batchSize) {
      const chunk = mapped.slice(i, i + batchSize);
      const { error } = await supabase.from("leads").insert(chunk);
      if (error) {
        setMsg("Error importando: " + error.message);
        return;
      }
      inserted += chunk.length;
    }

    setMsg(`✅ Importación lista. Prospectos insertados: ${inserted}`);
    setTimeout(() => router.push("/leads"), 1200);
  }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h1>Importar Prospectos (Leads) desde Excel</h1>

      <input type="file" accept=".xls,.xlsx" onChange={handleFile} />

      {msg && <div style={{ marginTop: 12 }}>{msg}</div>}

      {!!preview.length && (
        <div style={{ marginTop: 16 }}>
          <h3>Vista previa (primeras 10 filas)</h3>
          <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}