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
  const [isMobile, setIsMobile] = useState(false);

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
    const user = auth.user;

    if (!user) {
      router.push("/login");
      return;
    }

    setMyUserId(user.id);

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = myProfile?.role ?? "";
    setMyRole(role);

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, role");

    const { data: proformaRows } = await supabase
      .from("proformas")
      .select("id, seller_id, total, created_at, venta_confirmada");

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

    return base;
  }, [profiles, proformas, myRole, myUserId]);

  const totalProformas = sellerMetrics.reduce((a, s) => a + s.totalProformas, 0);
  const totalConfirmadas = sellerMetrics.reduce((a, s) => a + s.totalConfirmadas, 0);
  const totalHoy = sellerMetrics.reduce((a, s) => a + s.ventasHoy, 0);
  const totalMes = sellerMetrics.reduce((a, s) => a + s.ventasMes, 0);

  const chartData = sellerMetrics.map((s) => ({
    name: s.name,
    confirmadas: s.totalConfirmadas,
  }));

  const pieData = [
    { name: "Confirmadas", value: totalConfirmadas },
    { name: "Pendientes", value: totalProformas - totalConfirmadas },
  ];

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", padding: 40 }}>Cargando...</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
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
          <motion.div variants={sidebarVariants} style={panelStyle}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              Reportes
            </div>

            <Link href="/">
              <button style={navButtonStyle}>← Volver</button>
            </Link>
          </motion.div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 12 }}>
              <MetricCard title="Proformas" value={String(totalProformas)} />
              <MetricCard title="Confirmadas" value={String(totalConfirmadas)} />
              <MetricCard title="Hoy" value={String(totalHoy)} />
              <MetricCard title="Mes" value={String(totalMes)} />
            </div>

            <ChartPanel title="Ventas por vendedor">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="confirmadas" fill={COLORS.green} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Estado de ventas">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value">
                    <Cell fill={COLORS.green} />
                    <Cell fill={COLORS.yellow} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </div>
      </motion.div>
    </PageShell>
  );
}

function MetricCard({ title, value }: any) {
  return (
    <div style={panelStyle}>
      <div>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function ChartPanel({ title, children }: any) {
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ height: 300 }}>{children}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.bone,
  padding: 16,
  borderRadius: 16,
};

const navButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
};
