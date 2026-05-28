import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBulkUploadJobs } from "@/services/bulkOperationsService";
import type { BulkUploadJob } from "@/types/domain";

const ENTITY_LABEL: Record<BulkUploadJob["entity"], string> = {
  empresas: "Empresas",
  sucursales: "Sucursales",
  clientes: "Clientes",
  usuarios: "Usuarios",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function BulkUploadLog() {
  const [jobs, setJobs] = useState<BulkUploadJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getBulkUploadJobs().then((res) => {
      if (!mounted) return;
      if (res.error) {
        setError(res.error);
        setJobs([]);
      } else {
        setJobs(res.data ?? []);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <a
        href="/bulk-operations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Volver a operaciones en bloque
      </a>

      <header>
        <h2 className="text-2xl font-semibold">Historial de cargas</h2>
        <p className="text-sm text-muted-foreground">
          Registro de cada importación con archivo, entidad, responsable y resultados.
        </p>
      </header>

      {jobs === null && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando historial…
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {jobs !== null && jobs.length === 0 && !error && (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          Todavía no se realizaron cargas masivas.
        </p>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: BulkUploadJob }) {
  const allOk = job.failureCount === 0;
  return (
    <a href={`/bulk-operations/historial/${job.id}`} className="group block focus:outline-none">
      <Card className="h-full transition group-hover:ring-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
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
            <CheckCircle2 className="size-3" /> {job.successCount}
          </span>
          {job.failureCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
              <XCircle className="size-3" /> {job.failureCount}
            </span>
          )}
          {allOk && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
              Sin errores
            </span>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
