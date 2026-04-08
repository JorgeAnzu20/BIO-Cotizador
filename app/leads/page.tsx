"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Lead = {
  id: number;
  empresa: string | null;
  ruc: string | null;
  nombre_contacto: string | null;
  contacto: string | null;
  correo: string | null;
  vendedor: string | null;
  medio_contacto: string | null;
  producto: string | null;
  created_at?: string;
};

function norm(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("leads")
      .select("id, empresa, ruc, nombre_contacto, contacto, correo, vendedor, medio_contacto, producto, created_at")
      .order("id", { ascending: false });

    if (error) {
      setMsg(error.message);
      return;
    }
    setLeads((data ?? []) as Lead[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = norm(q);
    if (!s) return leads;

    return leads.filter((x) => {
      const empresa = norm(x.empresa);
      const ruc = norm(x.ruc);
      const nombre = norm(x.nombre_contacto);
      const contacto = norm(x.contacto);
      const correo = norm(x.correo);
      const vendedor = norm(x.vendedor);
      const medio = norm(x.medio_contacto);
      const producto = norm(x.producto);

      return (
        empresa.includes(s) ||
        ruc.includes(s) ||
        nombre.includes(s) ||
        contacto.includes(s) ||
        correo.includes(s) ||
        vendedor.includes(s) ||
        medio.includes(s) ||
        producto.includes(s)
      );
    });
  }, [leads, q]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Prospectos (Leads)</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por empresa, RUC, contacto, celular, correo, vendedor, medio o producto..."
          style={{ padding: 8, minWidth: 420 }}
        />

        <Link href="/leads/import">
          <button>Importar Excel</button>
        </Link>

        <button onClick={load}>Recargar</button>
      </div>

      {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div>No hay prospectos.</div>
        ) : (
          filtered.map((x) => (
            <div key={x.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{x.empresa ?? "-"}</div>
              <div style={{ opacity: 0.9, marginTop: 4 }}>
                <b>RUC:</b> {x.ruc ?? "-"} · <b>Contacto:</b> {x.nombre_contacto ?? "-"} · <b>Cel:</b> {x.contacto ?? "-"}
              </div>
              <div style={{ opacity: 0.9, marginTop: 4 }}>
                <b>Correo:</b> {x.correo ?? "-"} · <b>Vendedor:</b> {x.vendedor ?? "-"}
              </div>
              <div style={{ opacity: 0.9, marginTop: 4 }}>
                <b>Medio:</b> {x.medio_contacto ?? "-"} · <b>Producto:</b> {x.producto ?? "-"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}