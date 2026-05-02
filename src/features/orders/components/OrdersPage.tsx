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
import { listOrders, updateOrderStatus } from "@/services/operationsService";
import type { Order, OrderStatus } from "@/types/domain";
import { orderStatusLabel } from "@/utils/status";

const statusVariant: Record<OrderStatus, "warning" | "success" | "primary"> = {
  in_progress: "warning",
  finished: "primary",
  delivered: "success",
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string;
    from: OrderStatus;
    to: OrderStatus;
  } | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { execute, isLoading, error } = useAsyncAction();

  async function refresh() {
    const response = await listOrders();
    if (response.error) throw new Error(response.error);
    setOrders(response.data ?? []);
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);
      const response = await listOrders();
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

  function requestStatusChange(orderId: string, from: OrderStatus, to: OrderStatus) {
    if (from === to) return;
    setPendingStatusChange({ orderId, from, to });
    setShowStatusModal(true);
  }

  function confirmStatusChange() {
    if (!pendingStatusChange) return;

    void execute(async () => {
      const response = await updateOrderStatus(pendingStatusChange.orderId, pendingStatusChange.to);
      if (response.error) throw new Error(response.error);
      await refresh();
      setShowStatusModal(false);
      setPendingStatusChange(null);
      return true;
    });
  }

  return (
    <section>
      <PageHeader title="Pedidos" subtitle="Seguimiento de estados de entrega para el cliente." />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando pedidos...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Orden producción</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Última actualización</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.id}</TableCell>
              <TableCell>{order.clientName}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[order.status]}>{orderStatusLabel[order.status]}</Badge>
                  <Select
                    className="max-w-44"
                    value={order.status}
                    onChange={(event) => requestStatusChange(order.id, order.status, event.target.value as OrderStatus)}
                  >
                    <option value="in_progress">En proceso</option>
                    <option value="finished">Finalizado</option>
                    <option value="delivered">Entregado</option>
                  </Select>
                </div>
              </TableCell>
              <TableCell>{order.updatedAt}</TableCell>
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
            Cambiarás el pedido de
            <span className="mx-1 font-semibold text-foreground">
              {pendingStatusChange ? orderStatusLabel[pendingStatusChange.from] : ""}
            </span>
            a
            <span className="ml-1 font-semibold text-foreground">
              {pendingStatusChange ? orderStatusLabel[pendingStatusChange.to] : ""}
            </span>
            .
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <ArrowRightLeft className="size-4 text-primary" />
            Confirma para evitar cambios accidentales en el tracking.
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
