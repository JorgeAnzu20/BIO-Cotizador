import { createClient } from "@supabase/supabase-js";
import PdfActions from "./PdfActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ...tu código anterior sigue igual

export default async function ProformaPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ...tu lógica anterior sigue igual

  const descuento = 0;
  const subtotal2 = Number(proforma.subtotal ?? 0) - descuento;

  return (
    <div className="screen-wrap">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: #eef1f4;
        }

        .screen-wrap {
          min-height: 100vh;
          background: #eef1f4;
          padding: 12px 0 24px;
        }

        .actions-wrap {
          width: 21cm;
          margin: 0 auto 0.2cm auto;
        }

        .no-print {
          display: flex;
        }

        @media print {
          .no-print,
          .actions-wrap {
            display: none !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .screen-wrap {
            background: #fff !important;
            padding: 0 !important;
            min-height: auto !important;
          }
        }

        .page {
          width: 21cm;
          min-height: 29.7cm;
          margin: 0 auto;
          background: white;
          position: relative;
          overflow: hidden;
        }

        /* TODO TU RESTO DE ESTILOS SIGUE AQUÍ SIN CAMBIOS */
      `}</style>

      <div className="actions-wrap">
        <PdfActions />
      </div>

      <div className="page">
        <div className="header">
          <img src={headerUrl} alt="header" />
        </div>

        <div className="content">
          <div
            // ...esto sigue exactamente como ya lo tenías
          >
            {/* ...tu contenido */}
          </div>
        </div>

        <div className="footer">
          <img src={footerUrl} alt="footer" />
        </div>
      </div>
    </div>
  );
}
