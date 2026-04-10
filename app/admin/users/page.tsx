"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

type Branch = { id: number; name: string };

type ProfileRow = {
  id: string;
  full_name: string | null;
  cedula: string | null;
  role: string | null;
  branch_id: number | null;
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

export default function AdminUsersPage() {
  const router = useRouter();

  const [msg, setMsg] = useState("");
  const [meRole, setMeRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"worker" | "admin">("worker");
  const [branchId, setBranchId] = useState<number | "">("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "admin" | "worker">>({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function load() {
    setMsg("");
    setLoading(true);

    const { data: au } = await supabase.auth.getUser();
    if (!au.user) {
      router.push("/login");
      return;
    }

    const { data: myP, error: myErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", au.user.id)
      .maybeSingle();

    if (myErr) {
      setMsg(myErr.message);
      setLoading(false);
      return;
    }

    const myRole = myP?.role ?? "";
    setMeRole(myRole);

    if (myRole !== "admin") {
      router.push("/");
      return;
    }

    const { data: br, error: brErr } = await supabase
      .from("branches")
      .select("id, name")
      .order("id", { ascending: true });

    if (!brErr) setBranches((br ?? []) as Branch[]);

    const { data: rows, error: listErr } = await supabase
      .from("profiles")
      .select("id, full_name, cedula, role, branch_id")
      .order("created_at", { ascending: false });

    if (listErr) {
      setMsg(listErr.message);
      setLoading(false);
      return;
    }

    const parsed = (rows ?? []) as ProfileRow[];
    setProfiles(parsed);

    const drafts: Record<string, "admin" | "worker"> = {};
    for (const p of parsed) {
      drafts[p.id] = p.role === "admin" ? "admin" : "worker";
    }
    setRoleDrafts(drafts);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser() {
    setMsg("");

    const c = cedula.trim();
    if (!c) return setMsg("La cédula es obligatoria.");
    if (!password || password.length < 6) {
      return setMsg("La contraseña debe tener mínimo 6 caracteres.");
    }

    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) return setMsg("No hay sesión activa.");

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        cedula: c,
        password,
        full_name: fullName.trim() || null,
        role,
        branch_id: branchId === "" ? null : Number(branchId),
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMsg("Error: " + (json.error ?? "No se pudo crear"));
      return;
    }

    setMsg(`✅ Usuario creado: ${c}`);
    setCedula("");
    setPassword("");
    setFullName("");
    setRole("worker");
    setBranchId("");
    await load();
  }

  async function updateUserRole(profileId: string, currentRole: string | null) {
    setMsg("");

    const nextRole = roleDrafts[profileId];
    if (!nextRole) return;

    if (nextRole === currentRole) {
      setMsg("Ese usuario ya tiene ese rol.");
      return;
    }

    setUpdatingRoleId(profileId);

    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;

      if (!token) {
        setUpdatingRoleId(null);
        setMsg("No hay sesión activa.");
        return;
      }

      const res = await fetch("/api/admin/update-user-role", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: profileId,
          role: nextRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setUpdatingRoleId(null);
        setMsg("Error: " + (json.error ?? "No se pudo actualizar el rol"));
        return;
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: nextRole } : p))
      );

      setRoleDrafts((prev) => ({
        ...prev,
        [profileId]: nextRole,
      }));

      setUpdatingRoleId(null);
      setMsg(`✅ Rol actualizado a ${nextRole}`);
    } catch (error: any) {
      setUpdatingRoleId(null);
      setMsg("Error: " + (error?.message ?? "No se pudo actualizar el rol"));
    }
  }

  async function deleteUser(
    profileId: string,
    profileName: string | null,
    profileCedula: string | null
  ) {
    const ok = confirm(
      `¿Eliminar este usuario?\n\n${profileName ?? "Sin nombre"}${
        profileCedula ? ` - ${profileCedula}` : ""
      }`
    );
    if (!ok) return;

    setMsg("");

    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) return setMsg("No hay sesión activa.");

    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: profileId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMsg("Error: " + (json.error ?? "No se pudo eliminar"));
      return;
    }

    setMsg("✅ Usuario eliminado");
    await load();
  }

  const filteredProfiles = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return profiles;

    return profiles.filter((p) => {
      const name = (p.full_name ?? "").toLowerCase();
      const ced = (p.cedula ?? "").toLowerCase();
      const roleText = (p.role ?? "").toLowerCase();
      return name.includes(s) || ced.includes(s) || roleText.includes(s);
    });
  }, [profiles, search]);

  const adminCount = useMemo(
    () => profiles.filter((p) => p.role === "admin").length,
    [profiles]
  );

  const workerCount = useMemo(
    () => profiles.filter((p) => p.role === "worker").length,
    [profiles]
  );

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

  if (meRole !== "admin") {
    return <div style={{ padding: 20 }}>No autorizado</div>;
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
              Usuarios
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Administración de accesos
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <motion.button
                  style={navButtonStyle}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ← Volver al inicio
                </motion.button>
              </Link>

              <motion.button
                onClick={load}
                style={navButtonStyle}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Recargar
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Módulo admin</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Usuarios del sistema
              </div>
              <div style={{ marginTop: 10 }}>
                Crea, consulta, cambia roles y elimina usuarios con sus respectivos accesos.
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
                  : "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard title="Usuarios totales" value={String(profiles.length)} />
              <MetricCard title="Administradores" value={String(adminCount)} />
              <MetricCard title="Trabajadores" value={String(workerCount)} />
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                Crear usuario
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>
                  Cédula
                  <input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Contraseña
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Nombre completo
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Rol
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "worker" | "admin")}
                    style={selectStyle}
                  >
                    <option value="worker">worker (trabajador)</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Sucursal (opcional)
                  <select
                    value={branchId}
                    onChange={(e) =>
                      setBranchId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    style={selectStyle}
                  >
                    <option value="">(sin asignar)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
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
                    onClick={createUser}
                    style={{
                      ...primaryInlineButtonStyle,
                      width: isMobile ? "100%" : undefined,
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Crear usuario
                  </motion.button>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                Buscar usuarios
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, cédula o rol..."
                style={inputStyle}
              />
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                Perfiles existentes
              </div>

              {filteredProfiles.length === 0 ? (
                <div style={{ color: COLORS.text }}>No hay usuarios.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <AnimatePresence initial={false}>
                    {filteredProfiles.map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                        whileHover={{ y: -3, scale: 1.005 }}
                      >
                        <details
                          style={{
                            borderRadius: 20,
                            padding: 16,
                            background: COLORS.bone,
                            border: "1px solid #D6D6D0",
                            boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                          }}
                        >
                          <summary
                            style={{
                              cursor: "pointer",
                              fontWeight: 800,
                              fontSize: 16,
                              outline: "none",
                              color: COLORS.text,
                              wordBreak: "break-word",
                            }}
                          >
                            {p.full_name ?? "Sin nombre"} {p.cedula ? `- ${p.cedula}` : ""}
                          </summary>

                          <div style={{ marginTop: 14, display: "grid", gap: 8, color: COLORS.text }}>
                            <div><b>ID:</b> {p.id}</div>
                            <div><b>Nombre:</b> {p.full_name ?? "-"}</div>
                            <div><b>Cédula:</b> {p.cedula ?? "-"}</div>
                            <div><b>Rol actual:</b> {p.role ?? "-"}</div>
                            <div><b>Sucursal:</b> {p.branch_id ?? "-"}</div>

                            <div
                              style={{
                                marginTop: 10,
                                padding: 14,
                                borderRadius: 16,
                                background: COLORS.white,
                                border: `1px solid ${COLORS.grayBorder}`,
                              }}
                            >
                              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                                Cambiar rol
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  flexDirection: isMobile ? "column" : "row",
                                }}
                              >
                                <select
                                  value={roleDrafts[p.id] ?? (p.role === "admin" ? "admin" : "worker")}
                                  onChange={(e) =>
                                    setRoleDrafts((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value as "admin" | "worker",
                                    }))
                                  }
                                  style={{
                                    ...selectStyle,
                                    marginTop: 0,
                                    maxWidth: isMobile ? "100%" : 220,
                                    width: isMobile ? "100%" : undefined,
                                  }}
                                >
                                  <option value="worker">worker (trabajador)</option>
                                  <option value="admin">admin</option>
                                </select>

                                <motion.button
                                  onClick={() => updateUserRole(p.id, p.role)}
                                  disabled={updatingRoleId === p.id}
                                  style={{
                                    ...primaryInlineButtonStyle,
                                    width: isMobile ? "100%" : undefined,
                                  }}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  {updatingRoleId === p.id ? "Guardando..." : "Guardar rol"}
                                </motion.button>
                              </div>
                            </div>

                            <div style={{ marginTop: 10 }}>
                              <motion.button
                                onClick={() => deleteUser(p.id, p.full_name, p.cedula)}
                                style={{
                                  ...dangerButtonStyle,
                                  width: isMobile ? "100%" : undefined,
                                }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                Eliminar usuario
                              </motion.button>
                            </div>
                          </div>
                        </details>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
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

const primaryInlineButtonStyle: React.CSSProperties = {
  border: "none",
  background: COLORS.cyan,
  color: COLORS.text,
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 800,
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

const selectStyle: React.CSSProperties = {
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
