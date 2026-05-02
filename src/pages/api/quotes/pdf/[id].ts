import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

import { supabase } from "@/services/supabaseClient";

export const prerender = false;

interface QuotePdfRow {
  quote_id: string;
  quote_created_at: string | null;
  quote_status: string | null;
  quote_description: string | null;
  quote_total: number | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  service_name: string | null;
  quantity: number | null;
  unit_price: number | null;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-SV");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine.length === 0 ? word : currentLine + " " + word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

function drawTextRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: any) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x - textWidth, y, font, size, color });
}

function drawTextCenter(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: any) {
  const { width } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - textWidth) / 2, y, font, size, color });
}

export const GET: APIRoute = async ({ params }) => {
  const quoteId = params.id;

  if (!quoteId) {
    return new Response("Quote id requerido", { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_quote_pdf_payload", {
    p_quote_id: quoteId,
  });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data as QuotePdfRow[] | null) ?? [];
  if (rows.length === 0) {
    return new Response("Cotización no encontrada", { status: 404 });
  }

  const header = rows[0];
  const items = rows.filter((row) => row.service_name);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.1, 0.28, 0.65);
  const textColor = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.4, 0.4, 0.4);
  const tableHeaderBg = rgb(0.94, 0.96, 0.98);
  const borderColor = rgb(0.85, 0.85, 0.85);

  let currentY = height - 40;
  const margin = 40;

  try {
    const logoBytes = await readFile(new URL("../../../../assets/images/logo.png", import.meta.url));
    const logo = await pdfDoc.embedPng(logoBytes);
    const scale = Math.min(150 / logo.width, 50 / logo.height);
    const sWidth = logo.width * scale;
    const sHeight = logo.height * scale;
    
    page.drawImage(logo, {
      x: margin,
      y: currentY - sHeight,
      width: sWidth,
      height: sHeight,
    });
  } catch {
    page.drawText("XD Gestión", {
      x: margin,
      y: currentY - 20,
      size: 22,
      font: fontBold,
      color: primaryColor,
    });
  }

  const companyInfo = [
    "XD Gestión S.A. de C.V.",
    "San Salvador, El Salvador",
    "info@xdgestion.com | +503 2222-3333"
  ];
  
  companyInfo.forEach((line, idx) => {
    page.drawText(line, {
      x: margin,
      y: currentY - 65 - (idx * 12),
      size: 9,
      font: fontRegular,
      color: lightGray,
    });
  });

  page.drawText("COTIZACIÓN", {
    x: width - margin - fontBold.widthOfTextAtSize("COTIZACIÓN", 24),
    y: currentY - 24,
    size: 24,
    font: fontBold,
    color: primaryColor,
  });

  const validUntil = new Date(header.quote_created_at ?? Date.now());
  validUntil.setDate(validUntil.getDate() + 15);

  const metaData = [
    { label: "No. Cotización:", value: header.quote_id },
    { label: "Fecha:", value: formatDate(header.quote_created_at) },
    { label: "Válida hasta:", value: formatDate(validUntil.toISOString()) },
  ];

  metaData.forEach((meta, idx) => {
    const ly = currentY - 55 - (idx * 14);
    // Expandimos el espacio para el UUID desplazando la etiqueta más a la izquierda (de 80 a 200)
    drawTextRight(page, meta.label, width - margin - 200, ly, fontBold, 9, textColor);
    drawTextRight(page, meta.value, width - margin, ly, fontRegular, 9, textColor);
  });

  currentY -= 115;

  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: borderColor,
  });
  
  currentY -= 20;

  page.drawText("PREPARADO PARA:", {
    x: margin,
    y: currentY,
    size: 9,
    font: fontBold,
    color: lightGray,
  });

  currentY -= 15;
  page.drawText(header.client_name ?? "Cliente General", {
    x: margin,
    y: currentY,
    size: 11,
    font: fontBold,
    color: textColor,
  });

  const cDetails = [
    header.client_address,
    header.client_email,
    header.client_phone
  ].filter(Boolean);

  cDetails.forEach(detail => {
    currentY -= 12;
    page.drawText(detail!, {
      x: margin,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: textColor,
    });
  });

  currentY -= 30;

  const introText = "Estimado/a cliente, a continuación presentamos una propuesta detallando los servicios solicitados para su proyecto. Esperamos que sea de su total agrado.";
  const introLines = wrapText(introText, fontRegular, 9, width - (margin * 2));
  introLines.forEach(line => {
    page.drawText(line, { x: margin, y: currentY, size: 9, font: fontRegular, color: textColor });
    currentY -= 12;
  });

  if (header.quote_description) {
    currentY -= 8;
    page.drawText("Descripción del proyecto:", { x: margin, y: currentY, size: 9, font: fontBold, color: textColor });
    currentY -= 14;
    const descLines = wrapText(header.quote_description, fontRegular, 9, width - (margin * 2));
    descLines.forEach(line => {
      page.drawText(line, { x: margin, y: currentY, size: 9, font: fontRegular, color: textColor });
      currentY -= 12;
    });
  }

  currentY -= 20;

  const colX = [margin + 5, 330, 420, width - margin - 5]; 
  
  page.drawRectangle({
    x: margin,
    y: currentY - 14,
    width: width - (margin * 2),
    height: 22,
    color: tableHeaderBg,
  });

  currentY -= 5;
  page.drawText("DESCRIPCIÓN DEL SERVICIO", { x: colX[0], y: currentY, size: 9, font: fontBold, color: primaryColor });
  drawTextRight(page, "CANTIDAD", colX[1], currentY, fontBold, 9, primaryColor);
  drawTextRight(page, "PRECIO UNIT.", colX[2], currentY, fontBold, 9, primaryColor);
  drawTextRight(page, "TOTAL", colX[3], currentY, fontBold, 9, primaryColor);

  currentY -= 20;

  let isAlternate = false;
  items.slice(0, 18).forEach(item => {
    const qty = Number(item.quantity ?? 0);
    const price = Number(item.unit_price ?? 0);
    const subtotal = qty * price;

    const svcName = item.service_name ?? "Servicio";
    const svcLines = wrapText(svcName, fontRegular, 9, 250);
    const rowHeight = Math.max(18, svcLines.length * 12 + 6);

    if (isAlternate) {
      page.drawRectangle({
        x: margin,
        y: currentY - rowHeight + 6,
        width: width - (margin * 2),
        height: rowHeight,
        color: rgb(0.97, 0.98, 0.99),
      });
    }
    
    drawTextRight(page, qty.toString(), colX[1], currentY, fontRegular, 9, textColor);
    drawTextRight(page, formatMoney(price), colX[2], currentY, fontRegular, 9, textColor);
    drawTextRight(page, formatMoney(subtotal), colX[3], currentY, fontRegular, 9, textColor);

    svcLines.forEach((line, idx) => {
      page.drawText(line, { x: colX[0], y: currentY - (idx * 12), size: 9, font: fontRegular, color: textColor });
    });

    currentY -= rowHeight;
    isAlternate = !isAlternate;
  });

  page.drawLine({
    start: { x: margin, y: currentY + 5 },
    end: { x: width - margin, y: currentY + 5 },
    thickness: 1,
    color: borderColor,
  });

  currentY -= 15;

  const totalStr = formatMoney(Number(header.quote_total ?? 0));
  
  page.drawText("Subtotal", { x: width - margin - 120, y: currentY, size: 9, font: fontRegular, color: textColor });
  drawTextRight(page, totalStr, width - margin, currentY, fontRegular, 9, textColor);
  
  currentY -= 14;
  page.drawText("IVA (0%)", { x: width - margin - 120, y: currentY, size: 9, font: fontRegular, color: textColor });
  drawTextRight(page, "$0.00", width - margin, currentY, fontRegular, 9, textColor);

  currentY -= 6;
  page.drawLine({
    start: { x: width - margin - 125, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: borderColor,
  });

  currentY -= 18;
  page.drawText("TOTAL", { x: width - margin - 125, y: currentY, size: 12, font: fontBold, color: primaryColor });
  drawTextRight(page, totalStr, width - margin, currentY, fontBold, 12, primaryColor);

  let footerY = 60;
  
  page.drawLine({
    start: { x: margin, y: footerY + 20 },
    end: { x: width - margin, y: footerY + 20 },
    thickness: 1,
    color: borderColor,
  });

  page.drawText("Términos y Condiciones:", { x: margin, y: footerY, size: 9, font: fontBold, color: lightGray });
  page.drawText("Esta cotización es válida por 15 días a partir de su emisión. Pagos mediante transferencia bancaria al", { x: margin, y: footerY - 12, size: 8, font: fontRegular, color: lightGray });
  page.drawText("Banco Agrícola Cta N° 1234567890 a nombre de XD Gestión S.A. de C.V.", { x: margin, y: footerY - 24, size: 8, font: fontRegular, color: lightGray });

  drawTextCenter(page, "¡Gracias por la oportunidad de hacer negocios con usted!", 20, fontBold, 9, primaryColor);

  const bytes = await pdfDoc.save();

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cotizacion-${quoteId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
};
