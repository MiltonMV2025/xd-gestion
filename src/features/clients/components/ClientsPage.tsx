import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
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
import { getCompanies } from "@/services/companyService";
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
  updateClientPhoto,
  uploadClientPhoto,
} from "@/services/clientService";
import type { Client, CompanyItem } from "@/types/domain";

const emptyClient: Omit<Client, "id" | "createdAt"> = {
  name: "",
  phone: "",
  email: "",
  address: "",
  companyId: null,
  position: "",
  photoUrl: "",
  companyName: "",
};

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { execute, error, clearError, isLoading } = useAsyncAction();

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);

      const companiesResponse = await getCompanies();
      if (!mounted) return;

      if (companiesResponse.error) {
        setBootstrapError(companiesResponse.error);
      } else {
        setCompanies(companiesResponse.data ?? []);
      }

      const clientsResponse = await listClients(companiesResponse.data ?? []);
      if (clientsResponse.error) {
        setBootstrapError((current) =>
          current ? `${current} | ${clientsResponse.error}` : clientsResponse.error,
        );
      } else {
        setClients(clientsResponse.data ?? []);
      }

      setIsBootstrapping(false);
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setPhotoPreview("");
      return;
    }

    if (photoFile) {
      const objectUrl = URL.createObjectURL(photoFile);
      setPhotoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPhotoPreview(editingClient?.photoUrl ?? "");
  }, [photoFile, editingClient, isModalOpen]);

  const filteredClients = useMemo(() => {
    const term = filter.toLowerCase().trim();
    if (!term) return clients;

    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        client.address.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        (client.companyName ?? "").toLowerCase().includes(term),
    );
  }, [clients, filter]);

  function closeModal() {
    setIsModalOpen(false);
    setEditingClient(null);
    setPhotoFile(null);
    setForm(emptyClient);
    clearError();
  }

  function openCreateModal() {
    clearError();
    setEditingClient(null);
    setPhotoFile(null);
    setForm(emptyClient);
    setIsModalOpen(true);
  }

  function openEditModal(client: Client) {
    clearError();
    setEditingClient(client);
    setPhotoFile(null);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      companyId: client.companyId,
      position: client.position,
      photoUrl: client.photoUrl,
      companyName: client.companyName,
    });
    setIsModalOpen(true);
  }

  function resetEdition() {
    if (!editingClient) return;
    setPhotoFile(null);
    setForm({
      name: editingClient.name,
      phone: editingClient.phone,
      email: editingClient.email,
      address: editingClient.address,
      companyId: editingClient.companyId,
      position: editingClient.position,
      photoUrl: editingClient.photoUrl,
      companyName: editingClient.companyName,
    });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    if (!form.name || !form.email) return;

    void execute(async () => {
      if (editingClient) {
        const response = await updateClient(editingClient.id, form);
        if (response.error) {
          throw new Error(response.error);
        }
        if (photoFile) {
          const upload = await uploadClientPhoto(editingClient.id, photoFile);
          if (upload.error) throw new Error(upload.error);
          if (upload.data) {
            const photoUpdate = await updateClientPhoto(editingClient.id, upload.data);
            if (photoUpdate.error) throw new Error(photoUpdate.error);
          }
        }
      } else {
        const response = await createClient(form);
        if (response.error) {
          throw new Error(response.error);
        }
        if (photoFile && response.data) {
          const upload = await uploadClientPhoto(response.data, photoFile);
          if (upload.error) throw new Error(upload.error);
          if (upload.data) {
            const photoUpdate = await updateClientPhoto(response.data, upload.data);
            if (photoUpdate.error) throw new Error(photoUpdate.error);
          }
        }
      }

      const listResponse = await listClients(companies);
      if (listResponse.error) {
        throw new Error(listResponse.error);
      }

      setClients(listResponse.data ?? []);
      closeModal();
      return true;
    });
  }

  function handleDelete(clientId: string) {
    clearError();
    void execute(async () => {
      const response = await deleteClient(clientId);
      if (response.error) throw new Error(response.error);

      const listResponse = await listClients(companies);
      if (listResponse.error) throw new Error(listResponse.error);
      setClients(listResponse.data ?? []);
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Clientes"
        subtitle="Administra el catálogo de clientes y su vínculo con empresas."
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-1 size-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Filtrar por nombre, dirección o email"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando clientes...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Foto</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>
                {client.photoUrl ? (
                  <img
                    src={client.photoUrl}
                    alt={client.name}
                    className="size-10 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xs">
                    {client.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </TableCell>
              <TableCell>{client.address}</TableCell>
              <TableCell>{client.companyName ?? "-"}</TableCell>
              <TableCell>{client.position || "-"}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(client)}>
                    <Pencil className="mr-1 size-4" />
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(client.id)}>
                    <Trash2 className="mr-1 size-4" />
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingClient ? "Editar cliente" : "Crear cliente"}
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
            <button
              type="button"
              className="group relative"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar foto"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Foto"
                  className="size-20 rounded-full object-cover ring-2 ring-border transition group-hover:ring-primary"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-muted text-lg font-semibold ring-2 ring-border transition group-hover:ring-primary">
                  {(form.name || "C").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex justify-center items-center rounded-full border border-border bg-background p-1.5 text-muted-foreground shadow-sm transition-colors group-hover:border-primary group-hover:text-primary">
                <Pencil className="size-3.5" />
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            />

            <p className="text-xs text-muted-foreground">
              {photoFile ? `Archivo seleccionado: ${photoFile.name}` : "Sin cambios de imagen"}
            </p>

            {photoFile && (
              <Button type="button" variant="ghost" size="xs" onClick={() => setPhotoFile(null)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                Quitar selección
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Nombre"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Dirección"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <Select
              value={form.companyId ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, companyId: event.target.value || null }))
              }
            >
              <option value="">Sin empresa</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Cargo / Puesto"
              value={form.position}
              onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
            />
            <Input
              placeholder="Teléfono"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
            {editingClient && (
              <Button type="button" variant="outline" onClick={resetEdition}>
                Restaurar cambios
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Upload className="mr-1 size-4" />
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
