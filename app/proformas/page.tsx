"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Row = {
  id: number;
  number: number;
  total: number;
  created_at: string;
  venta_confirmada: boolean;
  seller_id: string | null;
  clients: { full_name: string } | null;
};

function money(n: number | null | undefined) {
  return Number(n ?? 0).toFixed(2);
}

function getMonthValue(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonthValue(value: string) {
  const [year, month] = value.split("-");
  if (!year || !month) return "";
  if (year.length !== 4 || month.length !== 2) return "";
  return `${year}-${month}`;
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

export default function ProformasPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [monthFromMonth, setMonthFromMonth] = useState("");
  const [monthFromYear, setMonthFromYear] = useState("");

  const [monthToMonth, setMonthToMonth] = useState("");
  const [monthToYear, setMonthToYear] = useState("");

  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  const yearOptions = Array.from({ length: 65 }, (_, i) => String(2026 + i));
  const monthOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const monthFrom =
    monthFromYear && monthFromMonth ? `${monthFromYear}-${monthFromMonth}` : "";

  const monthTo =
    monthToYear && monthToMonth ? `${monthToYear}-${monthToMonth}` : "";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function load() {
    setMsg("");
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) throw profileErr;

      const role = profile?.role ?? "";

      let query = supabase
        .from("proformas")
        .select(
          "id, number, total, created_at, venta_confirmada, seller_id, clients(full_name)"
        )
        .order("id", { ascending: false });

      if (role !== "admin") {
        query = query.eq("seller_id", user.id);
      }

      const { data: r, error } = await query;

      if (error) throw error;

      const normalizedRows: Row[] = (r ?? []).map((row: any) => ({
        ...row,
        clients: Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients,
      }));

      setRows(normalizedRows);
    } catch (error: any) {
      setMsg(error?.message ?? "No se pudo cargar las proformas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let data = [...rows];

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((p) => {
        const numberText = String(p.number ?? "").toLowerCase();
        const clientText = String(p.clients?.full_name ?? "").toLowerCase();
        return numberText.includes(q) || clientText.includes(q);
      });
    }

    if (dateFrom) {
      data = data.filter((p) => {
        const created = new Date(p.created_at);
        const from = new Date(`${dateFrom}T00:00:00`);
        return created >= from;
      });
    }

    if (dateTo) {
      data = data.filter((p) => {
        const created = new Date(p.created_at);
        const to = new Date(`${dateTo}T23:59:59`);
        return created <= to;
      });
    }

    if (monthFrom) {
      const fromMonth = normalizeMonthValue(monthFrom);
      if (fromMonth) {
        data = data.filter((p) => getMonthValue(p.created_at) >= fromMonth);
      }
    }

    if (monthTo) {
      const toMonth = normalizeMonthValue(monthTo);
      if (toMonth) {
        data = data.filter((p) => getMonthValue(p.created_at) <= toMonth);
      }
    }

    if (yearFrom) {
      data = data.filter((p) => {
        const y = new Date(p.created_at).getFullYear();
        return y >= Number(yearFrom);
      });
    }

    if (yearTo) {
      data = data.filter((p) => {
        const y = new Date(p.created_at).getFullYear();
        return y <= Number(yearTo);
      });
    }

    return data;
  }, [rows, search, dateFrom, dateTo, monthFrom, monthTo, yearFrom, yearTo]);

  const totalVendido = useMemo(() => {
    return filtered.filter((p) => p.venta_confirmada).length;
  }, [filtered]);

  async function deleteProforma(id: number) {
    if (deletingId !== null) return;

    const ok = window.confirm(
      "¿Seguro que deseas eliminar esta proforma?\n\nSe eliminarán también sus ítems."
    );
    if (!ok) return;

    setMsg("");
    setDeletingId(id);

    try {
      const { error: errItems } = await supabase
        .from("proforma_items")
        .delete()
        .eq("proforma_id", id);

      if (errItems) throw new Error("Error eliminando ítems: " + errItems.message);

      const { error: errPro } = await supabase
        .from("proformas")
        .delete()
        .eq("id", id);

      if (errPro) throw new Error("Error eliminando proforma: " + errPro.message);

      await load();
      setMsg("✅ Proforma eliminada");
    } catch (error: any) {
      setMsg(error?.message ?? "No se pudo eliminar la proforma.");
    } finally {
      setDeletingId(null);
    }
  }

  async function confirmSale(id: number, currentStatus: boolean) {
    if (confirmingId !== null) return;

    setMsg("");
    setConfirmingId(id);

    try {
      const nextStatus = !currentStatus;

      const { data, error } = await supabase
        .from("proformas")
        .update({ venta_confirmada: nextStatus })
        .eq("id", id)
        .select("id, venta_confirmada")
        .single();

      if (error) throw new Error("Error actualizando venta: " + error.message);
      if (!data) throw new Error("No se pudo confirmar la venta.");

      setRows((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, venta_confirmada: data.venta_confirmada } : x
        )
      );

      setMsg(data.venta_confirmada ? "✅ Venta confirmada" : "✅ Confirmación removida");
      await load();
    } catch (error: any) {
      setMsg(error?.message ?? "No se pudo actualizar la venta.");
    } finally {
      setConfirmingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setMonthFromMonth("");
    setMonthFromYear("");
    setMonthToMonth("");
    setMonthToYear("");
    setYearFrom("");
    setYearTo("");
  }
