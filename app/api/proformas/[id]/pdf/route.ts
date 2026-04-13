import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer, { Browser } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_PDF_BUCKET = "product-pdfs";

// ✅ Supabase singleton fuera del handler
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ✅ Browser reutilizable entre requests (warm browser)
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",    // ✅ Evita crashes en entornos con poca memoria
      "--disable-gpu",
    ],
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
  });

  // Si el browser muere, limpiamos la referencia
  browserInstance.on("disconnected", () => {
    browserInstance = null;
  });

  return browserInstance;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params;
    const id = Number(resolved.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Validaciones de env al inicio del módulo, no en cada request
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: "Faltan variables de entorno" },
        { status: 500 }
      );
    }

    const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
    const requestOrigin = new URL(req.url).origin;
    const baseUrl =
      envBaseUrl &&
      !envBaseUrl.includes("localhost") &&
      !envBaseUrl.includes("127.0.0.1")
        ? envBaseUrl.replace(/\/+$/, "")
        : requestOrigin;

    // ✅ Queries en paralelo: proforma + items al mismo tiempo
    const [{ data: proforma, error: proErr }, { data: rawItems, error: itemsErr }] =
      await Promise.all([
        supabase.from("proformas").select("id, number").eq("id", id).single(),
        supabase.from("proforma_items").select("product_id").eq("proforma_id", id),
      ]);

    if (proErr || !proforma) {
      return NextResponse.json(
        { error: proErr?.message ?? "No se encontró la proforma" },
        { status: 404 }
      );
    }

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const productIds = Array.from(
      new Set(
        (rawItems ?? [])
          .map((row: any) => row?.product_id)
          .filter((x: any) => Number.isFinite(x))
      )
    ) as number[];

    // ✅ Query de productos + render del PDF en paralelo
    const [productsResult, mainPdf] = await Promise.all([
      productIds.length > 0
        ? supabase.from("products").select("id, pdf_path").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),

      // Render con Puppeteer mientras buscamos los productos
      (async () => {
        const browser = await getBrowser();
        const page = await browser.newPage();

        // ✅ Bloqueamos recursos innecesarios para el PDF
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          const type = req.resourceType();
          if (["font", "media"].includes(type)) {
            req.abort();
          } else {
            req.continue();
          }
        });

        try {
          await page.goto(`${baseUrl}/proformas/${id}/pdf`, {
            // ✅ networkidle0 garantiza que los datos async ya cargaron
            waitUntil: "networkidle0",
            timeout: 20000,
          });

          const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0cm", right: "0cm", bottom: "0cm", left: "0cm" },
          });

          return pdf;
        } finally {
          // ✅ Cerramos solo la página, no el browser completo
          await page.close();
        }
      })(),
    ]);

    if (productsResult.error) {
      return NextResponse.json(
        { error: productsResult.error.message },
        { status: 500 }
      );
    }

    const pdfPaths = Array.from(
      new Set(
        (productsResult.data ?? [])
          .map((p: any) => p?.pdf_path ?? null)
          .filter(Boolean)
      )
    ) as string[];

    // ✅ Descarga de PDFs de productos en paralelo
    const annexBuffers = await Promise.allSettled(
      pdfPaths.map(async (pdfPath) => {
        const { data: fileData, error: fileErr } = await supabase.storage
          .from(PRODUCT_PDF_BUCKET)
          .download(pdfPath);

        if (fileErr || !fileData) {
          console.error("No se pudo descargar PDF:", pdfPath, fileErr?.message);
          return null;
        }
        return fileData.arrayBuffer();
      })
    );

    // ✅ Merge de PDFs
    const mergedPdf = await PDFDocument.create();

    const mainDoc = await PDFDocument.load(mainPdf);
    const mainPages = await mergedPdf.copyPages(mainDoc, mainDoc.getPageIndices());
    mainPages.forEach((p) => mergedPdf.addPage(p));

    for (const result of annexBuffers) {
      if (result.status !== "fulfilled" || !result.value) continue;
      try {
        const annexDoc = await PDFDocument.load(result.value);
        const annexPages = await mergedPdf.copyPages(
          annexDoc,
          annexDoc.getPageIndices()
        );
        annexPages.forEach((p) => mergedPdf.addPage(p));
      } catch (e) {
        console.error("No se pudo anexar PDF:", e);
      }
    }

    const finalPdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proforma-${String(proforma.number).padStart(8, "0")}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message ?? "No se pudo generar el PDF",
        appUrlEnv: process.env.NEXT_PUBLIC_APP_URL ?? null,
        requestOrigin: new URL(req.url).origin,
      },
      { status: 500 }
    );
  }
}
