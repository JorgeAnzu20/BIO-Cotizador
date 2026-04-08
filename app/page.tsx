"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PageShell from "@/components/PageShell";
import { motion } from "framer-motion";

type Profile = {
  full_name: string | null;
  role: string | null;
};

type ProformaRow = {
  id: number;
  total: number;
  created_at: string;
  venta_confirmada: boolean;
  seller_id: string | null;
};

function money(n: number | null | undefined) {
  return Number(n ?? 0).toFixed(2);
}

function isSameMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [msg, setMsg] = useState("");

  const [proformas, setProformas] = useState<ProformaRow[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [branchesCount, setBranchesCount] = useState(0);

  useEffect(() => {
    (async () => {
      setMsg("");

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) setMsg(pErr.message);
      setProfile((p ?? null) as Profile | null);

      let proformasQuery = supabase
        .from("proformas")
        .select("id, total, created_at, venta_confirmada, seller_id")
        .order("id", { ascending: false });

      if ((p?.role ?? "") !== "admin") {
        proformasQuery = proformasQuery.eq("seller_id", user.id);
      }

      const { data: proRows } = await proformasQuery;
      setProformas((proRows ?? []) as ProformaRow[]);

      const { count: cCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      setClientsCount(cCount ?? 0);

      if ((p?.role ?? "") === "admin") {
        const { count: prCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        setProductsCount(prCount ?? 0);

        const { count: bCount } = await supabase
          .from("branches")
          .select("*", { count: "exact", head: true });

        setBranchesCount(bCount ?? 0);
      }

      setLoading(false);
    })();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const role = profile?.role ?? "";

  const totalHoy = useMemo(() => {
    return proformas
      .filter((p) => p.venta_confirmada && isToday(p.created_at))
      .reduce((acc, p) => acc + Number(p.total ?? 0), 0);
  }, [proformas]);

  const totalMes = useMemo(() => {
    return proformas
      .filter((p) => p.venta_confirmada && isSameMonth(p.created_at))
      .reduce((acc, p) => acc + Number(p.total ?? 0), 0);
  }, [proformas]);

  const totalConfirmadas = useMemo(() => {
    return proformas.filter((p) => p.venta_confirmada).length;
  }, [proformas]);

  const recentProformas = useMemo(() => proformas.slice(0, 5), [proformas]);

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
        style={{ maxWidth: 1250, margin: "0 auto", padding: 24 }}
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
              Cotizaciones
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Panel principal del sistema
            </div>

            <motion.div
              variants={itemVariants}
              style={{
                background: COLORS.bone,
                borderRadius: 18,
                padding: 14,
                marginBottom: 18,
                border: `1px solid ${COLORS.grayBorder}`,
                color: COLORS.text,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.8 }}>Usuario</div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>
                {profile?.full_name || email || "-"}
              </div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Rol: <b>{role || "-"}</b>
              </div>
            </motion.div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/clients" style={{ textDecoration: "none" }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                  Clientes
                </motion.button>
              </Link>

              <Link href="/proformas" style={{ textDecoration: "none" }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                  Proformas
                </motion.button>
              </Link>

              <Link href="/admin/vendors-report" style={{ textDecoration: "none" }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                  {role === "admin" ? "Reporte de ventas" : "Reportes"}
                </motion.button>
              </Link>

              {role === "admin" && (
                <>
                  <Link href="/products" style={{ textDecoration: "none" }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                      Productos
                    </motion.button>
                  </Link>

                  <Link href="/branches" style={{ textDecoration: "none" }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                      Sucursales
                    </motion.button>
                  </Link>

                  <Link href="/admin/users" style={{ textDecoration: "none" }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                      Usuarios
                    </motion.button>
                  </Link>

                  <Link href="/admin/proforma-assets" style={{ textDecoration: "none" }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={sideButtonStyle}>
                      Plantillas
                    </motion.button>
                  </Link>
                </>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <motion.button
                onClick={logout}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: COLORS.danger,
                  color: COLORS.white,
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Cerrar sesión
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20 }}>
            <motion.div variants={itemVariants} style={bonePanel}>
              <div style={{ fontSize: 14, opacity: 0.9, color: COLORS.text }}>Bienvenido</div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  marginTop: 6,
                  lineHeight: 1.1,
                  color: COLORS.text,
                }}
              >
                {profile?.full_name || "Panel principal"}
              </div>
              <div style={{ marginTop: 10, color: COLORS.text }}>
                Revisa el estado general del sistema y accede rápidamente a las áreas principales.
              </div>
            </motion.div>

            {msg && (
              <motion.div
                variants={itemVariants}
                style={{
                  background: COLORS.danger,
                  color: COLORS.white,
                  borderRadius: 16,
                  padding: 14,
                  fontWeight: 700,
                }}
              >
                {msg}
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard title="Ventas de hoy" value={`$${money(totalHoy)}`} />
              <MetricCard title="Ventas del mes" value={`$${money(totalMes)}`} />
              <MetricCard title="Ventas confirmadas" value={String(totalConfirmadas)} />
              <MetricCard title="Total proformas" value={String(proformas.length)} />
            </motion.div>

            <motion.div
              variants={itemVariants}
              style={{
                display: "grid",
                gridTemplateColumns: role === "admin" ? "1.2fr 0.8fr" : "1fr",
                gap: 20,
              }}
            >
              <motion.div variants={itemVariants} style={bonePanel}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    marginBottom: 14,
                    color: COLORS.text,
                  }}
                >
                  Proformas recientes
                </div>

                {recentProformas.length === 0 ? (
                  <div style={{ color: COLORS.text }}>No hay proformas todavía.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recentProformas.map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.06 }}
                        whileHover={{ y: -3, scale: 1.01 }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          padding: 14,
                          borderRadius: 18,
                          background: COLORS.bone,
                          border: `1px solid #D6D6D0`,
                          color: COLORS.text,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>Proforma #{p.id}</div>
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            {new Date(p.created_at).toLocaleDateString("es-EC")}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900 }}>${money(p.total)}</div>
                          <div
                            style={{
                              fontSize: 13,
                              marginTop: 4,
                              fontWeight: 700,
                              color: p.venta_confirmada ? "#166534" : "#92400E",
                            }}
                          >
                            {p.venta_confirmada ? "Confirmada" : "Pendiente"}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {role === "admin" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <SmallCard title="Clientes registrados" value={String(clientsCount)} />
                  <SmallCard title="Productos activos" value={String(productsCount)} />
                  <SmallCard title="Sucursales" value={String(branchesCount)} />
                </div>
              )}
            </motion.div>

            <motion.div variants={itemVariants} style={bonePanel}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  marginBottom: 14,
                  color: COLORS.text,
                }}
              >
                Accesos rápidos
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: role === "admin" ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
                  gap: 14,
                }}
              >
                <QuickLink
                  href="/proformas/new"
                  title="Nueva proforma"
                  subtitle="Crear una cotización"
                />

                <QuickLink
                  href="/clients"
                  title="Gestionar clientes"
                  subtitle="Ver y editar clientes"
                />

                {role === "admin" && (
                  <>
                    <QuickLink
                      href="/products/new"
                      title="Nuevo producto"
                      subtitle="Agregar al catálogo"
                    />

                    <QuickLink
                      href="/admin/users"
                      title="Usuarios"
                      subtitle="Administrar accesos"
                    />
                  </>
                )}
              </div>
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
      <div style={{ fontSize: 14 }}>{title}</div>
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

function SmallCard({ title, value }: { title: string; value: string }) {
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
      <div style={{ fontSize: 14 }}>{title}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: 26,
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

function QuickLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        style={{
          borderRadius: 20,
          padding: 18,
          background: COLORS.bone,
          border: `1px solid ${COLORS.grayBorder}`,
          minHeight: 92,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          cursor: "pointer",
          color: COLORS.text,
          boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>{subtitle}</div>
      </motion.div>
    </Link>
  );
}

const bonePanel: React.CSSProperties = {
  background: "#F5F5F0",
  border: `1px solid ${COLORS.grayBorder}`,
  borderRadius: 24,
  padding: 22,
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  color: COLORS.text,
};

const sideButtonStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.bone,
  color: COLORS.text,
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s ease",
};