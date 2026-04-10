"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Branch = {
  id: number;
  name: string;
  canton: string | null;
  province: string | null;
};

const COLORS = {
  text: "#1F2937",
  bone: "#F5F5F0",
  grayBorder: "#E5E7EB",
  blue: "#05AFF2",
  cyan: "#05DBF2",
  white: "#FFFFFF",
};

export default function EditBranchPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any).id);

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

  async function load() {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setName(data.name || "");
      setCanton(data.canton || "");
      setProvince(data.province || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    if (saving) return;

    if (!name.trim()) {
      setMsg("El nombre es obligatorio");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("branches")
      .update({
        name,
        canton,
        province,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/branches");
  }

  if (loading) {
    return <PageShell>Cargando...</PageShell>;
  }

  return (
    <PageShell>
      <div
        style={{
          maxWidth: 1050,
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

            <Link href="/branches">
              <button style={navButtonStyle}>← Volver</button>
            </Link>

            <button onClick={save} style={primaryButtonStyle}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>

          {/* FORM */}
          <div style={{ display: "grid", gap: 20 }}>
            <div style={panelStyle}>
              <div style={{ fontSize: 30, fontWeight: 900 }}>
                Editar sucursal
              </div>
            </div>

            {msg && <div style={{ color: "red" }}>{msg}</div>}

            <div style={panelStyle}>
              <div style={{ display: "grid", gap: 14 }}>
                {/* NOMBRE */}
                <label style={labelStyle}>
                  Nombre
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                {/* CANTÓN */}
                <label style={labelStyle}>
                  Cantón
                  <input
                    value={canton}
                    onChange={(e) => setCanton(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                {/* PROVINCIA */}
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
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <button
                    onClick={save}
                    style={{
                      ...primaryInlineButtonStyle,
                      width: isMobile ? "100%" : undefined,
                    }}
                  >
                    Guardar
                  </button>

                  <Link href="/branches">
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        width: isMobile ? "100%" : undefined,
                      }}
                    >
                      Cancelar
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#F5F5F0",
  padding: 20,
  borderRadius: 16,
};

const navButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  background: "#05DBF2",
};

const primaryInlineButtonStyle: React.CSSProperties = {
  padding: 12,
  background: "#05DBF2",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginTop: 6,
};

const labelStyle: React.CSSProperties = {
  display: "block",
};
