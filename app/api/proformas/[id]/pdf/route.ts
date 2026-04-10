import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_PDF_BUCKET = "product-pdfs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

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

    const { data: rawItems, error: itemsErr } = await supabase
      .from("proforma_items")
      .select("product_id")
      .eq("proforma_id", id);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const productIds = Array.from(
      new Set(
        (rawItems ?? [])
          .map((row: any) => row?.product_id)
          .filter((x: number | null) => Number.isFinite(x))
      )
    ) as number[];

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
            .filter((x: string | null): x is string => !!x)
        )
      );
    }

    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    });

    const page = await browser.newPage();

    await page.goto(`${baseUrl}/proformas/${id}/pdf`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
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

    await page.close();
    await browser.close();
    browser = null;

    const mergedPdf = await PDFDocument.create();

    const mainDoc = await PDFDocument.load(mainPdf);
    const mainPages = await mergedPdf.copyPages(
      mainDoc,
      mainDoc.getPageIndices()
    );
    mainPages.forEach((p) => mergedPdf.addPage(p));

    const downloadedFiles = await Promise.all(
      pdfPaths.map(async (pdfPath) => {
        const { data, error } = await supabase.storage
          .from(PRODUCT_PDF_BUCKET)
          .download(pdfPath);

        if (error || !data) {
          console.error(
            "No se pudo descargar PDF del producto:",
            pdfPath,
            error?.message
          );
          return null;
        }

        return { pdfPath, fileData: data };
      })
    );

    for (const file of downloadedFiles) {
      if (!file?.fileData) continue;

      const bytes = await file.fileData.arrayBuffer();

      try {
        const annexDoc = await PDFDocument.load(bytes);
        const annexPages = await mergedPdf.copyPages(
          annexDoc,
          annexDoc.getPageIndices()
        );
        annexPages.forEach((p) => mergedPdf.addPage(p));
      } catch (e) {
        console.error("No se pudo anexar PDF:", file.pdfPath, e);
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
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

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
