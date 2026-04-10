import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer, { Browser } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_PDF_BUCKET = "product-pdfs";

/* 🔥 REUTILIZAR NAVEGADOR */
let browserGlobal: Browser | null = null;

async function getBrowser() {
  if (!browserGlobal) {
    browserGlobal = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return browserGlobal;
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

    const requestOrigin = new URL(req.url).origin;
    const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

    let baseUrl = requestOrigin;

    if (
      envBaseUrl &&
      !envBaseUrl.includes("localhost") &&
      !envBaseUrl.includes("127.0.0.1")
    ) {
      baseUrl = envBaseUrl.replace(/\/+$/, "");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: proforma } = await supabase
      .from("proformas")
      .select("id, number")
      .eq("id", id)
      .single();

    if (!proforma) {
      return NextResponse.json(
        { error: "No se encontró la proforma" },
        { status: 404 }
      );
    }

    const { data: rawItems } = await supabase
      .from("proforma_items")
      .select("product_id")
      .eq("proforma_id", id);

    const productIds = Array.from(
      new Set(
        (rawItems ?? [])
          .map((row: any) => row?.product_id)
          .filter((x: number | null) => Number.isFinite(x))
      )
    ) as number[];

    let pdfPaths: string[] = [];

    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("pdf_path")
        .in("id", productIds);

      pdfPaths = Array.from(
        new Set(
          (products ?? [])
            .map((p: any) => p?.pdf_path ?? null)
            .filter(Boolean)
        )
      ) as string[];
    }

    /* 🔥 USAR BROWSER GLOBAL */
    const browser = await getBrowser();
    const page = await browser.newPage();

    /* 🔥 MENOS ESPERA */
    await page.goto(`${baseUrl}/proformas/${id}/pdf`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const mainPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await page.close();

    const mergedPdf = await PDFDocument.create();

    const mainDoc = await PDFDocument.load(mainPdf);
    const mainPages = await mergedPdf.copyPages(
      mainDoc,
      mainDoc.getPageIndices()
    );
    mainPages.forEach((p) => mergedPdf.addPage(p));

    /* 🔥 DESCARGAS EN PARALELO */
    const files = await Promise.all(
      pdfPaths.map((path) =>
        supabase.storage.from(PRODUCT_PDF_BUCKET).download(path)
      )
    );

    for (const res of files) {
      const fileData = res.data;
      if (!fileData) continue;

      const bytes = await fileData.arrayBuffer();

      try {
        const annexDoc = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(
          annexDoc,
          annexDoc.getPageIndices()
        );
        pages.forEach((p) => mergedPdf.addPage(p));
      } catch {}
    }

    const finalPdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proforma-${String(
          proforma.number
        ).padStart(8, "0")}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo generar el PDF" },
      { status: 500 }
    );
  }
}