async function exportToExcel() {
  try {
    setMsg("Generando Excel...");

    if (filtered.length === 0) {
      setMsg("No hay datos para exportar");
      return;
    }

    const ids = filtered.map((p) => p.id);

    const { data: proformas, error } = await supabase
      .from("proformas")
      .select(`
        id,
        number,
        total,
        created_at,

        clients (
          full_name,
          identification,
          email,
          phone
        ),

        profiles (
          full_name
        ),

        proforma_items (
          id,
          quantity,
          price,
          products (
            name
          )
        )
      `)
      .in("id", ids);

    if (error) throw error;

    const rowsExcel = (proformas || []).map((p: any) => {
      const items = (p.proforma_items || []).sort(
        (a: any, b: any) => a.id - b.id
      );

      const productos = Array(9).fill("");

      items.slice(0, 9).forEach((item: any, i: number) => {
        productos[i] = item.products?.name || "";
      });

      const total = Number(p.total || 0);
      const subtotal = total / 1.15;
      const iva = total - subtotal;

      return {
        Fecha: new Date(p.created_at).toLocaleDateString("es-EC"),
        "Tipo Documento": "PROFORMA",
        "# Documento": p.number,

        Cliente: p.clients?.full_name || "",
        Identificación: p.clients?.identification || "",
        CORREO: p.clients?.email || "",
        TELEFONO: p.clients?.phone || "",

        VENDEDOR: p.profiles?.full_name || "",

        "PRODUCTO 1": productos[0],
        "PRODUCTO 2": productos[1],
        "PRODUCTO 3": productos[2],
        "PRODUCTO 4": productos[3],
        "PRODUCTO 5": productos[4],
        "PRODUCTO 6": productos[5],
        "PRODUCTO 7": productos[6],
        "PRODUCTO 8": productos[7],
        "PRODUCTO 9": productos[8],

        "Subtotal IVA": Number(subtotal.toFixed(2)),
        IVA: Number(iva.toFixed(2)),
        Total: total,
        Saldo: total
      };
    });

    const ws = XLSX.utils.json_to_sheet(rowsExcel);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, "reporte_proformas.xlsx");

    setMsg("✅ Excel generado correctamente");
  } catch (err) {
    console.error(err);
    setMsg("Error generando Excel");
  }
}
     
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      style={{
        minHeight: "100vh",
        background: COLORS.grayBg,
        color: COLORS.text,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <motion.div
        variants={itemVariants}
        style={{
          maxWidth: 1300,
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
              Proformas
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Gestión completa de cotizaciones
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

              <Link href="/proformas/new" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={primaryButtonStyle}
                >
                  + Nueva proforma
                </motion.button>
              </Link>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={load}
                style={navButtonStyle}
              >
                Recargar
              </motion.button>
              <motion.button
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  onClick={exportToExcel}
  style={navButtonStyle}
>
  Descargar Excel
</motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={bonePanel}>
              <div style={{ fontSize: 14, opacity: 0.85, color: COLORS.text }}>
                Módulo
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  marginTop: 6,
                  lineHeight: 1.1,
                  color: COLORS.text,
                }}
              >
                Proformas
              </div>
              <div style={{ marginTop: 10, color: COLORS.text }}>
                Filtra, consulta, edita y descarga tus cotizaciones desde un solo lugar.
              </div>
            </motion.div>

            {msg && (
              <motion.div
                variants={itemVariants}
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

            <motion.div
              variants={itemVariants}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard title="Cantidad de proformas" value={String(filtered.length)} />
              <MetricCard title="Ventas confirmadas" value={String(totalVendido)} />
            </motion.div>

            <motion.div variants={itemVariants} style={bonePanel}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                Filtros avanzados
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>
                  Buscar por número o cliente
                  <input
                    placeholder="Ej: 25 o nombre del cliente"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      ...inputStyle,
                      maxWidth: isMobile ? "100%" : 320,
                    }}
                  />
                </label>

                <div
                  style={{
                    ...rowWrapStyle,
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <label style={labelStyle}>
                    Desde qué día
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{
                        ...inputStyle,
                        maxWidth: isMobile ? "100%" : 320,
                      }}
                    />
                  </label>

                  <label style={labelStyle}>
                    Hasta qué día
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{
                        ...inputStyle,
                        maxWidth: isMobile ? "100%" : 320,
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    ...rowWrapStyle,
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <div style={{ width: isMobile ? "100%" : "auto" }}>
                    <label style={labelStyle}>Desde qué mes</label>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 6,
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <select
                        value={monthFromMonth}
                        onChange={(e) => setMonthFromMonth(e.target.value)}
                        style={{
                          ...selectStyle,
                          minWidth: isMobile ? "100%" : 100,
                          width: isMobile ? "100%" : undefined,
                        }}
                      >
                        <option value="">MM</option>
                        {monthOptions.map((m) => (
                          <option key={`from-month-${m}`} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={monthFromYear}
                        onChange={(e) => setMonthFromYear(e.target.value)}
                        style={{
                          ...selectStyle,
                          minWidth: isMobile ? "100%" : 100,
                          width: isMobile ? "100%" : undefined,
                        }}
                      >
                        <option value="">AAAA</option>
                        {yearOptions.map((y) => (
                          <option key={`from-year-${y}`} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ width: isMobile ? "100%" : "auto" }}>
                    <label style={labelStyle}>Hasta qué mes</label>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 6,
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <select
                        value={monthToMonth}
                        onChange={(e) => setMonthToMonth(e.target.value)}
                        style={{
                          ...selectStyle,
                          minWidth: isMobile ? "100%" : 100,
                          width: isMobile ? "100%" : undefined,
                        }}
                      >
                        <option value="">MM</option>
                        {monthOptions.map((m) => (
                          <option key={`to-month-${m}`} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={monthToYear}
                        onChange={(e) => setMonthToYear(e.target.value)}
                        style={{
                          ...selectStyle,
                          minWidth: isMobile ? "100%" : 100,
                          width: isMobile ? "100%" : undefined,
                        }}
                      >
                        <option value="">AAAA</option>
                        {yearOptions.map((y) => (
                          <option key={`to-year-${y}`} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    ...rowWrapStyle,
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <label style={labelStyle}>
                    Desde qué año
                    <select
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      style={{
                        ...selectBlockStyle,
                        minWidth: isMobile ? "100%" : 170,
                        width: isMobile ? "100%" : undefined,
                      }}
                    >
                      <option value="">Todos</option>
                      {yearOptions.map((y) => (
                        <option key={`year-from-${y}`} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={labelStyle}>
                    Hasta qué año
                    <select
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      style={{
                        ...selectBlockStyle,
                        minWidth: isMobile ? "100%" : 170,
                        width: isMobile ? "100%" : undefined,
                      }}
                    >
                      <option value="">Todos</option>
                      {yearOptions.map((y) => (
                        <option key={`year-to-${y}`} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearFilters}
                    style={navButtonStyle}
                  >
                    Limpiar filtros
                  </motion.button>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={bonePanel}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                Listado de proformas
              </div>

              {loading ? (
                <div style={{ color: COLORS.text }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ color: COLORS.text }}>No hay proformas.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {filtered.map((p, index) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
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
                          flexDirection: isMobile ? "column" : "row",
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
                            Proforma #{p.number}
                          </div>
                          <div style={{ marginTop: 6, color: COLORS.text }}>
                            <b>Cliente:</b> {p.clients?.full_name ?? "Cliente"}
                          </div>
                          <div style={{ marginTop: 4, color: COLORS.text, fontSize: 14 }}>
                            <b>Fecha:</b>{" "}
                            {new Date(p.created_at).toLocaleDateString("es-EC")}
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                background: p.venta_confirmada ? "#DCFCE7" : "#FEF3C7",
                                color: p.venta_confirmada ? "#166534" : "#92400E",
                              }}
                            >
                              {p.venta_confirmada ? "Venta confirmada" : "Pendiente"}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: isMobile ? "left" : "right" }}>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 24,
                              color: COLORS.text,
                            }}
                          >
                            ${money(p.total)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 14,
                        }}
                      >
                        <Link href={`/proformas/${p.id}`}>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={actionButtonStyle}
                          >
                            Ver
                          </motion.button>
                        </Link>

                        <Link href={`/proformas/${p.id}/edit`}>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={actionButtonStyle}
                          >
                            Editar
                          </motion.button>
                        </Link>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => window.open(`/api/proformas/${p.id}/pdf`, "_blank")}
                          style={actionButtonStyle}
                        >
                          Descargar PDF
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => confirmSale(p.id, p.venta_confirmada)}
                          disabled={confirmingId === p.id || deletingId !== null}
                          style={p.venta_confirmada ? successButtonStyle : confirmButtonStyle}
                        >
                          {confirmingId === p.id
                            ? "Guardando..."
                            : p.venta_confirmada
                            ? "Venta confirmada"
                            : "Confirmar venta"}
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => deleteProforma(p.id)}
                          disabled={deletingId === p.id || confirmingId !== null}
                          style={dangerButtonStyle}
                        >
                          {deletingId === p.id ? "Eliminando..." : "Eliminar"}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
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
      <div style={{ fontSize: 14, color: COLORS.text }}>{title}</div>
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

const bonePanel: React.CSSProperties = {
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
  transition: "all 0.2s ease",
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
  transition: "all 0.2s ease",
};

const actionButtonStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const confirmButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#facc15",
  color: "#1F2937",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const successButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#22c55e",
  color: "white",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "none",
  background: COLORS.danger,
  color: COLORS.white,
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: 10,
  marginTop: 6,
  borderRadius: 12,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  minWidth: 100,
};

const selectBlockStyle: React.CSSProperties = {
  display: "block",
  padding: 10,
  marginTop: 6,
  borderRadius: 12,
  border: `1px solid ${COLORS.grayBorder}`,
  background: COLORS.white,
  color: COLORS.text,
  outline: "none",
  minWidth: 170,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  color: COLORS.text,
  width: "100%",
};

const rowWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
};
