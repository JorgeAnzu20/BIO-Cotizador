import { NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_PDF_BUCKET = "product-pdfs";

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

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(req.url).origin;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

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
      return NextResponse.json(
        { error: itemsErr.message },
        { status: 500 }
      );
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
        return NextResponse.json(
          { error: prodErr.message },
          { status: 500 }
        );
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
  args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});

    const page = await browser.newPage();

    await page.goto(`${baseUrl}/proformas/${id}/pdf`, {
      waitUntil: "networkidle0",
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
    const mainPages = await mergedPdf.copyPages(mainDoc, mainDoc.getPageIndices());
    mainPages.forEach((p) => mergedPdf.addPage(p));

    // 7) Anexar PDFs de productos
    for (const pdfPath of pdfPaths) {
      const { data: fileData, error: fileErr } = await supabase.storage
        .from(PRODUCT_PDF_BUCKET)
        .download(pdfPath);

      if (fileErr || !fileData) {
        console.error("No se pudo descargar PDF del producto:", pdfPath, fileErr?.message);
        continue;
      }

      const bytes = await fileData.arrayBuffer();

      try {
        const annexDoc = await PDFDocument.load(bytes);
        const annexPages = await mergedPdf.copyPages(annexDoc, annexDoc.getPageIndices());
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
