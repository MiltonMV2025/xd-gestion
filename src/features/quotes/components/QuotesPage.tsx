import { ArrowRightLeft, Download, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { listClients } from "@/services/clientService";
import {
  approveQuoteAndCreateProductionOrder,
  createProductionOrderFromQuote,
  createQuoteWithItemsRpc,
  deleteQuote,
  listQuoteFlow,
  listQuotes,
  updateQuoteStatusRpc,
} from "@/services/quoteService";
import { getServices } from "@/services/serviceCatalogService";
import type { Client, Quote, QuoteFlowItem, QuoteStatus, ServiceCatalogItem } from "@/types/domain";
import { quoteStatusLabel } from "@/utils/status";

const statusBadge: Record<QuoteStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

interface QuoteLineState {
  id: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

const emptyQuote = {
  clientId: "",
  description: "",
};

function createLine(service?: ServiceCatalogItem): QuoteLineState {
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

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [flow, setFlow] = useState<QuoteFlowItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | QuoteStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newQuote, setNewQuote] = useState(emptyQuote);
  const [lines, setLines] = useState<QuoteLineState[]>([]);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    quoteId: string;
    from: QuoteStatus;
    to: QuoteStatus;
  } | null>(null);
  const { execute, isLoading, error, clearError } = useAsyncAction();

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);

      const [clientsResult, quotesResult, flowResult, servicesResult] = await Promise.all([
        listClients(),
        listQuotes(),
        listQuoteFlow(),
        getServices(),
      ]);

      if (!mounted) return;

      if (clientsResult.error) {
        setBootstrapError(`Clientes: ${clientsResult.error}`);
      } else {
        const clientList = clientsResult.data ?? [];
        setClients(clientList);
        setNewQuote((current) => ({
          ...current,
          clientId: current.clientId || clientList[0]?.id || "",
        }));
      }

      if (servicesResult.error) {
        setBootstrapError((current) =>
          current ? `${current} | Servicios: ${servicesResult.error}` : `Servicios: ${servicesResult.error}`,
        );
      } else {
        const serviceList = servicesResult.data ?? [];
        setServices(serviceList);
        setLines((current) => (current.length > 0 ? current : [createLine(serviceList[0])]));
      }

      if (quotesResult.error) {
        setBootstrapError((current) =>
          current ? `${current} | Cotizaciones: ${quotesResult.error}` : `Cotizaciones: ${quotesResult.error}`,
        );
      } else {
        setQuotes(quotesResult.data ?? []);
      }

      if (!flowResult.error) {
        setFlow(flowResult.data ?? []);
      }

      setIsBootstrapping(false);
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredQuotes = useMemo(
    () => quotes.filter((quote) => (statusFilter === "all" ? true : quote.status === statusFilter)),
    [quotes, statusFilter],
  );

  const quoteTotal = useMemo(
    () => lines.reduce((acc, line) => acc + Number(line.quantity) * Number(line.unitPrice), 0),
    [lines],
  );

  const clientsById = useMemo(() => new Map(clients.map((item) => [item.id, item.name])), [clients]);
  const flowByQuoteId = useMemo(() => new Map(flow.map((item) => [item.quoteId, item])), [flow]);

  function closeCreateModal() {
    setShowModal(false);
    setNewQuote({
      ...emptyQuote,
      clientId: clients[0]?.id ?? "",
    });
    setLines([createLine(services[0])]);
    clearError();
  }

  function addLine() {
    setLines((current) => [...current, createLine(services[0])]);
  }

  function removeLine(lineId: string) {
    setLines((current) => {
      if (current.length === 1) return current;
      return current.filter((line) => line.id !== lineId);
    });
  }

  function updateLine(lineId: string, patch: Partial<QuoteLineState>) {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...patch };

        if (patch.serviceId) {
          const selected = services.find((service) => service.id === patch.serviceId);
          if (selected) next.unitPrice = selected.unitPrice;
        }

        return next;
      }),
    );
  }

  async function handleCreateQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    if (!newQuote.clientId) return;
    if (lines.length === 0) return;

    const normalizedItems = lines
      .filter((line) => line.serviceId && line.quantity > 0)
      .map((line) => ({
        service_id: line.serviceId,
        quantity: Number(line.quantity),
        unit_price: Number(line.unitPrice),
      }));

    if (normalizedItems.length === 0) return;

    const rpcResult = await execute(() =>
      createQuoteWithItemsRpc({
        p_client_id: newQuote.clientId,
        p_description: newQuote.description,
        p_items: normalizedItems,
      }),
    );

    if (!rpcResult) return;

    const quotesResult = await listQuotes();
    if (quotesResult.data) setQuotes(quotesResult.data);

    closeCreateModal();
  }

  function requestStatusChange(quoteId: string, currentStatus: QuoteStatus, nextStatus: QuoteStatus) {
    if (currentStatus === nextStatus) return;
    setPendingStatusChange({ quoteId, from: currentStatus, to: nextStatus });
    setShowStatusModal(true);
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return;

    const rpcResult =
      pendingStatusChange.to === "approved"
        ? await execute(() => approveQuoteAndCreateProductionOrder(pendingStatusChange.quoteId))
        : await execute(() =>
            updateQuoteStatusRpc({
              p_id: pendingStatusChange.quoteId,
              p_status: pendingStatusChange.to,
            }),
          );

    if (!rpcResult) return;

    setQuotes((current) =>
      current.map((item) =>
        item.id === pendingStatusChange.quoteId ? { ...item, status: pendingStatusChange.to } : item,
      ),
    );

    setShowStatusModal(false);
    setPendingStatusChange(null);

    const flowResult = await listQuoteFlow();
    if (flowResult.data) setFlow(flowResult.data);
  }

  async function handleDeleteQuote(quoteId: string) {
    const result = await execute(() => deleteQuote(quoteId));
    if (!result) return;
    setQuotes((current) => current.filter((item) => item.id !== quoteId));
  }

  async function handleGenerateProductionOrder(quoteId: string) {
    const result = await execute(() => createProductionOrderFromQuote(quoteId));
    if (!result) return;
    const flowResult = await listQuoteFlow();
    if (flowResult.data) setFlow(flowResult.data);
  }

  function downloadQuotePdf(quoteId: string) {
    window.open(`/api/quotes/pdf/${quoteId}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section>
      <PageHeader
        title="Cotizaciones"
        subtitle="Gestión de ciclo comercial: creación, revisión, PDF y aprobación."
        action={
          <Button onClick={() => setShowModal(true)} disabled={clients.length === 0 || services.length === 0}>
            <Plus className="mr-1 size-4" /> Nueva cotización
          </Button>
        }
      />

      <div className="mb-4 flex max-w-xs items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | QuoteStatus)}
        >
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
        </Select>
      </div>

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando datos...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Flujo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredQuotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell>{quote.id}</TableCell>
              <TableCell>{clientsById.get(quote.clientId) ?? "Cliente eliminado"}</TableCell>
              <TableCell>{quote.description}</TableCell>
              <TableCell>${quote.total.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={statusBadge[quote.status]}>{quoteStatusLabel[quote.status]}</Badge>
              </TableCell>
              <TableCell>
                {flowByQuoteId.get(quote.id)?.productionOrderId ? (
                  <Badge variant="success">Producción generada</Badge>
                ) : (
                  <Badge variant="neutral">Pendiente de producción</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadQuotePdf(quote.id)}>
                    <Download className="mr-1 size-4" /> PDF
                  </Button>
                  <Select
                    className="max-w-44"
                    value={quote.status}
                    onChange={(event) =>
                      requestStatusChange(quote.id, quote.status, event.target.value as QuoteStatus)
                    }
                  >
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteQuote(quote.id)}>
                    <Trash2 className="mr-1 size-4" />
                    Eliminar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateProductionOrder(quote.id)}
                    disabled={quote.status !== "approved" || Boolean(flowByQuoteId.get(quote.id)?.productionOrderId)}
                  >
                    Generar producción
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal open={showModal} onClose={closeCreateModal} title="Crear cotización con servicios">
        <form className="space-y-4" onSubmit={handleCreateQuote}>
          {(clients.length === 0 || services.length === 0) && (
            <p className="text-sm text-destructive">
              Debes tener clientes y servicios activos para crear cotizaciones.
            </p>
          )}

          <div className="grid gap-3">
            <Select
              value={newQuote.clientId}
              onChange={(event) => setNewQuote((prev) => ({ ...prev, clientId: event.target.value }))}
              required
              disabled={clients.length === 0}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Input
              placeholder="Descripción general"
              value={newQuote.description}
              onChange={(event) => setNewQuote((prev) => ({ ...prev, description: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Servicios incluidos</p>
              <Button type="button" size="sm" variant="outline" onClick={addLine}>
                <Plus className="mr-1 size-4" /> Agregar servicio
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="grid gap-2 rounded-lg border border-border/60 bg-card/70 p-2 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <Select
                      value={line.serviceId}
                      onChange={(event) => updateLine(line.id, { serviceId: event.target.value })}
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
                      onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value || 1) })}
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value || 0) })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      Quitar
                    </Button>
                  </div>
                  <div className="md:col-span-12 text-right text-xs text-muted-foreground">
                    Subtotal: ${(line.quantity * line.unitPrice).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-3 py-2">
            <span className="text-sm text-muted-foreground">Total de cotización</span>
            <span className="text-lg font-semibold text-primary">${quoteTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || clients.length === 0 || services.length === 0}>
              {isLoading ? "Guardando..." : "Guardar cotización"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setPendingStatusChange(null);
        }}
        title="Confirmar cambio de estado"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vas a actualizar la cotización de
            <span className="mx-1 font-semibold text-foreground">
              {pendingStatusChange ? quoteStatusLabel[pendingStatusChange.from] : ""}
            </span>
            a
            <span className="ml-1 font-semibold text-foreground">
              {pendingStatusChange ? quoteStatusLabel[pendingStatusChange.to] : ""}
            </span>
            .
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <ArrowRightLeft className="size-4 text-primary" />
            Este cambio impactará el flujo de producción y pedidos.
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowStatusModal(false);
                setPendingStatusChange(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={confirmStatusChange} disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
