import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function getData(id: number) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

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

  if (err1) throw new Error(err1.message);

  const { data: items, error: err2 } = await supabase
    .from("proforma_items")
    .select("id, description, qty, unit_price, taxable, line_total")
    .eq("proforma_id", id)
    .order("id", { ascending: true });

  if (err2) throw new Error(err2.message);

  const { data: h } = supabase.storage.from(BUCKET).getPublicUrl("header.png");
  const { data: f } = supabase.storage.from(BUCKET).getPublicUrl("footer.png");

  const normalizedProforma: Proforma = {
    ...(pro as any),
    clients: Array.isArray((pro as any).clients)
      ? (pro as any).clients[0] ?? null
      : (pro as any).clients ?? null,
    profiles: Array.isArray((pro as any).profiles)
      ? (pro as any).profiles[0] ?? null
      : (pro as any).profiles ?? null,
  };

  const cacheKey = normalizedProforma.created_at
    ? new Date(normalizedProforma.created_at).getTime()
    : Date.now();

  return {
    pro: normalizedProforma,
    items: (items ?? []) as Item[],
    headerUrl: `${h.publicUrl}?v=${cacheKey}`,
    footerUrl: `${f.publicUrl}?v=${cacheKey}`,
  };
}

export default async function ProformaPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  const id = Number(resolved.id);

  const { pro: p, items, headerUrl, footerUrl } = await getData(id);

  const c = p.clients;
  const vendedor = p.profiles?.full_name?.trim() ? p.profiles.full_name : "Vendedor";
  const descuento = 0;
  const subtotal2 = Number(p.subtotal ?? 0) - descuento;

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
        }

        @page {
          size: A4;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          width: 21cm;
          min-height: 29.7cm;
        }

        .page {
          width: 21cm;
          height: 29.7cm;
          position: relative;
          overflow: hidden;
          color: #000;
          background: #fff;
          display: block;
        }

        .header {
          width: 21cm;
          height: 4cm;
          overflow: hidden;
          display: block;
        }

        .header img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .content {
          padding: 0.28cm 0.28cm 0 0.28cm;
        }

        .box {
          border: 2px solid #222;
        }

        .title-blue {
          color: #00a2df;
          font-weight: 800;
          font-size: 12px;
        }

        .center {
          text-align: center;
        }

        .bold {
          font-weight: 700;
        }

        .small {
          font-size: 11px;
        }

        table {
          border-collapse: collapse;
          width: 100%;
        }

        .client-table td {
          font-size: 12px;
          height: 0.52cm;
          vertical-align: middle;
        }

        .client-label {
          width: 1.8cm;
          font-weight: 700;
          text-align: right;
          padding-right: 6px;
          white-space: nowrap;
        }

        .client-value {
          border: 1px solid #444;
          padding: 0 6px;
          line-height: 1.15;
        }

        .tel-box {
          display: inline-flex;
          align-items: center;
          border: 1px solid #444;
          min-width: 4.5cm;
          height: 0.52cm;
          padding: 0 6px;
          line-height: 1.15;
        }

        .detail-table th,
        .detail-table td {
          font-size: 11px;
          line-height: 1.15;
        }

        .detail-row td {
          height: 0.52cm;
          vertical-align: middle;
          padding: 0 4px;
        }

        .bank {
          border: 2px solid #222;
          padding: 0.03cm 0.2cm;
          text-align: center;
          font-size: 10px;
          font-style: italic;
          margin: 0.1cm 0.28cm 0 0.28cm;
        }

          .footer-wrap {
    position: absolute;
    left: 0;
    bottom: 0;
  }

  .footer {
    width: 21cm;
    height: 4cm;
    overflow: hidden;
    background: #fff;
    display: block;
  }

  .footer img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

`}</style>

      <div className="page">
        <div className="header">
          <img src={headerUrl} alt="header" />
        </div>

        <div className="content">
          <div
            className="box center"
            style={{ padding: "0.14cm 0.22cm", fontSize: 12 }}
          >
            <div className="bold">
              PROFORMA &nbsp; N°{" "}
              <span style={{ color: "#0074d9" }}>
                {String(p.number).padStart(8, "0")}
              </span>
            </div>
            <div className="bold">RUC: 1793196801001</div>
            <div className="bold">QUITO - GUAYAQUIL - MANABI</div>
            <div className="bold">
              Teléfonos: 099 836 9773 - 097 251 6157 - 095 942 7569
            </div>
            <div className="small">
              Correo electrónico: ventas.uio@biometrisec.com - contactanos@biometrisec.com - contabilidad@biometricoec.com
            </div>
          </div>

          <div className="box" style={{ marginTop: "0.06cm", height: "0.42cm" }} />

          <div
            className="box"
            style={{ marginTop: "0.06cm", padding: "0.12cm 0.18cm" }}
          >
            <div className="title-blue" style={{ marginBottom: "0.08cm" }}>
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
                <table className="client-table">
                  <tbody>
                    <tr>
                      <td className="client-label">Cliente:</td>
                      <td className="client-value">{c?.full_name ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="client-label">Ruc:</td>
                      <td className="client-value">{c?.document ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="client-label">Ciudad:</td>
                      <td className="client-value">{c?.address ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="client-label">Correo:</td>
                      <td className="client-value">{c?.email ?? "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <b>Telf.:</b> <span className="tel-box">{c?.phone ?? "-"}</span>
                </div>
                <div>
                  <b>Fecha:</b> {formatDateLong(p.created_at)}
                </div>
              </div>
            </div>
          </div>

          <div
            className="box"
            style={{ marginTop: "0.06cm", padding: "0.1cm 0.16cm 0.14cm" }}
          >
            <div className="title-blue center" style={{ marginBottom: "0.06cm" }}>
              DETALLE:
            </div>

            <table className="detail-table">
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
                  <tr key={it.id} className="detail-row">
                    <td>{it.description}</td>
                    <td style={{ textAlign: "center" }}>{Number(it.qty).toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>{money(it.unit_price)}</td>
                    <td style={{ textAlign: "right" }}>{money(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <div style={{ width: "7cm", fontSize: 12 }}>
                {descuento > 0 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "red",
                      }}
                    >
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
            className="box"
            style={{
              marginTop: "0.08cm",
              padding: "0.12cm 0.18cm",
            }}
          >
            <div className="title-blue" style={{ marginBottom: "0.08cm" }}>
              OBJETO DE COMPRA:
            </div>

            <table style={{ fontSize: 11 }}>
              <tbody>
                <tr>
                  <td style={{ width: "4.8cm" }}>Validez de la oferta:</td>
                  <td>{p.validez_oferta ?? "90 Días"}</td>
                </tr>
                <tr>
                  <td>Plazo de ejecución:</td>
                  <td>{p.plazo_ejecucion ?? "-"}</td>
                </tr>
                <tr>
                  <td>Forma de Pago:</td>
                  <td>{p.forma_pago ?? "-"}</td>
                </tr>
                <tr>
                  <td>Garantía:</td>
                  <td>{p.garantia ?? "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Otros:</td>
                  <td style={{ fontWeight: 700, fontStyle: "italic" }}>
                    {p.otros ?? "-"}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 12, fontSize: 12 }}>
              <b>Vendedor:</b> {vendedor}
            </div>
          </div>
        </div>

        <div className="bank">
          BIOMETRICOS ECUADOR S.A.S. RUC: 1793196801001 BANCO PRODUBANCO CUENTA CORRIENTE: 02005304101
        </div>

        <div className="footer-wrap">
          <div className="footer">
            <img src={footerUrl} alt="footer" />
          </div>
        </div>
      </div>
    </div>
  );
}
