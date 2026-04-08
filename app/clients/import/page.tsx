"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Mapping = {
  empresa: string;
  ruc: string;
  nombre_contacto: string;
  contacto: string;
  correo: string;
  direccion: string;
};

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

export default function ImportClientsPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");

  // configuración simple: fila encabezado y desde qué fila empiezan los datos
  const [headerRow, setHeaderRow] = useState<number>(1); // 1-based
  const [dataStartRow, setDataStartRow] = useState<number>(2); // 1-based

  const [aoa, setAoa] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const [map, setMap] = useState<Mapping>({
    empresa: "",
    ruc: "",
    nombre_contacto: "",
    contacto: "",
    correo: "",
    direccion: "",
  });

  const options = useMemo(() => ["(No usar)", ...headers], [headers]);

  function idxOfHeader(headerName: string): number {
    if (!headerName || headerName === "(No usar)") return -1;
    const hr = headerRow - 1;
    const headerAoa = aoa[hr] ?? [];
    return headerAoa.findIndex((x: any) => cleanText(x) === headerName);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg("");
    setAoa([]);
    setHeaders([]);
    setFileName("");

    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" }) as any[][];
    setAoa(matrix);

    const hr = headerRow - 1;
    const hdr = (matrix[hr] ?? []).map((x) => cleanText(x)).filter((x) => x.length > 0);
    if (!hdr.length) {
      setMsg("No pude leer encabezados. Ajusta 'Fila encabezado'.");
      return;
    }
    setHeaders(hdr);
  }

  const preview = useMemo(() => {
    if (!aoa.length || !headers.length) return [];
    const hr = headerRow - 1;
    const start = Math.max(dataStartRow - 1, hr + 1);

    const iEmpresa = idxOfHeader(map.empresa);
    const iRuc = idxOfHeader(map.ruc);
    const iNombre = idxOfHeader(map.nombre_contacto);
    const iContacto = idxOfHeader(map.contacto);
    const iCorreo = idxOfHeader(map.correo);
    const iDir = idxOfHeader(map.direccion);

    const out: any[] = [];
    for (let i = start; i < aoa.length && out.length < 10; i++) {
      const r = aoa[i] ?? [];
      const obj = {
        row: i + 1,
        empresa: cleanText(iEmpresa >= 0 ? r[iEmpresa] : ""),
        ruc: cleanDoc(iRuc >= 0 ? r[iRuc] : ""),
        nombre_contacto: cleanText(iNombre >= 0 ? r[iNombre] : ""),
        contacto: cleanPhone(iContacto >= 0 ? r[iContacto] : ""),
        correo: cleanText(iCorreo >= 0 ? r[iCorreo] : ""),
        direccion: cleanText(iDir >= 0 ? r[iDir] : ""),
      };
      if (obj.empresa || obj.ruc || obj.contacto || obj.correo || obj.nombre_contacto) out.push(obj);
    }
    return out;
  }, [aoa, headers, headerRow, dataStartRow, map]);

  async function importNow() {
    setMsg("");

    const { data: au } = await supabase.auth.getUser();
    if (!au.user) {
      router.push("/login");
      return;
    }
    const userId = au.user.id;

    if (!aoa.length || !headers.length) {
      setMsg("Primero sube un Excel.");
      return;
    }
    if (!map.empresa || map.empresa === "(No usar)") {
      setMsg("Selecciona la columna de Empresa (obligatorio).");
      return;
    }

    const hr = headerRow - 1;
    const start = Math.max(dataStartRow - 1, hr + 1);

    const iEmpresa = idxOfHeader(map.empresa);
    const iRuc = idxOfHeader(map.ruc);
    const iNombre = idxOfHeader(map.nombre_contacto);
    const iContacto = idxOfHeader(map.contacto);
    const iCorreo = idxOfHeader(map.correo);
    const iDir = idxOfHeader(map.direccion);

    const payload: any[] = [];

    for (let i = start; i < aoa.length; i++) {
      const r = aoa[i] ?? [];

      const empresa = cleanText(iEmpresa >= 0 ? r[iEmpresa] : "");
      const ruc = cleanDoc(iRuc >= 0 ? r[iRuc] : "");
      const nombre_contacto = cleanText(iNombre >= 0 ? r[iNombre] : "");
      const contacto = cleanPhone(iContacto >= 0 ? r[iContacto] : "");
      const correo = cleanText(iCorreo >= 0 ? r[iCorreo] : "");
      const direccion = cleanText(iDir >= 0 ? r[iDir] : "");

      if (!empresa && !ruc && !contacto && !correo && !nombre_contacto) continue;

      // ✅ Mapeo correcto a tu tabla clients
      payload.push({
        full_name: empresa || "(Sin empresa)",
        document: ruc || null,
        contact_name: nombre_contacto || null,
        phone: contacto || null,
        email: correo || null,
        address: direccion || null,
        created_by: userId,
      });
    }

    if (!payload.length) {
      setMsg("No encontré filas con datos. Revisa filas y mapeo.");
      return;
    }

    // insert por lotes
    let inserted = 0;
    const batchSize = 300;

    for (let i = 0; i < payload.length; i += batchSize) {
      const chunk = payload.slice(i, i + batchSize);
      const { error } = await supabase.from("clients").insert(chunk);
      if (error) {
        setMsg("Error importando: " + error.message);
        return;
      }
      inserted += chunk.length;
    }

    setMsg(`✅ Importación lista. Insertados: ${inserted}`);
    setTimeout(() => router.push("/clients"), 1200);
  }

  return (
    <div style={{ padding: 20, maxWidth: 980 }}>
      <h1>Importar clientes desde Excel (sin borrar nada)</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input type="file" accept=".xls,.xlsx" onChange={onFile} />
        {fileName && <div style={{ opacity: 0.85 }}>Archivo: {fileName}</div>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            Fila encabezado
            <input
              type="number"
              value={headerRow}
              onChange={(e) => setHeaderRow(Number(e.target.value))}
              style={{ marginLeft: 8, width: 90 }}
              min={1}
            />
          </label>

          <label>
            Fila inicio datos
            <input
              type="number"
              value={dataStartRow}
              onChange={(e) => setDataStartRow(Number(e.target.value))}
              style={{ marginLeft: 8, width: 110 }}
              min={1}
            />
          </label>
        </div>

        {!!headers.length && (
          <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Asignar columnas</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                Empresa (obligatorio)
                <select
                  value={map.empresa || "(No usar)"}
                  onChange={(e) => setMap((p) => ({ ...p, empresa: e.target.value === "(No usar)" ? "" : e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                >
                  {options.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label>
                RUC/Cédula
                <select
                  value={map.ruc || "(No usar)"}
                  onChange={(e) => setMap((p) => ({ ...p, ruc: e.target.value === "(No usar)" ? "" : e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                >
                  {options.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label>
                Nombre del contacto
                <select
                  value={map.nombre_contacto || "(No usar)"}
                  onChange={(e) =>
                    setMap((p) => ({ ...p, nombre_contacto: e.target.value === "(No usar)" ? "" : e.target.value }))
                  }
                  style={{ width: "100%", padding: 8 }}
                >
                  {options.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label>
                Contacto / Celular
                <select
                  value={map.contacto || "(No usar)"}
                  onChange={(e) => setMap((p) => ({ ...p, contacto: e.target.value === "(No usar)" ? "" : e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                >
                  {options.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label>
                Correo
                <select
                  value={map.correo || "(No usar)"}
                  onChange={(e) => setMap((p) => ({ ...p, correo: e.target.value === "(No usar)" ? "" : e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                >
                  {options.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label>
                Dirección
                <select
                  value={map.direccion || "(No usar)"}
                  onChange={(e) => setMap((p) => ({ ...p, direccion: e.target.value === "(No usar)" ? "" : e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                >
                  {options.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={importNow}>Importar ahora</button>
            </div>
          </div>
        )}

        {!!preview.length && (
          <div>
            <h3>Vista previa (10 filas)</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        )}

        {msg && <div>{msg}</div>}
      </div>
    </div>
  );
}