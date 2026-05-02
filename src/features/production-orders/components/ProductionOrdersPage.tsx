import { ArrowRightLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  createOrderFromProductionOrder,
  listProductionOrders,
  updateProductionOrderStatus,
} from "@/services/operationsService";
import type { ProductionOrder, ProductionOrderStatus } from "@/types/domain";
import { productionStatusLabel } from "@/utils/status";

const productionBadge: Record<ProductionOrderStatus, "warning" | "primary" | "success"> = {
  pending: "warning",
  in_progress: "primary",
  completed: "success",
};

export function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string;
    from: ProductionOrderStatus;
    to: ProductionOrderStatus;
  } | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { execute, isLoading, error } = useAsyncAction();

  async function refresh() {
    const response = await listProductionOrders();
    if (response.error) throw new Error(response.error);
    setOrders(response.data ?? []);
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);
      const response = await listProductionOrders();
      if (!mounted) return;
      if (response.error) setBootstrapError(response.error);
      else setOrders(response.data ?? []);
      setIsBootstrapping(false);
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  function requestStatusChange(orderId: string, from: ProductionOrderStatus, to: ProductionOrderStatus) {
    if (from === to) return;
    setPendingStatusChange({ orderId, from, to });
    setShowStatusModal(true);
  }

  function confirmStatusChange() {
    if (!pendingStatusChange) return;

    void execute(async () => {
      const response = await updateProductionOrderStatus(pendingStatusChange.orderId, pendingStatusChange.to);
      if (response.error) throw new Error(response.error);
      await refresh();
      setShowStatusModal(false);
      setPendingStatusChange(null);
      return true;
    });
  }

  function handleCreateOrder(orderId: string) {
    void execute(async () => {
      const response = await createOrderFromProductionOrder(orderId);
      if (response.error) throw new Error(response.error);
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Órdenes de producción"
        subtitle="Órdenes creadas desde cotizaciones aprobadas."
      />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando órdenes...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Cotización</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.id}</TableCell>
              <TableCell>{order.quoteId}</TableCell>
              <TableCell>
                <Badge variant={productionBadge[order.status]}>{productionStatusLabel[order.status]}</Badge>
              </TableCell>
              <TableCell>{order.estimatedDelivery}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Select
                    className="max-w-44"
                    value={order.status}
                    onChange={(event) =>
                      requestStatusChange(order.id, order.status, event.target.value as ProductionOrderStatus)
                    }
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completada</option>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => handleCreateOrder(order.id)} disabled={isLoading}>
                    Generar pedido
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
            Cambiarás la orden de producción de
            <span className="mx-1 font-semibold text-foreground">
              {pendingStatusChange ? productionStatusLabel[pendingStatusChange.from] : ""}
            </span>
            a
            <span className="ml-1 font-semibold text-foreground">
              {pendingStatusChange ? productionStatusLabel[pendingStatusChange.to] : ""}
            </span>
            .
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <ArrowRightLeft className="size-4 text-primary" />
            Este cambio se reflejará en el tracking del pedido.
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
