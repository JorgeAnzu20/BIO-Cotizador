"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

const BUCKET = "product-pdfs";

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

function safeName(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "");
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any).id);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [iva, setIva] = useState(true);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, code, description, features, price, iva, pdf_path")
      .eq("id", id)
      .single();

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    const p = data as Product;
    setName(p.name ?? "");
    setCode(p.code ?? "");
    setDescription(p.description ?? "");
    setFeatures(p.features ?? "");
    setPrice(String(p.price ?? 0));
    setIva(!!p.iva);
    setPdfPath(p.pdf_path ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function uploadPdf(): Promise<string> {
    if (!pdfFile) throw new Error("No hay archivo seleccionado.");

    const isPdf =
      pdfFile.type === "application/pdf" ||
      pdfFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) throw new Error("El archivo debe ser PDF.");

    const fileName = `${Date.now()}-${safeName(pdfFile.name)}`;
    const path = `products/${id}/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, pdfFile, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (error) throw new Error(error.message);

    return path;
  }

  async function viewPdf() {
    setMsg("");
    if (!pdfPath) return;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pdfPath, 60);

    if (error) {
      setMsg("Error generando link del PDF: " + error.message);
      return;
    }

    if (!data?.signedUrl) {
      setMsg("No se pudo generar el link del PDF.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noreferrer");
  }

  async function removePdf() {
    setMsg("");
    if (!pdfPath) return;

    const ok = confirm("¿Quitar el PDF del producto?");
    if (!ok) return;

    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([pdfPath]);
    if (rmErr) {
      setMsg("Error eliminando PDF del storage: " + rmErr.message);
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ pdf_path: null })
      .eq("id", id);

    if (error) {
      setMsg("Error actualizando producto: " + error.message);
      return;
    }

    setPdfPath(null);
    setMsg("✅ PDF eliminado");
  }

  async function save() {
    setMsg("");
    if (saving) return;
    setSaving(true);

    try {
      if (!name.trim()) throw new Error("El nombre del producto es obligatorio.");

      const priceNum = Number(String(price).replace(",", "."));
      if (!Number.isFinite(priceNum) || priceNum < 0) throw new Error("Precio inválido.");

      let nextPdfPath = pdfPath;
      if (pdfFile) {
        nextPdfPath = await uploadPdf();
      }

      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          features: features.trim() || null,
          price: priceNum,
          iva,
          pdf_path: nextPdfPath,
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      setPdfPath(nextPdfPath);
      setPdfFile(null);
      router.push("/products");
    } catch (e: any) {
      setMsg("Error: " + (e?.message ?? "No se pudo guardar"));
    } finally {
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
        style={{ maxWidth: 1050, margin: "0 auto", padding: isMobile ? 14 : 24 }}
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
              Editar producto
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
                {saving ? "Guardando..." : "Guardar cambios"}
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Edición</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Editar producto
              </div>
              <div style={{ marginTop: 10 }}>
                Actualiza el nombre, precio, descripción y PDF del producto.
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

                <div
                  style={{
                    border: `1px solid ${COLORS.grayBorder}`,
                    borderRadius: 16,
                    padding: 14,
                    background: COLORS.white,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 10, color: COLORS.text }}>
                    PDF del producto
                  </div>

                  {pdfPath ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <motion.button
                        onClick={viewPdf}
                        style={{
                          ...secondaryButtonStyle,
                          width: isMobile ? "100%" : undefined,
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Ver PDF
                      </motion.button>

                      <motion.button
                        onClick={removePdf}
                        style={{
                          ...dangerButtonStyle,
                          width: isMobile ? "100%" : undefined,
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Quitar PDF
                      </motion.button>
                    </div>
                  ) : (
                    <div style={{ color: COLORS.text }}>No hay PDF adjunto.</div>
                  )}

                  <label style={{ ...labelStyle, marginTop: 12 }}>
                    Subir/Reemplazar PDF
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                      style={{ ...inputStyle, padding: 10 }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <motion.button
                    onClick={save}
                    style={{
                      ...primaryInlineButtonStyle,
                      width: isMobile ? "100%" : undefined,
                    }}
                    disabled={saving}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </motion.button>

                  <Link
                    href="/products"
                    style={{
                      textDecoration: "none",
                      width: isMobile ? "100%" : undefined,
                    }}
                  >
                    <motion.button
                      style={{
                        ...secondaryButtonStyle,
                        width: isMobile ? "100%" : undefined,
                      }}
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

const dangerButtonStyle: React.CSSProperties = {
  border: "none",
  background: COLORS.danger,
  color: COLORS.white,
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
