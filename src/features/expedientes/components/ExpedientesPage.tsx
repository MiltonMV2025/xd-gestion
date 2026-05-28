import { ArrowRightLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { getCompanyBranches } from "@/services/companyBranchService";
import { getCompanies } from "@/services/companyService";
import { getServices } from "@/services/serviceCatalogService";
import {
  advanceExpedienteStage,
  getAllowedExpedienteActions,
  getExpedienteDetail,
  listExpedienteTimeline,
  listExpedientes,
} from "@/services/expedienteService";
import { listClients } from "@/services/clientService";
import { createQuoteWithItemsRpc } from "@/services/quoteService";
import type {
  Client,
  CompanyBranchItem,
  CompanyItem,
  Expediente,
  ExpedienteAction,
  ExpedienteDetail,
  ExpedienteTimelineEvent,
  ExpedienteStage,
  ServiceCatalogItem,
} from "@/types/domain";
import { expedienteActionLabel, expedienteStageLabel } from "@/utils/status";

interface DraftLine {
  id: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

const stageVariant: Record<ExpedienteStage, "neutral" | "warning" | "primary" | "success"> = {
  quote_pending: "warning",
  quote_approved: "primary",
  production_pending: "warning",
  production_in_progress: "primary",
  production_completed: "success",
  order_in_progress: "primary",
  order_finished: "success",
  order_delivered: "success",
};
const EXPEDIENTES_PAGE_SIZE = 10;
const DETAIL_ITEMS_PAGE_SIZE = 5;

function createLine(service?: ServiceCatalogItem): DraftLine {
  const safeId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id: safeId,
    serviceId: service?.id ?? "",
    quantity: 1,
    unitPrice: Number(service?.unitPrice ?? 0),
  };
}

function readErrorMessage(error: string | null, fallback: string): string {
  if (!error) return fallback;
  return error;
}

export function ExpedientesPage() {
  const { session } = useAuth();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpedienteDetail | null>(null);
  const [timeline, setTimeline] = useState<ExpedienteTimelineEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [draftBranches, setDraftBranches] = useState<CompanyBranchItem[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<ExpedienteAction | null>(null);
  const [draftClientId, setDraftClientId] = useState("");
  const [draftCompanyId, setDraftCompanyId] = useState("");
  const [draftBranchId, setDraftBranchId] = useState("");
  const [draftCompanySearch, setDraftCompanySearch] = useState("");
  const [draftBranchSearch, setDraftBranchSearch] = useState("");
  const [draftClientSearch, setDraftClientSearch] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [expedientesPage, setExpedientesPage] = useState(1);
  const [detailItemsPage, setDetailItemsPage] = useState(1);
  const { execute, isLoading, error, clearError } = useAsyncAction();

  async function refreshExpedientes(nextSelectedId?: string) {
    const response = await listExpedientes();
    if (response.error) throw new Error(response.error);

    const rows = response.data ?? [];
    setExpedientes(rows);
    setExpedientesPage(1);
    setSelectedId((current) => {
      const preferred = nextSelectedId ?? current ?? rows[0]?.id ?? null;
      if (preferred && rows.some((row) => row.id === preferred)) return preferred;
      return rows[0]?.id ?? null;
    });
  }

  async function refreshDetail(expedienteId: string) {
    const [detailResult, timelineResult] = await Promise.all([
      getExpedienteDetail(expedienteId),
      listExpedienteTimeline(expedienteId),
    ]);

    if (detailResult.error) throw new Error(detailResult.error);
    if (timelineResult.error) throw new Error(timelineResult.error);

    setDetail(detailResult.data);
    setTimeline(timelineResult.data ?? []);
  }

  async function refreshDraftBranches(companyId: string, preferredBranchId?: string) {
    const response = await getCompanyBranches(companyId);
    if (response.error) throw new Error(response.error);
    const rows = response.data ?? [];
    setDraftBranches(rows);

    setDraftBranchId((current) => {
      const preferred = preferredBranchId ?? current;
      if (preferred && rows.some((branch) => branch.id === preferred)) return preferred;
      return rows[0]?.id ?? "";
    });
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);
      clearError();

      const [clientsResult, servicesResult, companiesResult] = await Promise.all([
        listClients(),
        getServices(),
        getCompanies(),
      ]);

      if (!mounted) return;

      if (clientsResult.error) {
        setBootstrapError(readErrorMessage(clientsResult.error, "No se pudieron cargar clientes"));
      } else {
        setClients(clientsResult.data ?? []);
      }

      if (servicesResult.error) {
        setBootstrapError((current) =>
          current ? `${current} | ${servicesResult.error}` : readErrorMessage(servicesResult.error, "No se pudieron cargar servicios"),
        );
      } else {
        const rows = servicesResult.data ?? [];
        setServices(rows);
        setDraftLines([createLine(rows[0])]);
      }

      if (companiesResult.error) {
        setBootstrapError((current) =>
          current
            ? `${current} | ${companiesResult.error}`
            : readErrorMessage(companiesResult.error, "No se pudieron cargar empresas"),
        );
      } else {
        const companyRows = companiesResult.data ?? [];
        setCompanies(companyRows);

        const firstClientWithHierarchy = (clientsResult.data ?? []).find(
          (client) => client.companyId && client.branchId,
        );
        const initialCompanyId = firstClientWithHierarchy?.companyId ?? companyRows[0]?.id ?? "";
        setDraftCompanyId(initialCompanyId);

        if (initialCompanyId) {
          try {
            await refreshDraftBranches(initialCompanyId, firstClientWithHierarchy?.branchId ?? undefined);
          } catch (branchIssue) {
            const branchMessage =
              branchIssue instanceof Error ? branchIssue.message : "No se pudieron cargar sucursales";
            setBootstrapError((current) => (current ? `${current} | ${branchMessage}` : branchMessage));
          }
        }

        setDraftClientId(firstClientWithHierarchy?.id ?? "");
      }

      try {
        await refreshExpedientes();
      } catch (bootstrapIssue) {
        const message = bootstrapIssue instanceof Error ? bootstrapIssue.message : "No se pudieron cargar expedientes";
        setBootstrapError((current) => (current ? `${current} | ${message}` : message));
      } finally {
        setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setTimeline([]);
      return;
    }

    setDetailItemsPage(1);

    void execute(async () => {
      await refreshDetail(selectedId);
      return true;
    });
  }, [selectedId, execute]);

  const allowedActions = useMemo(() => (detail ? getAllowedExpedienteActions(detail) : []), [detail]);
  const nextAction = allowedActions[0] ?? null;
  const draftTotal = useMemo(
    () => draftLines.reduce((acc, line) => acc + Number(line.quantity) * Number(line.unitPrice), 0),
    [draftLines],
  );
  const currentUserId = session?.user.id ?? null;
  const expedientesTotalPages = Math.max(1, Math.ceil(expedientes.length / EXPEDIENTES_PAGE_SIZE));
  const paginatedExpedientes = useMemo(
    () =>
      expedientes.slice(
        (expedientesPage - 1) * EXPEDIENTES_PAGE_SIZE,
        expedientesPage * EXPEDIENTES_PAGE_SIZE,
      ),
    [expedientes, expedientesPage],
  );
  const detailItemsTotalPages = Math.max(
    1,
    Math.ceil((detail?.items.length ?? 0) / DETAIL_ITEMS_PAGE_SIZE),
  );
  const draftCompanyOptions = useMemo(() => companies, [companies]);
  const draftBranchOptions = useMemo(() => draftBranches, [draftBranches]);
  const filteredCompanyOptions = useMemo(() => {
    const normalized = draftCompanySearch.trim().toLowerCase();
    if (!normalized) return draftCompanyOptions;
    return draftCompanyOptions.filter((company) => company.name.toLowerCase().includes(normalized));
  }, [draftCompanyOptions, draftCompanySearch]);
  const filteredBranchOptions = useMemo(() => {
    const normalized = draftBranchSearch.trim().toLowerCase();
    if (!normalized) return draftBranchOptions;
    return draftBranchOptions.filter((branch) => branch.name.toLowerCase().includes(normalized));
  }, [draftBranchOptions, draftBranchSearch]);
  const filteredDraftClients = useMemo(() => {
    const normalizedSearch = draftClientSearch.trim().toLowerCase();

    return clients.filter((client) => {
      if (!client.companyId || !client.branchId) return false;
      if (draftCompanyId && client.companyId !== draftCompanyId) return false;
      if (draftBranchId && client.branchId !== draftBranchId) return false;
      if (!normalizedSearch) return true;

      return (
        client.name.toLowerCase().includes(normalizedSearch) ||
        (client.email ?? "").toLowerCase().includes(normalizedSearch) ||
        (client.position ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [clients, draftBranchId, draftClientSearch, draftCompanyId]);
  const paginatedDetailItems = useMemo(
    () =>
      (detail?.items ?? []).slice(
        (detailItemsPage - 1) * DETAIL_ITEMS_PAGE_SIZE,
        detailItemsPage * DETAIL_ITEMS_PAGE_SIZE,
      ),
    [detail?.items, detailItemsPage],
  );

  useEffect(() => {
    if (expedientesPage > expedientesTotalPages) {
      setExpedientesPage(expedientesTotalPages);
    }
  }, [expedientesPage, expedientesTotalPages]);

  useEffect(() => {
    if (detailItemsPage > detailItemsTotalPages) {
      setDetailItemsPage(detailItemsTotalPages);
    }
  }, [detailItemsPage, detailItemsTotalPages]);

  useEffect(() => {
    if (!showCreateModal) return;

    setDraftClientId((current) =>
      filteredDraftClients.some((client) => client.id === current)
        ? current
        : filteredDraftClients[0]?.id ?? "",
    );
  }, [filteredDraftClients, showCreateModal]);

  useEffect(() => {
    if (!showCreateModal || !draftCompanyId) return;

    void execute(async () => {
      await refreshDraftBranches(draftCompanyId);
      return true;
    });
  }, [draftCompanyId, showCreateModal]);

  function closeCreateModal() {
    setShowCreateModal(false);
    const firstClient = clients.find((client) => client.companyId && client.branchId);
    setDraftCompanyId(firstClient?.companyId ?? "");
    setDraftBranchId(firstClient?.branchId ?? "");
    setDraftCompanySearch("");
    setDraftBranchSearch("");
    setDraftClientSearch("");
    setDraftClientId(firstClient?.id ?? "");
    setDraftDescription("");
    setDraftLines([createLine(services[0])]);
    clearError();
  }

  function addDraftLine() {
    setDraftLines((current) => [...current, createLine(services[0])]);
  }

  function removeDraftLine(lineId: string) {
    setDraftLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)));
  }

  function updateDraftLine(lineId: string, patch: Partial<DraftLine>) {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...patch };

        if (patch.serviceId) {
          const service = services.find((item) => item.id === patch.serviceId);
          if (service) next.unitPrice = service.unitPrice;
        }

        return next;
      }),
    );
  }

  async function handleCreateExpediente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    if (!draftCompanyId || !draftBranchId || !draftClientId || draftLines.length === 0) return;

    const normalizedItems = draftLines
      .filter((line) => line.serviceId && line.quantity > 0)
      .map((line) => ({
        service_id: line.serviceId,
        quantity: Number(line.quantity),
        unit_price: Number(line.unitPrice),
      }));

    if (normalizedItems.length === 0) return;

    const result = await execute(() => {
      if (!currentUserId) {
        throw new Error("No se pudo identificar el usuario loggeado para auditoría.");
      }

      return createQuoteWithItemsRpc({
        p_client_id: draftClientId,
        p_description: draftDescription,
        p_items: normalizedItems,
        p_actor_user_id: currentUserId,
      });
    });

    if (!result) return;

    await execute(async () => {
      await refreshExpedientes(result.data ?? undefined);
      return true;
    });

    closeCreateModal();
  }

  function requestAction(action: ExpedienteAction) {
    setPendingAction(action);
    setShowActionModal(true);
  }

  function confirmAction() {
    if (!selectedId || !pendingAction) return;

    void execute(async () => {
      if (!currentUserId) {
        throw new Error("No se pudo identificar el usuario loggeado para auditoría.");
      }

      const response = await advanceExpedienteStage(selectedId, pendingAction, currentUserId);
      if (response.error) throw new Error(response.error);

      await refreshExpedientes(selectedId);
      await refreshDetail(selectedId);
      setShowActionModal(false);
      setPendingAction(null);
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Expedientes"
        subtitle="Gestión comercial unificada: cotización, producción y pedido en un solo flujo."
        action={
          <Button onClick={() => setShowCreateModal(true)} disabled={clients.length === 0 || services.length === 0}>
            <Plus className="mr-1 size-4" /> Nuevo expediente
          </Button>
        }
      />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando expedientes...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Registro unificado</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpedientes.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer ${selectedId === item.id ? "bg-primary/10" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell>{item.id.slice(0, 8)}</TableCell>
                    <TableCell>{item.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={stageVariant[item.stage]}>{expedienteStageLabel[item.stage]}</Badge>
                    </TableCell>
                    <TableCell>${item.total.toLocaleString()}</TableCell>
                    <TableCell>{item.updatedAt || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                Página {expedientesPage} de {expedientesTotalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpedientesPage((page) => Math.max(1, page - 1))}
                  disabled={expedientesPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpedientesPage((page) => Math.min(expedientesTotalPages, page + 1))}
                  disabled={expedientesPage >= expedientesTotalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalle operativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!detail && <p className="text-sm text-muted-foreground">Seleccioná un expediente para ver el detalle.</p>}

              {detail && (
                <>
                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{detail.expediente.clientName}</p>
                      <Badge variant={stageVariant[detail.expediente.stage]}>
                        {expedienteStageLabel[detail.expediente.stage]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{detail.quoteDescription || "Sin descripción."}</p>
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Cotización: {detail.expediente.quoteId.slice(0, 8)}</p>
                      <p>Orden producción: {detail.expediente.productionOrderId?.slice(0, 8) ?? "Pendiente"}</p>
                      <p>Pedido: {detail.expediente.orderId?.slice(0, 8) ?? "Pendiente"}</p>
                      <p>Responsable: {detail.expediente.responsible}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Servicios cotizados</p>
                    <div className="space-y-2">
                      {paginatedDetailItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border/60 bg-card/60 p-2 text-sm">
                          <p className="font-medium">{item.serviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} x ${item.unitPrice.toLocaleString()} = ${item.subtotal.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border/70 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Página {detailItemsPage} de {detailItemsTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailItemsPage((page) => Math.max(1, page - 1))}
                          disabled={detailItemsPage <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailItemsPage((page) => Math.min(detailItemsTotalPages, page + 1))}
                          disabled={detailItemsPage >= detailItemsTotalPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-semibold text-primary">${detail.expediente.total.toLocaleString()}</span>
                  </div>

                  <div className="border-t border-border/70 pt-3">
                    {nextAction ? (
                      <Button onClick={() => requestAction(nextAction)} disabled={isLoading}>
                        {isLoading ? "Actualizando..." : expedienteActionLabel[nextAction]}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin acciones pendientes para este expediente.</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeline.map((event) => (
                  <div key={event.id} className="rounded-lg border border-border/60 bg-card/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{event.title}</p>
                      <span className="text-xs text-muted-foreground">{event.happenedAt || "Sin fecha"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Responsable: {event.responsible}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={showCreateModal} onClose={closeCreateModal} title="Nuevo expediente">
        <form className="space-y-4" onSubmit={handleCreateExpediente}>
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empresa</p>
              <Input
                placeholder="Buscar empresa"
                value={draftCompanySearch}
                onChange={(event) => setDraftCompanySearch(event.target.value)}
              />
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {filteredCompanyOptions.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className={`w-full rounded-md border px-2 py-1.5 text-left text-sm transition ${
                      draftCompanyId === company.id
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                    onClick={() => {
                      setDraftCompanyId(company.id);
                      setDraftBranchId("");
                      setDraftClientId("");
                    }}
                  >
                    {company.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sucursal</p>
              <Input
                placeholder="Buscar sucursal"
                value={draftBranchSearch}
                onChange={(event) => setDraftBranchSearch(event.target.value)}
                disabled={!draftCompanyId}
              />
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {filteredBranchOptions.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    className={`w-full rounded-md border px-2 py-1.5 text-left text-sm transition ${
                      draftBranchId === branch.id
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                    onClick={() => {
                      setDraftBranchId(branch.id);
                      setDraftClientId("");
                    }}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empleado</p>
              <Input
                placeholder="Buscar empleado por nombre, correo o cargo"
                value={draftClientSearch}
                onChange={(event) => setDraftClientSearch(event.target.value)}
                disabled={!draftBranchId}
              />
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {filteredDraftClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className={`w-full rounded-md border px-2 py-1.5 text-left text-sm transition ${
                      draftClientId === client.id
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                    onClick={() => setDraftClientId(client.id)}
                  >
                    {client.name} · {client.position || "Sin cargo"}
                  </button>
                ))}
              </div>
              {draftBranchId && filteredDraftClients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay empleados para esta sucursal con el filtro actual.
                </p>
              )}
            </div>

            <Textarea
              placeholder="Descripción comercial del trabajo a cotizar"
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Servicios</p>
              <Button type="button" variant="outline" size="sm" onClick={addDraftLine}>
                <Plus className="mr-1 size-4" /> Agregar
              </Button>
            </div>
            {draftLines.map((line) => (
              <div key={line.id} className="grid gap-2 rounded-lg border border-border/60 bg-card/70 p-2 md:grid-cols-12">
                <div className="md:col-span-5">
                  <Select
                    value={line.serviceId}
                    onChange={(event) => updateDraftLine(line.id, { serviceId: event.target.value })}
                    required
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    value={line.quantity}
                    onChange={(event) => updateDraftLine(line.id, { quantity: Number(event.target.value || 1) })}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) => updateDraftLine(line.id, { unitPrice: Number(event.target.value || 0) })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    disabled={draftLines.length === 1}
                    onClick={() => removeDraftLine(line.id)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-semibold text-primary">${draftTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Crear expediente"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setPendingAction(null);
        }}
        title="Confirmar actualización de etapa"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Confirmá la acción para mantener el flujo secuencial del expediente.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <ArrowRightLeft className="size-4 text-primary" />
            {pendingAction ? expedienteActionLabel[pendingAction] : ""}
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowActionModal(false);
                setPendingAction(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={confirmAction} disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
