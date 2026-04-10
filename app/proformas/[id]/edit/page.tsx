"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
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
  id?: number;
  product_id: number | null;
  description: string;
  qty: number;
  unit_price: number;
  taxable: boolean;
};

type ProformaBase = {
  id: number;
  client_id: number | null;
  iva_rate: number;
  validez_oferta: string | null;
  plazo_ejecucion: string | null;
  forma_pago: string | null;
  garantia: string | null;
  otros: string | null;
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

export default function EditProformaPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [ivaRate, setIvaRate] = useState<number>(15);

  const [items, setItems] = useState<Item[]>([
    { product_id: null, description: "", qty: 1, unit_price: 0, taxable: true },
  ]);

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
    const subtotal = items.reduce(
      (acc, it) => acc + (Number(it.qty) * Number(it.unit_price) || 0),
      0
    );

    const taxableBase = items
      .filter((it) => it.taxable)
      .reduce(
        (acc, it) => acc + (Number(it.qty) * Number(it.unit_price) || 0),
        0
      );

    const iva = +(taxableBase * (ivaRate / 100)).toFixed(2);
    const total = +(subtotal + iva).toFixed(2);

    return {
      subtotal: +subtotal.toFixed(2),
      iva,
      total,
    };
  }, [items, ivaRate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, full_name, document")
      .order("id", { ascending: false });

    setClients((data ?? []) as Client[]);
  }

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, iva")
      .order("id", { ascending: false });

    setProducts((data ?? []) as Product[]);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      await loadClients();
      await loadProducts();

      const { data: proforma, error: proErr } = await supabase
        .from("proformas")
        .select(`
          id,
          client_id,
          iva_rate,
          validez_oferta,
          plazo_ejecucion,
          forma_pago,
          garantia,
          otros
        `)
        .eq("id", id)
        .single();

      if (proErr || !proforma) {
        setMsg(proErr?.message ?? "No se pudo cargar la proforma.");
        setLoading(false);
        return;
      }

      const { data: itemRows, error: itemErr } = await supabase
        .from("proforma_items")
        .select("id, product_id, description, qty, unit_price, taxable")
        .eq("proforma_id", id)
        .order("id", { ascending: true });

      if (itemErr) {
        setMsg(itemErr.message);
        setLoading(false);
        return;
      }

      const p = proforma as ProformaBase;

      setClientId(p.client_id ?? null);
      setIvaRate(Number(p.iva_rate ?? 15));
      setValidezOferta(p.validez_oferta ?? "");
      setPlazoEjecucion(p.plazo_ejecucion ?? "");
      setFormaPago(p.forma_pago ?? "");
      setGarantia(p.garantia ?? "");
      setOtros(p.otros ?? "");

      if (itemRows && itemRows.length > 0) {
        setItems(
          itemRows.map((it: any) => ({
            id: it.id,
            product_id: it.product_id,
            description: it.description ?? "",
            qty: Number(it.qty ?? 1),
            unit_price: Number(it.unit_price ?? 0),
            taxable: !!it.taxable,
          }))
        );
      } else {
        setItems([
          { product_id: null, description: "", qty: 1, unit_price: 0, taxable: true },
        ]);
      }

      if (
        !p.validez_oferta &&
        !p.plazo_ejecucion &&
        !p.forma_pago &&
        !p.garantia &&
        !p.otros
      ) {
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
      }

      setLoading(false);
    })();
  }, [id, router]);

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

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      router.push("/login");
      return;
    }

    setSavingClient(true);

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

    setNewClientName("");
    setNewClientDocument("");
    setNewClientPhone("");
    setNewClientEmail("");
    setNewClientAddress("");
    setClientMsg("");
    setShowClientModal(false);
  }

  async function save() {
    if (saving) return;

    setMsg(null);

    if (!clientId) {
      setMsg("Selecciona un cliente.");
      return;
    }

    if (items.length === 0) {
      setMsg("Agrega al menos un ítem.");
      return;
    }

    for (const it of items) {
      if (!it.description.trim()) {
        setMsg("Hay un ítem sin descripción.");
        return;
      }
      if (Number(it.qty) <= 0) {
        setMsg("Cantidad inválida.");
        return;
      }
      if (Number(it.unit_price) < 0) {
        setMsg("Precio inválido.");
        return;
      }
    }

    setSaving(true);

    try {
      const { error: proErr } = await supabase
        .from("proformas")
        .update({
          client_id: clientId,
          iva_rate: ivaRate,
          subtotal: totals.subtotal,
          iva: totals.iva,
          total: totals.total,
          validez_oferta: validezOferta.trim() || null,
          plazo_ejecucion: plazoEjecucion.trim() || null,
          forma_pago: formaPago.trim() || null,
          garantia: garantia.trim() || null,
          otros: otros.trim() || null,
        })
        .eq("id", id);

      if (proErr) throw proErr;

      const { error: delErr } = await supabase
        .from("proforma_items")
        .delete()
        .eq("proforma_id", id);

      if (delErr) throw delErr;

      const itemsPayload = items.map((it) => ({
        proforma_id: id,
        product_id: it.product_id,
        description: it.description.trim(),
        qty: Number(it.qty),
        unit_price: Number(it.unit_price),
        taxable: !!it.taxable,
        line_total: +(Number(it.qty) * Number(it.unit_price)).toFixed(2),
      }));

      const { error: insErr } = await supabase
        .from("proforma_items")
        .insert(itemsPayload);

      if (insErr) throw insErr;

      router.push(`/proformas/${id}`);
    } catch (error: any) {
      setMsg(error?.message ?? "No se pudo guardar la proforma.");
    } finally {
      setSaving(false);
    }
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
              Editar proforma
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
</div>
          </motion.div>

          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            <motion.div variants={itemVariants} style={panelStyle}>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Edición</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                Editar proforma
              </div>
              <div style={{ marginTop: 10 }}>
                Actualiza cliente, ítems y datos del objeto de compra.
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
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginTop: 6,
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    <select
                      value={clientId ?? ""}
                      onChange={(e) => setClientId(Number(e.target.value))}
                      style={{
                        ...selectStyle,
                        minWidth: isMobile ? "100%" : 360,
                        width: isMobile ? "100%" : undefined,
                      }}
                    >
                      <option value="" disabled>
                        Selecciona...
                      </option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name} {c.document ? `(${c.document})` : ""}
                        </option>
                      ))}
                    </select>

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
                      key={it.id ?? `new-${i}`}
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
                                  idx === i ? { ...x, unit_price: Number(e.target.value) } : x
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
      
<motion.div variants={itemVariants} style={panelStyle}>
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: 12,
      flexDirection: isMobile ? "column" : "row",
    }}
  >
    <motion.button
      type="button"
      onClick={save}
      style={{
        ...primaryInlineButtonStyle,
        width: isMobile ? "100%" : undefined,
      }}
      disabled={saving}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {saving ? "Guardando..." : "Guardar cambios"}
    </motion.button>
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
                  Cuidad
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
}: {
  title: string;
  value: string;
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
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1.1,
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
