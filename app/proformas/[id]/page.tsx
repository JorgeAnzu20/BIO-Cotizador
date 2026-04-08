"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Proforma = {
  id: number;
  number: number;
  iva_rate: number;
  subtotal: number;
  iva: number;
  total: number;
  created_at: string;

  validez_oferta: string | null;
  plazo_ejecucion: string | null;
  forma_pago: string | null;
  garantia: string | null;
  otros: string | null;

  clients: {
    full_name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;

  profiles: {
    full_name: string | null;
  } | null;
};

type Item = {
  id: number;
  description: string;
  qty: number;
  unit_price: number;
  taxable: boolean;
  line_total: number;
};

const BUCKET = "proforma-assets";

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

function money(n: number | null | undefined) {
  return Number(n ?? 0).toFixed(2);
}

function formatDateLong(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("es-EC", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ProformaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [p, setP] = useState<Proforma | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");

  const [headerUrl, setHeaderUrl] = useState("");
  const [footerUrl, setFooterUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: pro, error: err1 } = await supabase
        .from("proformas")
        .select(`
          id,
          number,
          iva_rate,
          subtotal,
          iva,
          total,
          created_at,
          validez_oferta,
          plazo_ejecucion,
          forma_pago,
          garantia,
          otros,
          clients(full_name, document, phone, email, address),
          profiles(full_name)
        `)
        .eq("id", id)
        .single();

      if (err1) {
        setMsg(err1.message);
        return;
      }

      const { data: it, error: err2 } = await supabase
        .from("proforma_items")
        .select("id, description, qty, unit_price, taxable, line_total")
        .eq("proforma_id", id)
        .order("id", { ascending: true });

      if (err2) {
        setMsg(err2.message);
        return;
      }

      const { data: h } = supabase.storage.from(BUCKET).getPublicUrl("header.png");
      const { data: f } = supabase.storage.from(BUCKET).getPublicUrl("footer.png");

      const t = Date.now();
      setHeaderUrl(`${h.publicUrl}?t=${t}`);
      setFooterUrl(`${f.publicUrl}?t=${t}`);

      const normalizedProforma: Proforma = {
  ...pro,
  clients: Array.isArray(pro.clients) ? pro.clients[0] ?? null : pro.clients,
  profiles: Array.isArray(pro.profiles) ? pro.profiles[0] ?? null : pro.profiles,
};

setP(normalizedProforma);
setItems((it ?? []) as Item[]);
    })();
  }, [id, router]);

  const c = p?.clients;
  const vendedor =
    p?.profiles?.full_name?.trim() ? p.profiles.full_name : "Vendedor";

  const descuento = useMemo(() => 0, []);
  const subtotal2 = useMemo(() => Number(p?.subtotal ?? 0) - descuento, [p, descuento]);

  if (!p) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.grayBg,
          color: COLORS.text,
          fontFamily: "Inter, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        {msg || "Cargando..."}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.grayBg,
        color: COLORS.text,
        fontFamily: "Inter, Arial, sans-serif",
        padding: 16,
      }}
    >
      <div style={{ maxWidth: "23cm", margin: "0 auto" }}>
        <div
          style={{
            background: COLORS.bone,
            border: `1px solid ${COLORS.grayBorder}`,
            borderRadius: 20,
            padding: 16,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <Link href="/proformas" style={{ textDecoration: "none" }}>
              <button style={secondaryButtonStyle}>← Volver</button>
            </Link>

            <button
              onClick={() => window.open(`/api/proformas/${id}/pdf`, "_blank")}
              style={primaryButtonStyle}
            >
              Descargar PDF
            </button>
          </div>

          {msg && (
            <div
              style={{
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                borderRadius: 14,
                padding: 12,
                fontWeight: 600,
              }}
            >
              {msg}
            </div>
          )}
        </div>

        <div
          style={{
            width: "21cm",
            minHeight: "29.7cm",
            background: "white",
            margin: "0 auto",
            color: "black",
            fontFamily: "Arial, sans-serif",
            position: "relative",
            boxSizing: "border-box",
            boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "4cm",
              overflow: "hidden",
              background: "#f3f3f3",
            }}
          >
            {headerUrl ? (
              <img
                src={headerUrl}
                alt="Header proforma"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#ddd" }} />
            )}
          </div>

          <div
            style={{
              padding: "0.28cm 0.28cm 0 0.28cm",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                border: "2px solid #222",
                padding: "0.14cm 0.22cm",
                textAlign: "center",
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>
                PROFORMA &nbsp; N°{" "}
                <span style={{ color: "#0074d9" }}>
                  {String(p.number).padStart(8, "0")}
                </span>
              </div>
              <div style={{ fontWeight: 700 }}>RUC: 1793196801001</div>
              <div style={{ fontWeight: 700 }}>QUITO - GUAYAQUIL - MANABI</div>
              <div style={{ fontWeight: 700 }}>
                Teléfonos: 099 836 9773 - 097 251 6157 - 095 942 7569
              </div>
              <div style={{ fontSize: 11 }}>
                Correo electrónico: ventas.uio@biometrisec.com - contactanos@biometrisec.com - contabilidad@biometricoec.com
              </div>
            </div>

            <div
              style={{
                border: "2px solid #222",
                marginTop: "0.06cm",
                height: "0.42cm",
              }}
            />

            <div
              style={{
                border: "2px solid #222",
                marginTop: "0.06cm",
                padding: "0.12cm 0.18cm",
              }}
            >
              <div
                style={{
                  color: "#00a2df",
                  fontWeight: 800,
                  fontSize: 12,
                  marginBottom: "0.08cm",
                }}
              >
                DATOS DEL CLIENTE:
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.05fr 0.95fr",
                  gap: "0.2cm",
                  alignItems: "start",
                }}
              >
                <div>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                      tableLayout: "fixed",
                    }}
                  >
                    <tbody>
                      <tr style={{ height: "0.52cm" }}>
                        <td
                          style={{
                            width: "1.8cm",
                            fontWeight: 700,
                            textAlign: "right",
                            paddingRight: 6,
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Cliente:
                        </td>
                        <td
                          style={{
                            border: "1px solid #444",
                            padding: "0 6px",
                            verticalAlign: "middle",
                            lineHeight: 1.15,
                          }}
                        >
                          {c?.full_name ?? "-"}
                        </td>
                      </tr>

                      <tr style={{ height: "0.52cm" }}>
                        <td
                          style={{
                            fontWeight: 700,
                            textAlign: "right",
                            paddingRight: 6,
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Ruc:
                        </td>
                        <td
                          style={{
                            border: "1px solid #444",
                            padding: "0 6px",
                            verticalAlign: "middle",
                            lineHeight: 1.15,
                          }}
                        >
                          {c?.document ?? "-"}
                        </td>
                      </tr>

                      <tr style={{ height: "0.52cm" }}>
                        <td
                          style={{
                            fontWeight: 700,
                            textAlign: "right",
                            paddingRight: 6,
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Ciudad:
                        </td>
                        <td
                          style={{
                            border: "1px solid #444",
                            padding: "0 6px",
                            verticalAlign: "middle",
                            lineHeight: 1.15,
                          }}
                        >
                          {c?.address ?? "-"}
                        </td>
                      </tr>

                      <tr style={{ height: "0.52cm" }}>
                        <td
                          style={{
                            fontWeight: 700,
                            textAlign: "right",
                            paddingRight: 6,
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Correo:
                        </td>
                        <td
                          style={{
                            border: "1px solid #444",
                            padding: "0 6px",
                            verticalAlign: "middle",
                            lineHeight: 1.15,
                          }}
                        >
                          {c?.email ?? "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <b>Telf.:</b>{" "}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1px solid #444",
                        minWidth: "4.5cm",
                        height: "0.52cm",
                        padding: "0 6px",
                        boxSizing: "border-box",
                        lineHeight: 1.15,
                      }}
                    >
                      {c?.phone ?? "-"}
                    </span>
                  </div>

                  <div>
                    <b>Fecha:</b> {formatDateLong(p.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "2px solid #222",
                marginTop: "0.06cm",
                padding: "0.1cm 0.16cm 0.14cm",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  color: "#00a2df",
                  fontWeight: 800,
                  fontSize: 12,
                  marginBottom: "0.06cm",
                }}
              >
                DETALLE:
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 4 }}></th>
                    <th style={{ width: "2cm", textAlign: "center", paddingBottom: 4 }}>
                      N° de unidades/Poq
                    </th>
                    <th style={{ width: "2.2cm", textAlign: "right", paddingBottom: 4 }}>
                      Precio Unitario
                    </th>
                    <th style={{ width: "2.2cm", textAlign: "right", paddingBottom: 4 }}>
                      Precio total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} style={{ height: "0.52cm" }}>
                      <td
                        style={{
                          padding: "0 4px",
                          verticalAlign: "middle",
                          lineHeight: 1.15,
                        }}
                      >
                        {it.description}
                      </td>
                      <td
                        style={{
                          padding: "0 4px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          lineHeight: 1.15,
                        }}
                      >
                        {Number(it.qty).toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "0 4px",
                          textAlign: "right",
                          verticalAlign: "middle",
                          lineHeight: 1.15,
                        }}
                      >
                        {money(it.unit_price)}
                      </td>
                      <td
                        style={{
                          padding: "0 4px",
                          textAlign: "right",
                          verticalAlign: "middle",
                          lineHeight: 1.15,
                        }}
                      >
                        {money(it.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <div style={{ width: "7cm", fontSize: 12 }}>
                  {descuento > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "red" }}>
                        <span>Descuento</span>
                        <b>-{money(descuento)}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Sub-Total</span>
                        <b>{money(subtotal2)}</b>
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Sub-Total</span>
                    <b>{money(p.subtotal)}</b>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Iva {Number(p.iva_rate).toFixed(0)}%</span>
                    <b>{money(p.iva)}</b>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 800,
                    }}
                  >
                    <span>Total</span>
                    <b>{money(p.total)}</b>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "2px solid #222",
                marginTop: "0.08cm",
                padding: "0.12cm 0.18cm",
              }}
            >
              <div
                style={{
                  color: "#00a2df",
                  fontWeight: 800,
                  fontSize: 12,
                  marginBottom: "0.08cm",
                }}
              >
                OBJETO DE COMPRA:
              </div>

              <table style={{ fontSize: 11, borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "4.8cm" }}>Validez de la oferta:</td>
                    <td>{p.validez_oferta || "90 Días"}</td>
                  </tr>
                  <tr>
                    <td>Plazo de ejecución:</td>
                    <td>{p.plazo_ejecucion || "30 días contados a partir de la suscripción del contrato"}</td>
                  </tr>
                  <tr>
                    <td>Forma de Pago:</td>
                    <td>{p.forma_pago || "50% al inicio y diferencia en la Entrega"}</td>
                  </tr>
                  <tr>
                    <td>Garantía:</td>
                    <td>{p.garantia || "3 año de Garantía"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Otros:</td>
                    <td style={{ fontWeight: 700, fontStyle: "italic" }}>
                      {p.otros || "No incluye punto de red ni de luz."}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 12, fontSize: 12 }}>
                <b>Vendedor:</b> {vendedor}
              </div>
            </div>
          </div>

          <div
            style={{
              margin: "0.1cm 0.28cm 0 0.28cm",
              border: "2px solid #222",
              padding: "0.03cm 0.2cm",
              textAlign: "center",
              fontSize: 10,
              fontStyle: "italic",
            }}
          >
            BIOMETRICOS ECUADOR S.A.S. RUC: 1793196801001 BANCO PRODUBANCO CUENTA CORRIENTE: 02005304101
          </div>

          <div
            style={{
              position: "absolute",
              left: "0.28cm",
              right: "0.28cm",
              bottom: "0.18cm",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "3.2cm",
                overflow: "hidden",
                background: "#fff",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              {footerUrl ? (
                <img
                  src={footerUrl}
                  alt="Footer proforma"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center bottom",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#ddd" }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
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