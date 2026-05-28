import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { parseTemplate, TemplateParseError } from "@/features/bulk-operations/lib/parseTemplate";
import type { ParsedFile, ParsedRow } from "@/features/bulk-operations/lib/parseTemplate";
import { TEMPLATE_SCHEMAS, type TemplateEntity } from "@/features/bulk-operations/lib/templateSchemas";
import {
  bulkCreateBranches,
  bulkCreateClients,
  bulkCreateCompanies,
} from "@/services/bulkOperationsService";
import type {
  BulkBranchRow,
  BulkClientRow,
  BulkCompanyRow,
  BulkOperationOutcome,
} from "@/types/domain";

type WizardState =
  | { step: "start" }
  | { step: "parsing" }
  | { step: "preview"; parsed: ParsedFile }
  | { step: "submitting"; parsed: ParsedFile }
  | { step: "result"; outcome: BulkOperationOutcome; parsed: ParsedFile };

interface Props {
  entity: TemplateEntity;
}

const ACCEPT =
  ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function BulkImportWizard({ entity }: Props) {
  const schema = TEMPLATE_SCHEMAS[entity];
  const { session, isLoading } = useAuth();
  const [state, setState] = useState<WizardState>({ step: "start" });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setState({ step: "start" });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setState({ step: "parsing" });

    try {
      const parsed = await parseTemplate(entity, file);
      if (parsed.rows.length === 0) {
        setError("El archivo no contiene filas con datos.");
        setState({ step: "start" });
        return;
      }
      setState({ step: "preview", parsed });
    } catch (e) {
      const message =
        e instanceof TemplateParseError
          ? e.message
          : e instanceof Error
            ? e.message
            : "No fue posible leer el archivo.";
      setError(message);
      setState({ step: "start" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (state.step !== "preview") return;
    if (!session) {
      setError("La sesión expiró. Iniciá sesión nuevamente.");
      return;
    }

    const actorId = session.user.id;
    const fileName = state.parsed.fileName;
    const rows = state.parsed.rows.map((r) => r.data);
    setState({ step: "submitting", parsed: state.parsed });
    setError(null);

    // Rows are built by the parser from a schema we control: shape matches
    // the typed row at runtime, so a double-cast through unknown is safe.
    let result;
    if (entity === "empresas") {
      result = await bulkCreateCompanies({
        rows: rows as unknown as BulkCompanyRow[],
        actorId,
        fileName,
      });
    } else if (entity === "sucursales") {
      result = await bulkCreateBranches({
        rows: rows as unknown as BulkBranchRow[],
        actorId,
        fileName,
      });
    } else {
      result = await bulkCreateClients({
        rows: rows as unknown as BulkClientRow[],
        actorId,
        fileName,
      });
    }

    if (result.error || !result.data) {
      setError(result.error ?? "Error inesperado al procesar la carga.");
      setState({ step: "preview", parsed: state.parsed });
      return;
    }

    setState({ step: "result", outcome: result.data, parsed: state.parsed });
  }

  return (
    <div className="space-y-6">
      <a
        href="/bulk-operations"
        className="inline-flex text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        ← Volver a operaciones en bloque
      </a>

      <header>
        <h2 className="text-2xl font-semibold">Carga masiva: {schema.title}</h2>
        <p className="text-sm text-muted-foreground">
          Descargá la plantilla, completala y subila para procesar la carga.
        </p>
      </header>

      <StepDownload schema={schema} />

      {state.step === "start" && (
        <StepPick
          inputRef={fileInputRef}
          onChange={handleFileChange}
          disabled={isLoading}
          error={error}
        />
      )}

      {state.step === "parsing" && <StatusBanner icon="loading" text="Leyendo el archivo…" />}

      {(state.step === "preview" || state.step === "submitting") && (
        <PreviewPanel
          parsed={state.parsed}
          submitting={state.step === "submitting"}
          onSubmit={handleSubmit}
          onCancel={reset}
          schemaColumns={schema.columns}
          error={error}
        />
      )}

      {state.step === "result" && (
        <ResultPanel outcome={state.outcome} parsed={state.parsed} onReset={reset} />
      )}
    </div>
  );
}

// ---------------- subcomponents ----------------

function StepDownload({ schema }: { schema: (typeof TEMPLATE_SCHEMAS)[TemplateEntity] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" />
          1. Descargá la plantilla
        </CardTitle>
        <CardDescription>
          Las columnas del archivo deben coincidir con las de la plantilla, en el mismo
          orden y con los mismos nombres.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <a href={schema.templateUrl} download>
            <Download className="size-4" />
            Descargar {schema.title.toLowerCase()}.xlsx
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function StepPick({
  inputRef,
  onChange,
  disabled,
  error,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-4 text-primary" />
          2. Subí el archivo
        </CardTitle>
        <CardDescription>Aceptamos solo archivos .xlsx.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onChange}
          disabled={disabled}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70 disabled:opacity-50"
        />
        {error && (
          <p className="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewPanel({
  parsed,
  submitting,
  onSubmit,
  onCancel,
  schemaColumns,
  error,
}: {
  parsed: ParsedFile;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  schemaColumns: readonly string[];
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" />
          3. Revisá la vista previa
        </CardTitle>
        <CardDescription>
          Archivo <code className="rounded bg-muted px-1 py-0.5">{parsed.fileName}</code> con{" "}
          {parsed.rows.length} fila{parsed.rows.length === 1 ? "" : "s"} a procesar. El servidor valida y
          reporta el resultado fila por fila.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-80 overflow-auto rounded-md border border-border">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-muted/60 text-left">
              <tr>
                <th className="px-2 py-1.5 font-medium text-muted-foreground">Fila</th>
                {schemaColumns.map((col) => (
                  <th key={col} className="px-2 py-1.5 font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((row) => (
                <PreviewRow key={row.sheetRow} row={row} columns={schemaColumns} />
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Procesando…
              </>
            ) : (
              <>Confirmar carga</>
            )}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewRow({
  row,
  columns,
}: {
  row: ParsedRow;
  columns: readonly string[];
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-2 py-1.5 text-muted-foreground">{row.sheetRow}</td>
      {columns.map((col) => {
        const value = row.data[col];
        let display = "";
        if (typeof value === "boolean") display = value ? "Sí" : "No";
        else if (value !== undefined && value !== null) display = String(value);
        return (
          <td key={col} className="px-2 py-1.5 align-top">
            <span className={display === "" ? "text-muted-foreground/50" : ""}>
              {display || "—"}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function ResultPanel({
  outcome,
  parsed,
  onReset,
}: {
  outcome: BulkOperationOutcome;
  parsed: ParsedFile;
  onReset: () => void;
}) {
  const { successCount, failureCount, totalRows, jobId, results } = outcome;
  const failures = results.filter((r) => r.status === "error");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {failureCount === 0 ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : (
            <XCircle className="size-4 text-destructive" />
          )}
          Resultado de la carga
        </CardTitle>
        <CardDescription>
          {totalRows} filas procesadas — {successCount} insertadas, {failureCount} con error.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            {successCount} OK
          </span>
          {failureCount > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
              {failureCount} con error
            </span>
          )}
        </div>

        {failures.length > 0 && (
          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-muted/60 text-left">
                <tr>
                  <th className="px-2 py-1.5 font-medium text-muted-foreground">Fila Excel</th>
                  <th className="px-2 py-1.5 font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((r) => {
                  const sheetRow = parsed.rows[r.rowIndex]?.sheetRow ?? r.rowIndex + 2;
                  return (
                    <tr key={r.rowIndex} className="border-t border-border">
                      <td className="px-2 py-1.5 text-muted-foreground">{sheetRow}</td>
                      <td className="px-2 py-1.5 text-destructive">{r.error}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onReset}>
            Cargar otro archivo
          </Button>
          <Button asChild variant="ghost">
            <a href={`/bulk-operations/historial/${jobId}`}>Ver en el historial</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBanner({ icon, text }: { icon: "loading"; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      {icon === "loading" && <Loader2 className="size-4 animate-spin" />}
      <span>{text}</span>
    </div>
  );
}
