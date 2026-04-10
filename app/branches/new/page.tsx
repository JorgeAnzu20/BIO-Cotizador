"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

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

export default function NewBranchPage() {
  const router = useRouter();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [name, setName] = useState("");
  const [canton, setCanton] = useState("");
  const [province, setProvince] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

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

    if (!name.trim()) {
      setMsg("El nombre es obligatorio.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("branches").insert({
      name: name.trim(),
      canton: canton.trim() || null,
      province: province.trim() || null,
    });

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/branches");
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
              Sucursales
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Crear nueva sucursal
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/branches" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={navButtonStyle}
                >
                  ← Volver a sucursales
                </motion.button>
              </Link>

              <motion.button
                onClick={save}
                style={primaryButtonStyle}
                disabled={saving}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? "Guardando..." : "Guardar sucursal"}
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Nuevo registro</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Nueva sucursal
              </div>
              <div style={{ marginTop: 10 }}>
                Agrega una nueva sucursal para organizar mejor tus operaciones.
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
                Datos de la sucursal
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>
                  Nombre
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Cantón
                  <input
                    value={canton}
                    onChange={(e) => setCanton(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Provincia
                  <input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    style={inputStyle}
                  />
                </label>

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
                    {saving ? "Guardando..." : "Guardar sucursal"}
                  </motion.button>

                  <Link
                    href="/branches"
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  color: COLORS.text,
};
