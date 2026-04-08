"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const BUCKET = "proforma-assets";

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

export default function AdminProformaAssetsPage() {
  const router = useRouter();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingFooter, setUploadingFooter] = useState(false);

  const [headerUrl, setHeaderUrl] = useState("");
  const [footerUrl, setFooterUrl] = useState("");

  async function load() {
    setMsg("");
    setLoading(true);

    const { data: au } = await supabase.auth.getUser();
    if (!au.user) {
      router.push("/login");
      return;
    }

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", au.user.id)
      .maybeSingle();

    if (meErr) {
      setMsg(meErr.message);
      setLoading(false);
      return;
    }

    if ((me?.role ?? "") !== "admin") {
      router.push("/");
      return;
    }

    const { data: h } = supabase.storage.from(BUCKET).getPublicUrl("header.png");
    const { data: f } = supabase.storage.from(BUCKET).getPublicUrl("footer.png");

    const t = Date.now();
    setHeaderUrl(`${h.publicUrl}?t=${t}`);
    setFooterUrl(`${f.publicUrl}?t=${t}`);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadHeader(file: File | null) {
    setMsg("");
    if (!file) return;

    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp)$/i.test(file.name);

    if (!isImage) {
      setMsg("El header debe ser una imagen.");
      return;
    }

    setUploadingHeader(true);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload("header.png", file, {
        upsert: true,
        contentType: file.type || "image/png",
      });

    setUploadingHeader(false);

    if (error) {
      setMsg("Error subiendo header: " + error.message);
      return;
    }

    setMsg("✅ Header actualizado");
    await load();
  }

  async function uploadFooter(file: File | null) {
    setMsg("");
    if (!file) return;

    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp)$/i.test(file.name);

    if (!isImage) {
      setMsg("El footer debe ser una imagen.");
      return;
    }

    setUploadingFooter(true);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload("footer.png", file, {
        upsert: true,
        contentType: file.type || "image/png",
      });

    setUploadingFooter(false);

    if (error) {
      setMsg("Error subiendo footer: " + error.message);
      return;
    }

    setMsg("✅ Footer actualizado");
    await load();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.grayBg,
          color: COLORS.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        Cargando...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.grayBg,
        color: COLORS.text,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 1300, margin: "0 auto", padding: 24 }}
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
              Plantillas
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Personaliza encabezado y pie de página
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

          <div style={{ display: "grid", gap: 20 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Configuración visual</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Plantilla de proforma
              </div>
              <div style={{ marginTop: 10 }}>
                Sube las imágenes que se usan como encabezado y pie de página en tus proformas PDF.
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
                    background: msg.includes("✅") ? "#DCFCE7" : "#FEE2E2",
                    border: msg.includes("✅") ? "1px solid #86EFAC" : "1px solid #FCA5A5",
                    color: msg.includes("✅") ? "#166534" : "#991B1B",
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
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 20,
              }}
            >
              <motion.div variants={itemVariants} style={panelStyle}>
                <div style={sectionTitle}>Encabezado</div>
                <div style={{ color: COLORS.text, marginBottom: 12 }}>
                  Tamaño recomendado: 21 cm x 4 cm
                </div>

                <motion.div
                  whileHover={{ y: -2, scale: 1.005 }}
                  transition={{ duration: 0.2 }}
                  style={previewBox}
                >
                  {headerUrl ? (
                    <img
                      src={headerUrl}
                      alt="Header actual"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div style={emptyPreviewText}>No hay header cargado</div>
                  )}
                </motion.div>

                <div style={{ marginTop: 14 }}>
                  <motion.label
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={uploadLabelStyle}
                  >
                    {uploadingHeader ? "Subiendo..." : "Subir/Reemplazar header"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => uploadHeader(e.target.files?.[0] ?? null)}
                      disabled={uploadingHeader}
                      style={{ display: "none" }}
                    />
                  </motion.label>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={panelStyle}>
                <div style={sectionTitle}>Pie de página</div>
                <div style={{ color: COLORS.text, marginBottom: 12 }}>
                  Tamaño recomendado: 21 cm x 4 cm
                </div>

                <motion.div
                  whileHover={{ y: -2, scale: 1.005 }}
                  transition={{ duration: 0.2 }}
                  style={previewBox}
                >
                  {footerUrl ? (
                    <img
                      src={footerUrl}
                      alt="Footer actual"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div style={emptyPreviewText}>No hay footer cargado</div>
                  )}
                </motion.div>

                <div style={{ marginTop: 14 }}>
                  <motion.label
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={uploadLabelStyle}
                  >
                    {uploadingFooter ? "Subiendo..." : "Subir/Reemplazar footer"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => uploadFooter(e.target.files?.[0] ?? null)}
                      disabled={uploadingFooter}
                      style={{ display: "none" }}
                    />
                  </motion.label>
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={sectionTitle}>Recomendaciones</div>

              <div style={{ display: "grid", gap: 8, color: COLORS.text }}>
                <div>• Usa imágenes horizontales limpias y de buena resolución.</div>
                <div>• Mantén proporción cercana a 21 cm x 4 cm para evitar deformaciones.</div>
                <div>• Preferible PNG o JPG con fondo bien preparado.</div>
                <div>• Después de subir una imagen, recarga si quieres verificar el cambio.</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
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

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 10,
  color: COLORS.text,
};

const previewBox: React.CSSProperties = {
  width: "100%",
  minHeight: "4cm",
  borderRadius: 18,
  overflow: "hidden",
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyPreviewText: React.CSSProperties = {
  color: COLORS.text,
  fontSize: 14,
};

const uploadLabelStyle: React.CSSProperties = {
  display: "inline-block",
  border: "none",
  background: COLORS.cyan,
  color: COLORS.text,
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
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