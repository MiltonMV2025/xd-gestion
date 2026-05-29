import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBulkUploadJob } from "@/services/bulkOperationsService";
import type { BulkUploadJobDetail as BulkUploadJobDetailType } from "@/types/domain";

const ENTITY_LABEL: Record<BulkUploadJobDetailType["entity"], string> = {
  empresas: "Empresas",
  sucursales: "Sucursales",
  clientes: "Clientes",
  usuarios: "Usuarios",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function BulkUploadJobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<BulkUploadJobDetailType | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getBulkUploadJob(jobId).then((res) => {
      if (!mounted) return;
      if (res.error) {
        setError(res.error);
        setJob(null);
      } else {
        setJob(res.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, [jobId]);

  return (
    <div className="space-y-6">
      <a
        href="/bulk-operations/historial"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Volver al historial
      </a>

      <header>
        <h2 className="text-2xl font-semibold">Detalle de carga</h2>
        <p className="text-sm text-muted-foreground">
          Identificador: <code className="rounded bg-muted px-1 py-0.5">{jobId}</code>
        </p>
      </header>

      {job === undefined && !error && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {job === null && !error && (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          No se encontró la carga indicada.
        </p>
      )}

      {job && <DetailBody job={job} />}
    </div>
  );
}

function DetailBody({ job }: { job: BulkUploadJobDetailType }) {
  const allOk = job.failureCount === 0;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <span className="truncate">{job.fileName}</span>
          </CardTitle>
          <CardDescription>
            {ENTITY_LABEL[job.entity]} · {job.userName} · {formatDate(job.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {job.totalRows} fila{job.totalRows === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3" /> {job.successCount} insertadas
          </span>
          {job.failureCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
              <XCircle className="size-3" /> {job.failureCount} con error
            </span>
          )}
          {allOk && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
              Sin errores
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultado por fila</CardTitle>
          <CardDescription>Las filas se numeran como aparecen en el archivo Excel (la fila 1 es el encabezado).</CardDescription>
        </CardHeader>
        <CardContent>
          {job.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            <div className="max-h-[480px] overflow-auto rounded-md border border-border">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted/60 text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-medium text-muted-foreground">Fila Excel</th>
                    <th className="px-2 py-1.5 font-medium text-muted-foreground">Estado</th>
                    <th className="px-2 py-1.5 font-medium text-muted-foreground">ID / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {job.results.map((r) => (
                    <tr key={r.rowIndex} className="border-t border-border">
                      <td className="px-2 py-1.5 text-muted-foreground">{r.rowIndex + 2}</td>
                      <td className="px-2 py-1.5">
                        {r.status === "ok" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="size-3" /> Error
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[11px]">
                        {r.status === "ok" ? r.id : <span className="text-destructive">{r.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
