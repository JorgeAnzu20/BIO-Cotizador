"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = {
  text: "#1F2937",
  white: "#FFFFFF",
  bone: "#F5F5F0",
  grayBorder: "#E5E7EB",
  cyan: "#05DBF2",
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

export default function LoginPage() {
  const router = useRouter();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const value = loginValue.trim();
      if (!value) {
        setLoading(false);
        return setMsg("Ingresa tu cédula.");
      }

      if (!password) {
        setLoading(false);
        return setMsg("Ingresa tu contraseña.");
      }

      let email = value;
      const looksLikeEmail = value.includes("@");

      if (!looksLikeEmail) {
        const res = await fetch("/api/auth/login-by-cedula", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cedula: value }),
        });

        const json = await res.json();

        if (!res.ok) {
          setLoading(false);
          return setMsg(json.error ?? "No se pudo validar la cédula.");
        }

        email = json.email as string;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return setMsg(error.message);
      }

      router.push("/");
    } catch (err: any) {
      setMsg(err?.message ?? "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <motion.div
          variants={itemVariants}
          style={{
            width: "100%",
            maxWidth: 430,
            background: COLORS.bone,
            border: `1px solid ${COLORS.grayBorder}`,
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
          }}
        >
          <motion.div
            variants={itemVariants}
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: COLORS.text,
              marginBottom: 8,
            }}
          >
            Iniciar sesión
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{
              fontSize: 14,
              color: COLORS.text,
              opacity: 0.85,
              marginBottom: 20,
            }}
          >
            Ingresa con tu cédula para acceder al sistema.
          </motion.div>

          <motion.form
            variants={itemVariants}
            onSubmit={onSubmit}
            style={{ display: "grid", gap: 14 }}
          >
            <label style={labelStyle}>
              Cédula
              <input
                placeholder="Ingresa tu cédula"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Contraseña
              <input
                placeholder="Ingresa tu contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>

            <motion.button
              type="submit"
              disabled={loading}
              style={primaryButtonStyle}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </motion.button>
          </motion.form>

          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  marginTop: 16,
                  background: "#FEE2E2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: 600,
                }}
              >
                {msg}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  color: COLORS.text,
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

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: COLORS.cyan,
  color: COLORS.text,
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 4,
};