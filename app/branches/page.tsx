"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Branch = {
  id: number;
  name: string;
  canton: string | null;
  province: string | null;
};

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

export default function BranchesPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Branch[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function load() {
    setMsg("");
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if ((profile?.role ?? "") !== "admin") {
      router.push("/");
      return;
    }

    const { data } = await supabase
      .from("branches")
      .select("id, name, canton, province")
      .order("id", { ascending: false });

    setRows((data ?? []) as Branch[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function removeBranch(id: number, name: string) {
    const ok = confirm(`¿Eliminar la sucursal "${name}"?`);
    if (!ok) return;

    await supabase.from("branches").delete().eq("id", id);
    setRows((prev) => prev.filter((x) => x.id !== id));
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((b) =>
      (b.name ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  if (loading) return <PageShell>Cargando...</PageShell>;

  return (
    <PageShell>
      <div
        style={{
          maxWidth: 1300,
          margin: "0 auto",
          padding: isMobile ? 14 : 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "290px 1fr",
            gap: 20,
          }}
        >
          {/* SIDEBAR */}
          <div style={panelStyle}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Sucursales</div>

            <Link href="/">
              <button style={navButtonStyle}>← Volver</button>
            </Link>

            <Link href="/branches/new">
              <button style={primaryButtonStyle}>+ Nueva</button>
            </Link>
          </div>

          {/* CONTENIDO */}
          <div style={{ display: "grid", gap: 20 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              style={inputStyle}
            />

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((b) => (
                <div key={b.id} style={panelStyle}>
                  <div style={{ fontWeight: 900 }}>{b.name}</div>
                  <div>{b.canton}</div>
                  <div>{b.province}</div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    <Link href={`/branches/${b.id}/edit`}>
                      <button style={{ width: isMobile ? "100%" : undefined }}>
                        Editar
                      </button>
                    </Link>

                    <button
                      onClick={() => removeBranch(b.id, b.name)}
                      style={{
                        background: "red",
                        color: "white",
                        width: isMobile ? "100%" : undefined,
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.bone,
  padding: 16,
  borderRadius: 16,
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
};

const navButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
};
