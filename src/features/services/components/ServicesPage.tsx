import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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
import {
  createService,
  deleteService,
  getServices,
  updateService,
} from "@/services/serviceCatalogService";
import type { ServiceCatalogItem } from "@/types/domain";

interface ServiceForm {
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
}

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  unitPrice: 0,
  active: true,
};

export function ServicesPage() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const { execute, error, clearError, isLoading } = useAsyncAction();

  async function refresh() {
    const response = await getServices();
    if (response.error) throw new Error(response.error);
    setServices(response.data ?? []);
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);

      const response = await getServices();
      if (!mounted) return;

      if (response.error) setBootstrapError(response.error);
      else setServices(response.data ?? []);

      setIsBootstrapping(false);
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    clearError();
  }

  function openCreate() {
    clearError();
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(service: ServiceCatalogItem) {
    clearError();
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description,
      unitPrice: service.unitPrice,
      active: service.active,
    });
    setOpen(true);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    void execute(async () => {
      if (editing) {
        const response = await updateService({
          id: editing.id,
          name: form.name,
          description: form.description,
          unitPrice: Number(form.unitPrice),
          active: form.active,
        });
        if (response.error) throw new Error(response.error);
      } else {
        const response = await createService({
          name: form.name,
          description: form.description,
          unitPrice: Number(form.unitPrice),
          active: form.active,
        });
        if (response.error) throw new Error(response.error);
      }

      await refresh();
      closeModal();
      return true;
    });
  }

  function handleDelete(serviceId: string) {
    clearError();
    void execute(async () => {
      const response = await deleteService(serviceId);
      if (response.error) throw new Error(response.error);
      await refresh();
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Servicios"
        subtitle="Catálogo de servicios y precios base para cotizaciones."
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-1 size-4" /> Nuevo servicio
          </Button>
        }
      />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando servicios...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Servicio</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Precio base</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.description || "-"}</TableCell>
              <TableCell>${service.unitPrice.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={service.active ? "success" : "neutral"}>
                  {service.active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                    <Pencil className="mr-1 size-4" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="mr-1 size-4" /> Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal open={open} onClose={closeModal} title={editing ? "Editar servicio" : "Crear servicio"}>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-3">
            <Input
              placeholder="Nombre del servicio"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Descripción"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Precio base"
              value={form.unitPrice || ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, unitPrice: Number(event.target.value || 0) }))
              }
              required
            />
            <Select
              value={form.active ? "active" : "inactive"}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, active: event.target.value === "active" }))
              }
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
