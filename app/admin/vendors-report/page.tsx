"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type ProformaRow = {
  id: number;
  seller_id: string | null;
  total: number | null;
  created_at: string;
  venta_confirmada: boolean | null;
};

type SellerMetric = {
  id: string;
  name: string;
  role: string;
  totalProformas: number;
  totalConfirmadas: number;
  ventasHoy: number;
  ventasMes: number;
};

const COLORS = {
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
  bone: "#F5F5F0",
  grayBg: "#E5E7EB",
  grayBorder: "#E5E7EB",
  blue: "#05AFF2",
  cyan: "#05DBF2",
  aqua: "#05F2F2",
  danger: "#ff5a5a",
  green: "#22c55e",
  greenSoft: "#DCFCE7",
  yellow: "#f59e0b",
  yellowSoft: "#FEF3C7",
  purple: "#8b5cf6",
  pink: "#ec4899",
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

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isSameMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
  });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.grayBorder}`,
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
        color: COLORS.text,
        minWidth: 140,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      {payload.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            marginTop: 4,
          }}
        >
          <span>{item.name}</span>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

export default function VendorsReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [proformas, setProformas] = useState<ProformaRow[]>([]);
  const [search, setSearch] = useState("");
  const [myUserId, setMyUserId] = useState("");
  const [myRole, setMyRole] = useState("");

  async function load() {
    setMsg("");
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/login");
      return;
    }

    setMyUserId(user.id);

    const { data: myProfile, error: myErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (myErr) {
      setMsg(myErr.message);
      setLoading(false);
      return;
    }

    const role = myProfile?.role ?? "";
    setMyRole(role);

    if (role !== "admin" && role !== "worker") {
      router.push("/");
      return;
    }

    const { data: profileRows, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name", { ascending: true });

    if (profilesErr) {
      setMsg(profilesErr.message);
      setLoading(false);
      return;
    }

    const { data: proformaRows, error: proformasErr } = await supabase
      .from("proformas")
      .select("id, seller_id, total, created_at, venta_confirmada")
      .order("id", { ascending: false });

    if (proformasErr) {
      setMsg(proformasErr.message);
      setLoading(false);
      return;
    }

    setProfiles((profileRows ?? []) as ProfileRow[]);
    setProformas((proformaRows ?? []) as ProformaRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const sellerMetrics = useMemo(() => {
    let visibleProfiles = profiles.filter(
      (p) => p.role === "admin" || p.role === "worker"
    );

    if (myRole === "worker") {
      visibleProfiles = visibleProfiles.filter((p) => p.id === myUserId);
    }

    const base = visibleProfiles.map((profile) => {
      const mine = proformas.filter((p) => p.seller_id === profile.id);
      const confirmadas = mine.filter((p) => p.venta_confirmada);

      return {
        id: profile.id,
        name: profile.full_name?.trim() || "Sin nombre",
        role: profile.role || "-",
        totalProformas: mine.length,
        totalConfirmadas: confirmadas.length,
        ventasHoy: confirmadas.filter((p) => isToday(p.created_at)).length,
        ventasMes: confirmadas.filter((p) => isSameMonth(p.created_at)).length,
      };
    });

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      );
    });
  }, [profiles, proformas, search, myRole, myUserId]);

  const totalProformas = useMemo(() => {
    return sellerMetrics.reduce((acc, s) => acc + s.totalProformas, 0);
  }, [sellerMetrics]);

  const totalConfirmadas = useMemo(() => {
    return sellerMetrics.reduce((acc, s) => acc + s.totalConfirmadas, 0);
  }, [sellerMetrics]);

  const totalHoy = useMemo(() => {
    return sellerMetrics.reduce((acc, s) => acc + s.ventasHoy, 0);
  }, [sellerMetrics]);

  const totalMes = useMemo(() => {
    return sellerMetrics.reduce((acc, s) => acc + s.ventasMes, 0);
  }, [sellerMetrics]);

  const chartData = useMemo(() => {
    return sellerMetrics.map((s) => ({
      name: s.name,
      confirmadas: s.totalConfirmadas,
      proformas: s.totalProformas,
      hoy: s.ventasHoy,
      mes: s.ventasMes,
    }));
  }, [sellerMetrics]);

  const pieData = useMemo(() => {
    const pendientes = Math.max(totalProformas - totalConfirmadas, 0);
    return [
      { name: "Confirmadas", value: totalConfirmadas },
      { name: "Pendientes", value: pendientes },
    ];
  }, [totalProformas, totalConfirmadas]);

  const salesByDayData = useMemo(() => {
    const source =
      myRole === "worker"
        ? proformas.filter((p) => p.seller_id === myUserId && p.venta_confirmada)
        : proformas.filter((p) => p.venta_confirmada);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const grouped = source
      .filter((p) => {
        const d = new Date(p.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce<Record<string, number>>((acc, p) => {
        const key = formatShortDate(p.created_at);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    return Object.entries(grouped).map(([date, value]) => ({
      date,
      ventas: value,
    }));
  }, [proformas, myRole, myUserId]);

  const topSellersMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return sellerMetrics
      .map((seller) => {
        const mine = proformas.filter(
          (p) =>
            p.seller_id === seller.id &&
            p.venta_confirmada &&
            new Date(p.created_at).getMonth() === currentMonth &&
            new Date(p.created_at).getFullYear() === currentYear
        );

        return {
          name: seller.name,
          ventasMes: mine.length,
        };
      })
      .sort((a, b) => b.ventasMes - a.ventasMes)
      .slice(0, 5);
  }, [sellerMetrics, proformas]);

  const topSeller = useMemo(() => {
    if (sellerMetrics.length === 0) return null;
    return [...sellerMetrics].sort(
      (a, b) =>
        b.totalConfirmadas - a.totalConfirmadas ||
        b.totalProformas - a.totalProformas
    )[0];
  }, [sellerMetrics]);

  if (loading) {
    return (
      <PageShell>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.text,
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
              {myRole === "admin" ? "Vendedores" : "Mis ventas"}
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              {myRole === "admin"
                ? "Resumen de rendimiento comercial"
                : "Resumen de tu rendimiento comercial"}
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

            {topSeller && (
              <motion.div
                variants={itemVariants}
                style={{
                  marginTop: 18,
                  background: COLORS.bone,
                  borderRadius: 18,
                  padding: 14,
                  border: `1px solid ${COLORS.grayBorder}`,
                }}
              >
                <div style={{ fontSize: 13, color: COLORS.muted }}>Destacado</div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
                  {myRole === "admin" ? topSeller.name : "Tu rendimiento"}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: COLORS.text }}>
                  Ventas confirmadas: <b>{topSeller.totalConfirmadas}</b>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: COLORS.text }}>
                  Proformas: <b>{topSeller.totalProformas}</b>
                </div>
              </motion.div>
            )}
          </motion.div>

          <div style={{ display: "grid", gap: 20 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Módulo</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                {myRole === "admin" ? "Reporte de vendedores" : "Reporte de ventas"}
              </div>
              <div style={{ marginTop: 10 }}>
                {myRole === "admin"
                  ? "Consulta proformas, ventas confirmadas y rendimiento mensual con gráficos más claros."
                  : "Consulta tus proformas creadas, ventas confirmadas y tu rendimiento del mes con gráficos."}
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
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard title="Proformas totales" value={String(totalProformas)} />
              <MetricCard title="Ventas confirmadas" value={String(totalConfirmadas)} />
              <MetricCard title="Ventas de hoy" value={String(totalHoy)} />
              <MetricCard title="Ventas del mes" value={String(totalMes)} />
            </motion.div>

            {myRole === "admin" && (
              <motion.div variants={itemVariants} style={panelStyle}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                  Buscar vendedor
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o rol..."
                  style={inputStyle}
                />
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 20,
              }}
            >
              <ChartPanel title="Ventas confirmadas por vendedor">
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="confirmadas" name="Confirmadas" fill={COLORS.green} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Proformas creadas por vendedor">
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="proformas" name="Proformas" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </motion.div>

            <motion.div
              variants={itemVariants}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 20,
              }}
            >
              <ChartPanel title="Ventas confirmadas del mes">
                <ResponsiveContainer>
                  <BarChart data={salesByDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ventas" name="Ventas" fill={COLORS.purple} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Confirmadas vs pendientes">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={45}
                      label
                    >
                      <Cell fill={COLORS.green} />
                      <Cell fill={COLORS.yellow} />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </motion.div>

            {myRole === "admin" && (
              <motion.div variants={itemVariants}>
                <ChartPanel title="Top vendedores del mes" height={340}>
                  <ResponsiveContainer>
                    <BarChart data={topSellersMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="ventasMes" name="Ventas mes" fill={COLORS.pink} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </motion.div>
            )}

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                {myRole === "admin" ? "Listado de vendedores" : "Reportes"}
              </div>

              {sellerMetrics.length === 0 ? (
                <div style={{ color: COLORS.text }}>No hay datos para mostrar.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <AnimatePresence initial={false}>
                    {sellerMetrics.map((seller, index) => (
                      <motion.div
                        key={seller.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                        whileHover={{ y: -3, scale: 1.005 }}
                        style={{
                          borderRadius: 22,
                          padding: 16,
                          background: COLORS.bone,
                          border: "1px solid #D6D6D0",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 20,
                                color: COLORS.text,
                              }}
                            >
                              {myRole === "admin" ? seller.name : "Tu resumen"}
                            </div>

                            <div style={{ marginTop: 6, fontSize: 14, color: COLORS.text }}>
                              <b>Rol:</b> {seller.role}
                            </div>
                          </div>

                          <div
                            style={{
                              alignSelf: "flex-start",
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: seller.totalConfirmadas > 0 ? COLORS.greenSoft : COLORS.yellowSoft,
                              color: seller.totalConfirmadas > 0 ? "#166534" : "#92400E",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {seller.totalConfirmadas > 0 ? "Con ventas" : "Sin confirmar"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                            gap: 12,
                            marginTop: 16,
                          }}
                        >
                          <SmallMetricCard title="Proformas hechas" value={String(seller.totalProformas)} />
                          <SmallMetricCard title="Ventas confirmadas" value={String(seller.totalConfirmadas)} />
                          <SmallMetricCard title="Ventas hoy" value={String(seller.ventasHoy)} />
                          <SmallMetricCard title="Ventas mes" value={String(seller.ventasMes)} />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageShell>
  );
}

function ChartPanel({
  title,
  children,
  height = 300,
}: {
  title: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <motion.div variants={itemVariants} style={panelStyle}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{ width: "100%", height }}>{children}</div>
    </motion.div>
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
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}

function SmallMetricCard({ title, value }: { title: string; value: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.grayBorder}`,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 13, color: COLORS.text }}>{title}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: 24,
          fontWeight: 900,
          color: COLORS.text,
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: 12,
  borderRadius: 14,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  boxSizing: "border-box",
};