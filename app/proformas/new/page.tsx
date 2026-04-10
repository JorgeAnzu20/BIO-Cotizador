"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Client = {
  id: number;
  full_name: string;
  document: string | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
  iva: boolean;
};

type Item = {
  product_id: number | null;
  description: string;
  qty: number;
  unit_price: number;
  taxable: boolean;
};

type ProformaSettings = {
  validez_oferta: string | null;
  plazo_ejecucion: string | null;
  forma_pago: string | null;
  garantia: string | null;
  otros: string | null;
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

const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

const modalVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: "easeIn" as const },
  },
};

export default function NewProformaPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [ivaRate, setIvaRate] = useState<number>(15);
  const [items, setItems] = useState<Item[]>([
    { product_id: null, description: "", qty: 1, unit_price: 0, taxable: true },
  ]);

  const [sellerName, setSellerName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [validezOferta, setValidezOferta] = useState("");
  const [plazoEjecucion, setPlazoEjecucion] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [garantia, setGarantia] = useState("");
  const [otros, setOtros] = useState("");

  const [showClientModal, setShowClientModal] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientMsg, setClientMsg] = useState("");

  const [newClientName, setNewClientName] = useState("");
  const [newClientDocument, setNewClientDocument] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + (it.qty * it.unit_price || 0), 0);

    const taxableBase = items
      .filter((it) => it.taxable)
      .reduce((acc, it) => acc + (it.qty * it.unit_price || 0), 0);

    const iva = +(taxableBase * (ivaRate / 100)).toFixed(2);
    const total = +(subtotal + iva).toFixed(2);

    return {
      subtotal: +subtotal.toFixed(2),
      iva,
      total,
    };
  }, [items, ivaRate]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();

    if (!q) return clients.slice(0, 30);

    return clients
      .filter((c) => {
        const name = (c.full_name ?? "").toLowerCase();
        const doc = (c.document ?? "").toLowerCase();
        return name.includes(q) || doc.includes(q);
      })
      .slice(0, 30);
  }, [clients, clientSearch]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function loadClients() {
    const { data: c } = await supabase
      .from("clients")
      .select("id, full_name, document")
      .order("id", { ascending: false });

    setClients((c ?? []) as Client[]);
  }

  async function loadProducts() {
    const { data: p } = await supabase
      .from("products")
      .select("id, name, price, iva")
      .order("id", { ascending: false });

    setProducts((p ?? []) as Product[]);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setSellerName(
        profile?.full_name?.trim() ? profile.full_name : user.email ?? "Vendedor"
      );

      await loadClients();
      await loadProducts();

      const { data: st } = await supabase
        .from("proforma_settings")
        .select("validez_oferta, plazo_ejecucion, forma_pago, garantia, otros")
        .eq("id", 1)
        .maybeSingle();

      const settings = (st ?? null) as ProformaSettings | null;

      setValidezOferta(settings?.validez_oferta ?? "90 Días");
      setPlazoEjecucion(
        settings?.plazo_ejecucion ??
          "30 días contados a partir de la suscripción del contrato"
      );
      setFormaPago(settings?.forma_pago ?? "50% al inicio y diferencia en la Entrega");
      setGarantia(settings?.garantia ?? "3 año de Garantía");
      setOtros(settings?.otros ?? "No incluye punto de red ni de luz.");

      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!clientId) return;

    const selected = clients.find((c) => c.id === clientId);
    if (selected) {
      setClientSearch(
        `${selected.full_name}${selected.document ? ` (${selected.document})` : ""}`
      );
    }
  }, [clientId, clients]);

  useEffect(() => {
    function handleClickOutside() {
      setShowClientDropdown(false);
    }

    if (showClientDropdown) {
      window.addEventListener("click", handleClickOutside);
    }

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [showClientDropdown]);

  function addRow() {
    setItems((prev) => [
      ...prev,
      { product_id: null, description: "", qty: 1, unit_price: 0, taxable: true },
    ]);
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onPickProduct(i: number, productId: number) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? {
              ...it,
              product_id: p.id,
              description: p.name,
              unit_price: Number(p.price),
              taxable: p.iva,
            }
          : it
      )
    );
  }

  async function saveNewClient() {
    setClientMsg("");

    if (!newClientName.trim()) {
      setClientMsg("El nombre o razón social es obligatorio.");
      return;
    }

    setSavingClient(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setSavingClient(false);
        setClientMsg("Tu sesión expiró.");
        router.push("/login");
        return;
      }

      const { data: inserted, error } = await supabase
        .from("clients")
        .insert({
          full_name: newClientName.trim(),
          document: newClientDocument.trim() || null,
          phone: newClientPhone.trim() || null,
          email: newClientEmail.trim() || null,
          address: newClientAddress.trim() || null,
          created_by: user.id,
        })
        .select("id, full_name, document")
        .single();

      setSavingClient(false);

      if (error) {
        setClientMsg(error.message);
        return;
      }

      const newClient = inserted as Client;

      setClients((prev) => [newClient, ...prev]);
      setClientId(newClient.id);
      setClientSearch(
        `${newClient.full_name}${newClient.document ? ` (${newClient.document})` : ""}`
      );

      setNewClientName("");
      setNewClientDocument("");
      setNewClientPhone("");
      setNewClientEmail("");
      setNewClientAddress("");
      setClientMsg("");
      setShowClientModal(false);
      setShowClientDropdown(false);
    } catch (err: any) {
      setSavingClient(false);
      setClientMsg(err?.message ?? "Error guardando cliente");
    }
  }

  async function save() {
    setMsg(null);

    if (!clientId) return setMsg("Selecciona un cliente.");
    if (items.length === 0) return setMsg("Agrega al menos un item.");

    for (const it of items) {
      if (!it.description.trim()) return setMsg("Hay un item sin descripción.");
      if (it.qty <= 0) return setMsg("Cantidad inválida.");
      if (it.unit_price < 0) return setMsg("Precio inválido.");
    }

    setSaving(true);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: newNumber, error: numErr } = await supabase.rpc("next_proforma_number");

    if (numErr || !newNumber) {
      setMsg("Error generando número de proforma: " + (numErr?.message ?? ""));
      setSaving(false);
      return;
    }

    const proformaNumber = newNumber as number;

    const { data: pro, error: err1 } = await supabase
      .from("proformas")
      .insert({
        number: proformaNumber,
        client_id: clientId,
        iva_rate: ivaRate,
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        seller_id: user.id,
        validez_oferta: validezOferta.trim() || null,
        plazo_ejecucion: plazoEjecucion.trim() || null,
        forma_pago: formaPago.trim() || null,
        garantia: garantia.trim() || null,
        otros: otros.trim() || null,
      })
      .select("id")
      .single();

    if (err1) {
      setMsg(err1.message);
      setSaving(false);
      return;
    }

    const proformaId = pro.id as number;

    const itemsPayload = items.map((it) => ({
      proforma_id: proformaId,
      product_id: it.product_id,
      description: it.description,
      qty: it.qty,
      unit_price: it.unit_price,
      taxable: it.taxable,
      line_total: +(it.qty * it.unit_price).toFixed(2),
    }));

    const { error: err2 } = await supabase.from("proforma_items").insert(itemsPayload);

    if (err2) {
      setMsg(err2.message);
      setSaving(false);
      return;
    }

    router.push(`/proformas/${proformaId}`);
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
              Proformas
            </div>

            <div style={{ fontSize: 14, marginBottom: 18, opacity: 0.9 }}>
              Crear nueva proforma
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/proformas" style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={navButtonStyle}
                >
                  ← Volver a proformas
                </motion.button>
              </Link>

              <motion.button
                onClick={save}
                style={primaryButtonStyle}
                disabled={saving}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? "Guardando..." : "Guardar proforma"}
              </motion.button>
            </div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Nuevo registro</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Nueva proforma
              </div>
              <div style={{ marginTop: 10 }}>
                Selecciona cliente, agrega productos y personaliza el objeto de compra.
              </div>
            </motion.div>

            <AnimatePresence>
              {msg && (
                <motion.div
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
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
                  : "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard title="Vendedor" value={sellerName || "-"} small />
              <MetricCard title="Subtotal" value={`$${totals.subtotal.toFixed(2)}`} />
              <MetricCard title="IVA" value={`$${totals.iva.toFixed(2)}`} />
              <MetricCard title="Total" value={`$${totals.total.toFixed(2)}`} />
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={sectionTitle}>Datos principales</div>

              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Cliente</label>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      marginTop: 6,
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        minWidth: isMobile ? "100%" : 360,
                        width: isMobile ? "100%" : undefined,
                        flex: 1,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={clientSearch}
                        placeholder="Escribe nombre, RUC o cédula..."
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setClientId(null);
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        style={inputStyle}
                      />

                      <AnimatePresence>
                        {showClientDropdown && (
                          <motion.div
                            variants={dropdownVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            style={{
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              left: 0,
                              right: 0,
                              background: COLORS.white,
                              border: `1px solid ${COLORS.grayBorder}`,
                              borderRadius: 14,
                              boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
                              maxHeight: 260,
                              overflowY: "auto",
                              zIndex: 50,
                            }}
                          >
                            {filteredClients.length === 0 ? (
                              <div
                                style={{
                                  padding: 12,
                                  color: COLORS.text,
                                  fontSize: 14,
                                }}
                              >
                                No se encontraron clientes.
                              </div>
                            ) : (
                              filteredClients.map((c, idx) => (
                                <motion.button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setClientId(c.id);
                                    setClientSearch(
                                      `${c.full_name}${c.document ? ` (${c.document})` : ""}`
                                    );
                                    setShowClientDropdown(false);
                                  }}
                                  whileHover={{ backgroundColor: "#F9FAFB" }}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    border: "none",
                                    background: COLORS.white,
                                    color: COLORS.text,
                                    padding: "12px 14px",
                                    cursor: "pointer",
                                    borderBottom:
                                      idx !== filteredClients.length - 1
                                        ? `1px solid ${COLORS.grayBorder}`
                                        : "none",
                                  }}
                                >
                                  <div style={{ fontWeight: 700 }}>{c.full_name}</div>
                                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                                    {c.document || "Sin documento"}
                                  </div>
                                </motion.button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        setClientMsg("");
                        setShowClientModal(true);
                      }}
                      style={{
                        ...primaryInlineButtonStyle,
                        width: isMobile ? "100%" : undefined,
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      + Cliente
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {clientId && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginTop: 8, fontSize: 13, color: COLORS.text }}
                      >
                        Cliente seleccionado correctamente.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <label style={labelStyle}>
                  IVA (%)
                  <input
                    type="number"
                    step="0.01"
                    value={ivaRate}
                    onChange={(e) => setIvaRate(Number(e.target.value))}
                    style={inputStyle}
                  />
                </label>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={sectionTitle}>Detalle de productos</div>

              <div style={{ display: "grid", gap: 12 }}>
                <AnimatePresence initial={false}>
                  {items.map((it, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      whileHover={{ y: -3, scale: 1.005 }}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: COLORS.bone,
                        border: "1px solid #D6D6D0",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div style={{ display: "grid", gap: 12 }}>
                        <select
                          value={it.product_id ?? ""}
                          onChange={(e) => onPickProduct(i, Number(e.target.value))}
                          style={selectStyle}
                        >
                          <option value="">(Elegir producto)</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - ${Number(p.price).toFixed(2)}
                            </option>
                          ))}
                        </select>

                        <input
                          placeholder="Descripción"
                          value={it.description}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, description: e.target.value } : x
                              )
                            )
                          }
                          style={inputStyle}
                        />

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr auto",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            step="0.01"
                            value={it.qty}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x, idx) =>
                                  idx === i ? { ...x, qty: Number(e.target.value) } : x
                                )
                              )
                            }
                            style={inputStyle}
                            placeholder="Cantidad"
                          />

                          <input
                            type="number"
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, unit_price: Number(e.target.value) }
                                    : x
                                )
                              )
                            }
                            style={inputStyle}
                            placeholder="Precio unitario"
                          />

                          <label
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              color: COLORS.text,
                              minHeight: 48,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={it.taxable}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((x, idx) =>
                                    idx === i ? { ...x, taxable: e.target.checked } : x
                                  )
                                )
                              }
                            />
                            Aplica IVA
                          </label>

                          {items.length > 1 && (
                            <motion.button
                              type="button"
                              onClick={() => removeRow(i)}
                              style={{
                                ...dangerButtonStyle,
                                width: isMobile ? "100%" : undefined,
                              }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              Eliminar
                            </motion.button>
                          )}
                        </div>

                        <div style={{ color: COLORS.text, fontWeight: 700 }}>
                          Total del ítem: ${(it.qty * it.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div>
                  <motion.button
                    type="button"
                    onClick={addRow}
                    style={secondaryButtonStyle}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    + Agregar ítem
                  </motion.button>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={sectionTitle}>Objeto de compra</div>

              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>
                  Validez de la oferta
                  <input
                    value={validezOferta}
                    onChange={(e) => setValidezOferta(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Plazo de ejecución
                  <input
                    value={plazoEjecucion}
                    onChange={(e) => setPlazoEjecucion(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Forma de pago
                  <input
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Garantía
                  <input
                    value={garantia}
                    onChange={(e) => setGarantia(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Otros
                  <textarea
                    value={otros}
                    onChange={(e) => setOtros(e.target.value)}
                    style={textareaStyle}
                  />
                </label>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showClientModal && (
          <motion.div
            onClick={() => {
              if (!savingClient) setShowClientModal(false);
            }}
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: isMobile ? 14 : 20,
              zIndex: 9999,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                width: "100%",
                maxWidth: 620,
                background: COLORS.bone,
                color: COLORS.text,
                border: `1px solid ${COLORS.grayBorder}`,
                borderRadius: 20,
                padding: isMobile ? 16 : 20,
                boxShadow: "0 20px 50px rgba(0,0,0,0.20)",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <h2 style={{ marginTop: 0, color: COLORS.text }}>Nuevo cliente</h2>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelStyle}>
                  Nombre / Razón social
                  <input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  RUC / Cédula
                  <input
                    value={newClientDocument}
                    onChange={(e) => setNewClientDocument(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Teléfono
                  <input
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Email
                  <input
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Vendedor
                  <input
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </div>

              <AnimatePresence>
                {clientMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      marginTop: 12,
                      background: "#FEE2E2",
                      border: "1px solid #FCA5A5",
                      color: "#991B1B",
                      borderRadius: 12,
                      padding: 12,
                      fontWeight: 600,
                    }}
                  >
                    {clientMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <motion.button
                  onClick={saveNewClient}
                  disabled={savingClient}
                  style={{
                    ...primaryInlineButtonStyle,
                    width: isMobile ? "100%" : undefined,
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {savingClient ? "Guardando..." : "Guardar cliente"}
                </motion.button>

                <motion.button
                  onClick={() => setShowClientModal(false)}
                  disabled={savingClient}
                  style={{
                    ...secondaryButtonStyle,
                    width: isMobile ? "100%" : undefined,
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function MetricCard({
  title,
  value,
  small = false,
}: {
  title: string;
  value: string;
  small?: boolean;
}) {
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
          fontSize: small ? 18 : 28,
          fontWeight: 900,
          lineHeight: 1.1,
          wordBreak: "break-word",
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

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 14,
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

const dangerButtonStyle: React.CSSProperties = {
  border: "none",
  background: COLORS.danger,
  color: COLORS.white,
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

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
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
  width: "100%",
};
