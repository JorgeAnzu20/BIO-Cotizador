"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Client = {
  id: number;
  full_name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at?: string | null;
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

const pageVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut" as const,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const sidebarVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

export default function ClientsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Client[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    const pageSize = 1000;
    let from = 0;
    let allRows: Client[] = [];

    while (true) {
      const { data: batch, error } = await supabase
        .from("clients")
        .select("id, full_name, document, phone, email, address, created_at")
        .order("id", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      const parsed = (batch ?? []) as Client[];
      allRows = [...allRows, ...parsed];

      if (parsed.length < pageSize) break;
      from += pageSize;
    }

    setRows(allRows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [router]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((c) => {
      const name = (c.full_name ?? "").toLowerCase();
      const doc = (c.document ?? "").toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return (
        name.includes(s) ||
        doc.includes(s) ||
        phone.includes(s) ||
        email.includes(s)
      );
    });
  }, [rows, q]);

  async function removeClient(id: number, name: string) {
    const ok = confirm(`¿Eliminar el cliente "${name}"?`);
    if (!ok) return;

    setMsg("");
    setDeletingId(id);

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      setMsg("No se pudo eliminar: " + error.message);
      setDeletingId(null);
      return;
    }

    setRows((prev) => prev.filter((x) => x.id !== id));
    setDeletingId(null);
    setMsg("✅ Cliente eliminado");
  }

  return (
    <PageShell>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? 14 : 24 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "290px 1fr",
            gap: 20,
          }}
        >
          <motion.div
            variants={sidebarVariants}
            style={{
              background: COLORS.blue,
              border: `2px solid ${COLORS.cyan}`,
              borderRadius: 24,
              padding: 20,
              height: "fit-content",
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
              color: COLORS.text,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                marginBottom: 6,
                color: COLORS.bone,
              }}
            >
              Clientes
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Gestiona tu base de clientes
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={navButtonStyle}
                >
                  ← Volver al inicio
                </motion.button>
              </Link>

              <Link href="/clients/new" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={primaryButtonStyle}
                >
                  + Nuevo cliente
                </motion.button>
              </Link>

              <motion.button
                onClick={load}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={navButtonStyle}
              >
                Recargar
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={bonePanel}>
              <div style={{ fontSize: 14, opacity: 0.85, color: COLORS.text }}>Módulo</div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  marginTop: 6,
                  lineHeight: 1.1,
                  color: COLORS.text,
                }}
              >
                Clientes
              </div>
              <div style={{ marginTop: 10, color: COLORS.text }}>
                Consulta, busca, edita y organiza tu cartera de clientes.
              </div>
            </motion.div>

            <AnimatePresence>
              {msg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    background: "#FEE2E2",
                    border: "1px solid #FCA5A5",
                    color: "#991B1B",
                    borderRadius: 16,
                    padding: 14,
                    fontWeight: 600,
                  }}
                >
                  {msg}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              variants={itemVariants}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard title="Clientes totales" value={String(rows.length)} />
              <MetricCard title="Resultados filtrados" value={String(filtered.length)} />
            </motion.div>

            <motion.div variants={itemVariants} style={bonePanel}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 14,
                  color: COLORS.text,
                }}
              >
                Buscar clientes
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, cédula/RUC, teléfono o correo..."
                style={{
                  width: "100%",
                  maxWidth: isMobile ? "100%" : 420,
                  padding: 12,
                  borderRadius: 14,
                  border: `1px solid ${COLORS.grayBorder}`,
                  background: COLORS.white,
                  color: COLORS.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </motion.div>

            <motion.div variants={itemVariants} style={bonePanel}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 14,
                  color: COLORS.text,
                }}
              >
                Listado de clientes
              </div>

              {loading ? (
                <div style={{ color: COLORS.text }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ color: COLORS.text }}>No hay clientes.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <AnimatePresence initial={false}>
                    {filtered.map((c, index) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.35, delay: index * 0.03 }}
                        whileHover={{ y: -3, scale: 1.005 }}
                        style={{
                          borderRadius: 22,
                          padding: 16,
                          background: COLORS.bone,
                          border: "1px solid #D6D6D0",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                            flexDirection: isMobile ? "column" : "row",
                          }}
                        >
                          <div style={{ minWidth: isMobile ? "100%" : 260 }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 20,
                                color: COLORS.text,
                                wordBreak: "break-word",
                              }}
                            >
                              {c.full_name}
                            </div>

                            <div style={{ marginTop: 8, color: COLORS.text, wordBreak: "break-word" }}>
                              <b>Cédula/RUC:</b> {c.document ?? "-"}
                            </div>

                            <div style={{ marginTop: 4, color: COLORS.text, wordBreak: "break-word" }}>
                              <b>Teléfono:</b> {c.phone ?? "-"}
                            </div>

                            <div style={{ marginTop: 4, color: COLORS.text, wordBreak: "break-word" }}>
                              <b>Correo:</b> {c.email ?? "-"}
                            </div>

                            <div style={{ marginTop: 4, color: COLORS.text, wordBreak: "break-word" }}>
                              <b>Reporte:</b> {c.address ?? "-"}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginTop: 14,
                          }}
                        >
                          <Link href={`/clients/${c.id}/edit`}>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              style={actionButtonStyle}
                            >
                              Editar
                            </motion.button>
                          </Link>

                          <motion.button
                            type="button"
                            onClick={() => removeClient(c.id, c.full_name)}
                            disabled={deletingId === c.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={dangerButtonStyle}
                          >
                            {deletingId === c.id ? "Eliminando..." : "Eliminar"}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageShell>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      style={{
        background: COLORS.bone,
        border: `1px solid ${COLORS.grayBorder}`,
        borderRadius: 22,
        padding: 18,
        boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
        color: COLORS.text,
      }}
    >
      <div style={{ fontSize: 14, color: COLORS.text }}>{title}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1,
          color: COLORS.text,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}

const bonePanel: React.CSSProperties = {
  background: COLORS.bone,
  border: `1px solid ${COLORS.grayBorder}`,
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  color: COLORS.text,
};

const navButtonStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.bone,
  color: COLORS.text,
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: COLORS.cyan,
  color: COLORS.text,
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "left",
};

const actionButtonStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "none",
  background: COLORS.danger,
  color: COLORS.white,
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
};
