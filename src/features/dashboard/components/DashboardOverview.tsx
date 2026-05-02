import { ClipboardList, Factory, FileText } from "lucide-react";

import { MetricCard } from "@/components/common/MetricCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { metricsSeed } from "@/services/mockData";

export function DashboardOverview() {
  return (
    <section>
      <PageHeader
        title="Resumen operativo"
        subtitle="Métricas rápidas del estado general del negocio."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Cotizaciones pendientes" value={metricsSeed.pendingQuotes} />
        <MetricCard label="Pedidos en proceso" value={metricsSeed.ordersInProgress} />
        <MetricCard label="Trabajos finalizados" value={metricsSeed.finishedJobs} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="border border-border/60 bg-card/70">
          <CardHeader className="flex-row items-center gap-3">
            <FileText className="size-5 text-primary" />
            <CardTitle className="text-sm">Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Prioriza cotizaciones pendientes y aprueba las listas para producción.
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/70">
          <CardHeader className="flex-row items-center gap-3">
            <Factory className="size-5 text-primary" />
            <CardTitle className="text-sm">Producción</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Marca el avance por etapa para mantener trazabilidad del proceso.
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/70">
          <CardHeader className="flex-row items-center gap-3">
            <ClipboardList className="size-5 text-primary" />
            <CardTitle className="text-sm">Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Gestiona estados de entrega con confirmación para evitar cambios accidentales.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
