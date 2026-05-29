// Parses an .xlsx file produced from one of the bulk templates and returns
// rows ready to send to the matching bulk_create_* RPC.
//
// Validation here is intentionally minimal: header order must match the
// template, and rows where every cell is empty are skipped. Per-row business
// validation (required fields, reference resolution) lives in Postgres; the
// server is the single source of truth for "does this row pass?".

import {
  parseBoolean,
  TEMPLATE_SCHEMAS,
  type TemplateEntity,
} from "@/features/bulk-operations/lib/templateSchemas";

export interface ParsedRow {
  /** Sheet row number as seen by the user (header is 1, first data row is 2). */
  sheetRow: number;
  /** Snake-case keys matching the JSON contract the RPC consumes. */
  data: Record<string, unknown>;
}

export interface ParsedFile {
  fileName: string;
  rows: ParsedRow[];
}

export class TemplateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateParseError";
  }
}

export async function parseTemplate(entity: TemplateEntity, file: File): Promise<ParsedFile> {
  const schema = TEMPLATE_SCHEMAS[entity];
  // Lazy-load exceljs so it only bloats the bundle on the wizard pages.
  const ExcelJS = (await import("exceljs")).default;

  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.getWorksheet("Datos");
  if (!sheet) {
    throw new TemplateParseError(
      'No se encontró la hoja "Datos" en el archivo. Usá la plantilla descargable.',
    );
  }

  // exceljs is 1-indexed and inserts an undefined at position 0 in row.values.
  const rawHeader = sheet.getRow(1).values as (string | undefined)[];
  const headers = rawHeader.slice(1).map((h) => String(h ?? "").trim());

  const expected = schema.columns;
  const headersMatch =
    headers.length === expected.length && headers.every((h, i) => h === expected[i]);
  if (!headersMatch) {
    throw new TemplateParseError(
      `Las columnas no coinciden con la plantilla.\nEsperadas (en orden): ${expected.join(", ")}\nRecibidas: ${headers.join(", ") || "(vacías)"}`,
    );
  }

  const booleanCols = new Set(schema.booleanColumns ?? []);
  const rows: ParsedRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const data: Record<string, unknown> = {};
    schema.columns.forEach((key, i) => {
      const text = row.getCell(i + 1).text;
      if (booleanCols.has(key)) {
        const parsed = parseBoolean(text);
        if (parsed !== undefined) data[key] = parsed;
      } else {
        const trimmed = (text ?? "").trim();
        if (trimmed !== "") data[key] = trimmed;
      }
    });

    const hasContent = Object.keys(data).length > 0;
    if (!hasContent) return;

    rows.push({ sheetRow: rowNumber, data });
  });

  return { fileName: file.name, rows };
}
