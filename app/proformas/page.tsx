"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Row = {
  id: number;
  number: number;
  total: number;
  created_at: string;
  venta_confirmada: boolean;
  seller_id: string | null;
  clients: { full_name: string } | null;
};

function money(n: number | null | undefined) {
  return Number(n ?? 0).toFixed(2);
}

function getMonthValue(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonthValue(value: string) {
  const [year, month] = value.split("-");
  if (!year || !month) return "";
  if (year.length !== 4 || month.length !== 2) return "";
  return `${year}-${month}`;
}

const COLORS = {
  dark: "#0D0D0D",
  text: "#1F2937",
  white: "#FFFFFF",
  bone: "#F5F5F0",
  grayBg: "#E5E7EB",
  grayBorder: "#E5E7EB",
  blue: "#05AFF2",
  cyan: "#05DBF2",
  aqua: "#05F2F2",
  danger: "#ff5a5a",
};

export default function ProformasPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [monthFromMonth, setMonthFromMonth] = useState("");
  const [monthFromYear, setMonthFromYear] = useState("");

  const [monthToMonth, setMonthToMonth] = useState("");
  const [monthToYear, setMonthToYear] = useState("");

  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const yearOptions = Array.from({ length: 65 }, (_, i) => String(2026 + i));
  const monthOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const monthFrom =
    monthFromYear && monthFromMonth ? `${monthFromYear}-${monthFromMonth}` : "";

  const monthTo =
    monthToYear && monthToMonth ? `${monthToYear}-${monthToMonth}` : "";

  async function load() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/login");
      return;
    }

    let query = supabase
      .from("proformas")
      .select("id, number, total, created_at, venta_confirmada, seller_id, clients(full_name)")
      .order("id", { ascending: false });

    const { data } = await query;

    const normalizedRows: Row[] = (data ?? []).map((row: any) => ({
      ...row,
      clients: Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients,
    }));

    setRows(normalizedRows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let data = [...rows];

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((p) => {
        return (
          String(p.number).toLowerCase().includes(q) ||
          String(p.clients?.full_name ?? "").toLowerCase().includes(q)
        );
      });
    }

    return data;
  }, [rows, search]);

  async function deleteProforma(id: number) {
    if (!confirm("Eliminar proforma?")) return;
    await supabase.from("proformas").delete().eq("id", id);
    load();
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "290px 1fr",
          gap: 20,
        }}
      >
        {/* SIDEBAR */}
        <div style={{ background: COLORS.blue, padding: 16, borderRadius: 20 }}>
          <Link href="/">Volver</Link>
        </div>

        {/* CONTENIDO */}
        <div style={{ display: "grid", gap: 20 }}>
          {/* BUSCADOR */}
          <input
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
            }}
          />

          {/* LISTA */}
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                background: COLORS.bone,
                padding: 16,
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b>#{p.number}</b>
                  <div>{p.clients?.full_name}</div>
                </div>

                <div>${money(p.total)}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <Link href={`/proformas/${p.id}`}>Ver</Link>

                <button onClick={() => deleteProforma(p.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
