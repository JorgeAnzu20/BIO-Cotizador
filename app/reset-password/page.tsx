"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!password || !confirm) {
      setError("Completa todos los campos.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMsg("Contraseña actualizada correctamente. Ahora puedes iniciar sesión.");
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f3f4f6",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#f5f5f0",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 10,
            color: "#1F2937",
          }}
        >
          Restablecer contraseña
        </h1>

        <p style={{ color: "#374151", marginBottom: 24 }}>
          Ingresa tu nueva contraseña para recuperar el acceso.
        </p>

        <form onSubmit={handleReset} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#1F2937" }}>
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid #d1d5db",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#1F2937" }}>
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid #d1d5db",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "14px 18px",
              borderRadius: 14,
              border: "none",
              fontWeight: 800,
              fontSize: 18,
              cursor: "pointer",
              background: "#22c7df",
              color: "#111827",
            }}
          >
            {loading ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>

        {error ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fca5a5",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        {msg ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "#dcfce7",
              color: "#166534",
              border: "1px solid #86efac",
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        ) : null}
      </div>
    </main>
  );
}
