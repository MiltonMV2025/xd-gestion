#!/usr/bin/env node
// Generates the three .xlsx templates used by the Bulk Operations feature.
// Output: public/templates/{empresas,sucursales,clientes}.xlsx
//
// Each workbook has two sheets:
//   - "Datos"          : header row + one example row. Users add rows below.
//   - "Instrucciones"  : per-column guidance, hidden by default.
//
// Run with:  node scripts/generate-bulk-templates.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "templates");

/**
 * Template definitions. The `columns` order is the contract the importer enforces:
 * the parser will read header names from row 1 and require an exact match.
 */
const TEMPLATES = [
  {
    file: "empresas.xlsx",
    title: "Empresas",
    description:
      "Plantilla para cargar empresas en bloque. No incluir el ID: se genera al insertar.",
    columns: [
      { key: "name", label: "Nombre de la empresa", required: true, example: "ACME S.A." },
      { key: "phone", label: "Teléfono", required: false, example: "+54 11 5555-1234" },
      { key: "email", label: "Email", required: false, example: "contacto@acme.com" },
      { key: "address", label: "Dirección", required: false, example: "Av. Siempre Viva 742" },
      { key: "logo_url", label: "URL del logo", required: false, example: "" },
    ],
  },
  {
    file: "sucursales.xlsx",
    title: "Sucursales",
    description:
      "Plantilla para cargar sucursales en bloque. La columna 'empresa' debe coincidir exactamente con el nombre de una empresa ya existente.",
    columns: [
      {
        key: "empresa",
        label: "Empresa (nombre exacto)",
        required: true,
        example: "ACME S.A.",
      },
      { key: "name", label: "Nombre de la sucursal", required: true, example: "Casa Central" },
      { key: "phone", label: "Teléfono", required: false, example: "+54 11 5555-9999" },
      { key: "email", label: "Email", required: false, example: "central@acme.com" },
      { key: "address", label: "Dirección", required: false, example: "Av. Corrientes 1000" },
      {
        key: "active",
        label: "Activa (SI/NO)",
        required: false,
        example: "SI",
      },
    ],
  },
  {
    file: "clientes.xlsx",
    title: "Clientes",
    description:
      "Plantilla para cargar clientes en bloque. 'empresa' y 'sucursal' son opcionales; si se completan, deben referirse a registros existentes y la sucursal debe pertenecer a la empresa indicada.",
    columns: [
      { key: "empresa", label: "Empresa (nombre exacto)", required: false, example: "ACME S.A." },
      {
        key: "sucursal",
        label: "Sucursal (nombre exacto, opcional)",
        required: false,
        example: "Casa Central",
      },
      { key: "name", label: "Nombre del cliente", required: true, example: "Juan Pérez" },
      { key: "phone", label: "Teléfono", required: false, example: "+54 9 11 4000-1111" },
      { key: "email", label: "Email", required: false, example: "juan.perez@acme.com" },
      { key: "address", label: "Dirección", required: false, example: "Calle Falsa 123" },
      { key: "position", label: "Cargo", required: false, example: "Compras" },
      { key: "photo_url", label: "URL de la foto", required: false, example: "" },
    ],
  },
];

async function buildWorkbook(template) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "XD Gestión";
  wb.created = new Date();

  // ---- "Datos" sheet -----------------------------------------------------
  const sheet = wb.addWorksheet("Datos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = template.columns.map((col) => ({
    header: col.key,
    key: col.key,
    width: Math.max(col.label.length + 2, 18),
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;

  // Example row (row 2)
  const example = {};
  for (const col of template.columns) example[col.key] = col.example;
  const exampleRow = sheet.addRow(example);
  exampleRow.font = { italic: true, color: { argb: "FF6B7280" } };

  // ---- "Instrucciones" sheet ---------------------------------------------
  const help = wb.addWorksheet("Instrucciones", { state: "hidden" });
  help.columns = [
    { header: "Columna", key: "key", width: 22 },
    { header: "Descripción", key: "label", width: 48 },
    { header: "Obligatoria", key: "required", width: 14 },
    { header: "Ejemplo", key: "example", width: 30 },
  ];
  help.getRow(1).font = { bold: true };
  for (const col of template.columns) {
    help.addRow({
      key: col.key,
      label: col.label,
      required: col.required ? "Sí" : "No",
      example: col.example || "—",
    });
  }
  help.addRow([]);
  help.addRow(["Nota:", template.description]).font = { italic: true };

  return wb;
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  for (const template of TEMPLATES) {
    const wb = await buildWorkbook(template);
    const outPath = resolve(OUT_DIR, template.file);
    const buffer = await wb.xlsx.writeBuffer();
    await writeFile(outPath, Buffer.from(buffer));
    console.log(`wrote ${outPath} (${buffer.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
