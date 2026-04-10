"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Client = {
  id: number;
  full_name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
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

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any).id);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

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
    if (!auth.user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("id, full_name, document, phone, email, address")
      .eq("id", id)
      .single();

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    const row = data as Client;

    setFullName(row.full_name ?? "");
    setDocument(row.document ?? "");
    setPhone(row.phone ?? "");
    setEmail(row.email ?? "");
    setAddress(row.address ?? "");

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id, router]);

  async function save() {
    setMsg("");
    if (saving) return;

    if (!fullName.trim()) {
      setMsg("El nombre del cliente es obligatorio.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("clients")
      .update({
        full_name: fullName.trim(),
        document: document.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/clients");
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
              Clientes
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Editar información del cliente
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/clients" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={navButtonStyle}
                >
                  ← Volver a clientes
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

          <div style={{ display: "grid", gap: 20 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Edición</div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  marginTop: 6,
                  lineHeight: 1.1,
                }}
              >
                Editar cliente
              </div>
              <div style={{ marginTop: 10 }}>
                Actualiza la información del cliente para mantener tus datos al día.
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
                Datos del cliente
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>
                  Nombre / Razón social
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Cédula / RUC
                  <input
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Teléfono
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Correo electrónico
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Ciudad
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={textareaStyle}
                  />
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 6,
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
                    href="/clients"
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
                      disabled={saving}
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
