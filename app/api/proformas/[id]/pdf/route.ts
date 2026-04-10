import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer, { Browser } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_PDF_BUCKET = "product-pdfs";

function getBaseUrl(req: Request) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  const requestOrigin = new URL(req.url).origin;

  // Si la env está vacía, usa el origin real del request
  if (!envUrl) return requestOrigin;

  // Si la env quedó en localhost pero estás en producción, ignórala
  const isLocalEnv =
    envUrl.includes("localhost") || envUrl.includes("127.0.0.1");

  const isRenderRequest =
    requestOrigin.includes("onrender.com") || requestOrigin.startsWith("https://");

  if (isLocalEnv && isRenderRequest) {
    return requestOrigin;
  }

  return envUrl.replace(/\/+$/, "");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: Browser | null = null;

  try {
    const resolved = await params;
    const id = Number(resolved.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Falta NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Falta SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(req);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Buscar proforma
    const { data: proforma, error: proErr } = await supabase
      .from("proformas")
      .select("id, number")
      .eq("id", id)
      .single();

    if (proErr || !proforma) {
      return NextResponse.json(
        { error: proErr?.message ?? "No se encontró la proforma" },
        { status: 404 }
      );
    }

    // 2) Leer items de la proforma
    const { data: rawItems, error: itemsErr } = await supabase
      .from("proforma_items")
      .select("product_id")
      .eq("proforma_id", id);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // 3) Sacar product_id únicos válidos
    const productIds = Array.from(
      new Set(
        (rawItems ?? [])
          .map((row: any) => row?.product_id)
          .filter((x: number | null) => Number.isFinite(x))
      )
    ) as number[];

    // 4) Buscar pdf_path en products
    let pdfPaths: string[] = [];

    if (productIds.length > 0) {
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, pdf_path")
        .in("id", productIds);

      if (prodErr) {
        return NextResponse.json({ error: prodErr.message }, { status: 500 });
      }

      pdfPaths = Array.from(
        new Set(
          (products ?? [])
            .map((p: any) => p?.pdf_path ?? null)
            .filter((x: string | null) => !!x)
        )
      ) as string[];
    }

    // 5) Generar PDF principal con Puppeteer
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    });

    const page = await browser.newPage();

    await page.goto(`${baseUrl}/proformas/${id}/pdf`, {
      waitUntil: "networkidle0",
      timeout: 120000,
    });

    const mainPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0cm",
        right: "0cm",
        bottom: "0cm",
        left: "0cm",
      },
    });

    await browser.close();
    browser = null;

    // 6) Crear PDF final
    const mergedPdf = await PDFDocument.create();

    const mainDoc = await PDFDocument.load(mainPdf);
    const mainPages = await mergedPdf.copyPages(
      mainDoc,
      mainDoc.getPageIndices()
    );
    mainPages.forEach((p) => mergedPdf.addPage(p));

    // 7) Anexar PDFs de productos
    for (const pdfPath of pdfPaths) {
      const { data: fileData, error: fileErr } = await supabase.storage
        .from(PRODUCT_PDF_BUCKET)
        .download(pdfPath);

      if (fileErr || !fileData) {
        console.error(
          "No se pudo descargar PDF del producto:",
          pdfPath,
          fileErr?.message
        );
        continue;
      }

      const bytes = await fileData.arrayBuffer();

      try {
        const annexDoc = await PDFDocument.load(bytes);
        const annexPages = await mergedPdf.copyPages(
          annexDoc,
          annexDoc.getPageIndices()
        );
        annexPages.forEach((p) => mergedPdf.addPage(p));
      } catch (e) {
        console.error("No se pudo anexar PDF:", pdfPath, e);
      }
    }

    // 8) Exportar final
    const finalPdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proforma-${String(proforma.number).padStart(8, "0")}.pdf"`,
      },
    });
  } catch (error: any) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    return NextResponse.json(
      { error: error?.message ?? "No se pudo generar el PDF" },
      { status: 500 }
    );
  }
}
