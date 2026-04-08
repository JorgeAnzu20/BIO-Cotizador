"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
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

export default function NewProductPage() {
  const router = useRouter();

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [price, setPrice] = useState("");
  const [iva, setIva] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
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

      setLoading(false);
    })();
  }, [router]);

  async function save() {
    setMsg("");
    if (saving) return;

    const n = name.trim();
    if (!n) return setMsg("El nombre del producto es obligatorio.");

    const p = Number(String(price).replace(",", "."));
    if (!Number.isFinite(p) || p < 0) return setMsg("Precio inválido.");

    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        router.push("/login");
        return;
      }

      let pdf_path: string | null = null;

      if (pdfFile) {
        const isPdf =
          pdfFile.type === "application/pdf" ||
          pdfFile.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
          setSaving(false);
          return setMsg("Solo se permite PDF.");
        }

        const safe = sanitizeFileName(pdfFile.name);
        pdf_path = `${user.id}/${Date.now()}_${safe}`;

        const { error: upErr } = await supabase.storage
          .from("product-pdfs")
          .upload(pdf_path, pdfFile, {
            upsert: true,
            contentType: "application/pdf",
          });

        if (upErr) {
          setSaving(false);
          return setMsg("Error subiendo PDF: " + upErr.message);
        }
      }

      const payload: any = {
        name: n,
        code: code.trim() || null,
        description: description.trim() || null,
        features: features.trim() || null,
        price: p,
        iva,
        created_by: user.id,
        pdf_path,
      };

      const { error: insErr } = await supabase.from("products").insert(payload);

      if (insErr) {
        if (pdf_path) {
          await supabase.storage.from("product-pdfs").remove([pdf_path]);
        }
        setSaving(false);
        return setMsg("Error guardando producto: " + insErr.message);
      }

      router.push("/products");
    } catch (e: any) {
      setMsg("Error inesperado: " + (e?.message ?? String(e)));
      setSaving(false);
    }
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
        style={{ maxWidth: 1050, margin: "0 auto", padding: 24 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "290px 1fr",
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
              Crear nuevo producto
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/products" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={navButtonStyle}
                >
                  ← Volver a productos
                </motion.button>
              </Link>

              <motion.button
                onClick={save}
                style={primaryButtonStyle}
                disabled={saving}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? "Guardando..." : "Guardar producto"}
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Nuevo registro</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Nuevo producto
              </div>
              <div style={{ marginTop: 10 }}>
                Agrega un producto al catálogo con su precio, descripción y PDF opcional.
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

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                Datos del producto
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>
                  Nombre del producto
                  <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Código
                  <input value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Descripción
                  <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Características
                  <textarea value={features} onChange={(e) => setFeatures(e.target.value)} style={textareaStyle} />
                </label>

                <label style={labelStyle}>
                  Precio
                  <input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
                </label>

                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    color: COLORS.text,
                  }}
                >
                  <input type="checkbox" checked={iva} onChange={(e) => setIva(e.target.checked)} />
                  Aplica IVA
                </label>

                <label style={labelStyle}>
                  PDF del producto (opcional)
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    style={{ ...inputStyle, padding: 10 }}
                  />
                </label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <motion.button
                    onClick={save}
                    style={primaryInlineButtonStyle}
                    disabled={saving}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving ? "Guardando..." : "Guardar producto"}
                  </motion.button>

                  <Link href="/products">
                    <motion.button
                      style={secondaryButtonStyle}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Cancelar
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageShell>
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

const primaryInlineButtonStyle: React.CSSProperties = {
  border: "none",
  background: COLORS.cyan,
  color: COLORS.text,
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginTop: 6,
  borderRadius: 14,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 110,
  padding: 12,
  marginTop: 6,
  borderRadius: 14,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  color: COLORS.text,
};