"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Product = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  features: string | null;
  price: number;
  iva: boolean;
  pdf_path: string | null;
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

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
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

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      setMsg(profileErr.message);
      setLoading(false);
      return;
    }

    if ((profile?.role ?? "") !== "admin") {
      router.push("/");
      return;
    }

    const { data: rows, error } = await supabase
      .from("products")
      .select("id, name, code, description, features, price, iva, pdf_path")
      .order("id", { ascending: false });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    setProducts((rows ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;

    return products.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const code = (p.code ?? "").toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      return name.includes(s) || code.includes(s) || desc.includes(s);
    });
  }, [products, q]);

  async function viewPdf(p: Product) {
    setMsg("");

    if (!p.pdf_path) {
      setMsg("Este producto no tiene PDF.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("product-pdfs")
      .createSignedUrl(p.pdf_path, 60 * 10);

    if (error) {
      setMsg("Error generando enlace del PDF: " + error.message);
      return;
    }

    if (!data?.signedUrl) {
      setMsg("No pude generar el enlace del PDF.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function deleteProduct(p: Product) {
    setMsg("");
    const ok = confirm(`¿Eliminar el producto "${p.name}"?`);
    if (!ok) return;

    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .eq("id", p.id);

    if (delErr) {
      setMsg("No se pudo eliminar: " + delErr.message);
      return;
    }

    if (p.pdf_path) {
      await supabase.storage.from("product-pdfs").remove([p.pdf_path]);
    }

    setMsg("✅ Producto eliminado");
    await load();
  }

  if (loading) {
    return (
      <PageShell>
        <div
          style={{
            minHeight: "100vh",
            color: COLORS.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, Arial, sans-serif",
          }}
        >
          Cargando...
        </div>
      </PageShell>
    );
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
              Productos
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Gestiona tu catálogo
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

              <Link href="/products/new" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={primaryButtonStyle}
                >
                  + Nuevo producto
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
            <motion.div variants={itemVariants} style={panelStyle}>
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
                Productos
              </div>
              <div style={{ marginTop: 10, color: COLORS.text }}>
                Consulta, busca, edita y administra los productos de tu sistema.
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
              <MetricCard title="Productos totales" value={String(products.length)} />
              <MetricCard title="Resultados filtrados" value={String(filtered.length)} />
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 14,
                  color: COLORS.text,
                }}
              >
                Buscar productos
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, código o descripción..."
                style={{
                  ...inputStyle,
                  maxWidth: isMobile ? "100%" : 420,
                }}
              />
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 14,
                  color: COLORS.text,
                }}
              >
                Listado de productos
              </div>

              {filtered.length === 0 ? (
                <div style={{ color: COLORS.text }}>No hay productos.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <AnimatePresence initial={false}>
                    {filtered.map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
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
                              {p.name}
                            </div>

                            <div style={{ marginTop: 8, color: COLORS.text, wordBreak: "break-word" }}>
                              <b>Código:</b> {p.code ?? "-"}
                            </div>

                            {p.description ? (
                              <div style={{ marginTop: 6, color: COLORS.text, wordBreak: "break-word" }}>
                                <b>Descripción:</b> {p.description}
                              </div>
                            ) : null}

                            {p.features ? (
                              <div style={{ marginTop: 6, color: COLORS.text }}>
                                <b>Características:</b>
                                <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                                  {p.features}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div style={{ textAlign: isMobile ? "left" : "right" }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 24,
                                color: COLORS.text,
                              }}
                            >
                              ${Number(p.price).toFixed(2)}
                            </div>
                            <div style={{ marginTop: 6, color: COLORS.text }}>
                              {p.iva ? "Con IVA" : "Sin IVA"}
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
                          <Link href={`/products/${p.id}/edit`}>
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
                            onClick={() => deleteProduct(p)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={dangerButtonStyle}
                          >
                            Eliminar
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => viewPdf(p)}
                            disabled={!p.pdf_path}
                            whileHover={p.pdf_path ? { scale: 1.03 } : undefined}
                            whileTap={p.pdf_path ? { scale: 0.97 } : undefined}
                            style={actionButtonStyle}
                          >
                            {p.pdf_path ? "Ver PDF" : "Sin PDF"}
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
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.bone,
  border: `1px solid ${COLORS.grayBorder}`,
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  color: COLORS.text,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: 12,
  borderRadius: 14,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  boxSizing: "border-box",
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
