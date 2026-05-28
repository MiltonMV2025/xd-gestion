import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { createClient, deleteClient, listClients, updateClient } from "@/services/clientService";
import {
  createCompanyBranch,
  deleteCompanyBranch,
  getCompanyBranches,
  updateCompanyBranch,
} from "@/services/companyBranchService";
import { getCompanies } from "@/services/companyService";
import type { Client, CompanyBranchItem, CompanyItem } from "@/types/domain";

type BranchForm = Omit<CompanyBranchItem, "id" | "createdAt" | "companyId">;
type ClientForm = Omit<Client, "id" | "createdAt" | "companyName" | "branchName" | "photoUrl"> & {
  photoUrl?: string;
};

const emptyBranch: BranchForm = { name: "", phone: "", email: "", address: "", active: true };
const emptyClient: ClientForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  companyId: null,
  branchId: null,
  position: "",
};

export function BranchesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [branches, setBranches] = useState<CompanyBranchItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranchItem | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [branchForm, setBranchForm] = useState<BranchForm>(emptyBranch);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);
  const { execute, error, clearError, isLoading } = useAsyncAction();

  const branchClients = useMemo(
    () => clients.filter((client) => client.branchId === selectedBranchId),
    [clients, selectedBranchId],
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  async function refreshClients(companyList: CompanyItem[] = companies) {
    const response = await listClients(companyList);
    if (response.error) throw new Error(response.error);
    setClients(response.data ?? []);
  }

  async function refreshBranches(companyId: string | null) {
    if (!companyId) {
      setBranches([]);
      setSelectedBranchId(null);
      return;
    }
    const response = await getCompanyBranches(companyId);
    if (response.error) throw new Error(response.error);
    const rows = response.data ?? [];
    setBranches(rows);
    setSelectedBranchId((current) => (current && rows.some((branch) => branch.id === current) ? current : rows[0]?.id ?? null));
  }

  async function bootstrap() {
    setIsBootstrapping(true);
    setBootstrapError(null);
    clearError();

    try {
      const companiesResponse = await getCompanies();
      if (companiesResponse.error) throw new Error(companiesResponse.error);
      const companyRows = companiesResponse.data ?? [];
      setCompanies(companyRows);
      const firstCompanyId = companyRows[0]?.id ?? null;
      setSelectedCompanyId(firstCompanyId);
      await Promise.all([refreshBranches(firstCompanyId), refreshClients(companyRows)]);
    } catch (cause) {
      setBootstrapError(cause instanceof Error ? cause.message : "No se pudo cargar sucursales");
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    void execute(async () => {
      await refreshBranches(selectedCompanyId);
      return true;
    });
  }, [selectedCompanyId]);

  function openCreateBranch() {
    clearError();
    setEditingBranch(null);
    setBranchForm(emptyBranch);
    setBranchModalOpen(true);
  }

  function openEditBranch(branch: CompanyBranchItem) {
    clearError();
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      phone: branch.phone,
      email: branch.email,
      address: branch.address,
      active: branch.active,
    });
    setBranchModalOpen(true);
  }

  function openCreateClient() {
    if (!selectedCompanyId || !selectedBranchId) return;
    clearError();
    setEditingClient(null);
    setClientForm({
      ...emptyClient,
      companyId: selectedCompanyId,
      branchId: selectedBranchId,
    });
    setClientModalOpen(true);
  }

  function openEditClient(client: Client) {
    clearError();
    setEditingClient(client);
    setClientForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      companyId: client.companyId,
      branchId: client.branchId,
      position: client.position,
    });
    setClientModalOpen(true);
  }

  function saveBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    if (!selectedCompanyId) return;

    void execute(async () => {
      if (editingBranch) {
        const response = await updateCompanyBranch({ id: editingBranch.id, ...branchForm });
        if (response.error) throw new Error(response.error);
      } else {
        const response = await createCompanyBranch({ companyId: selectedCompanyId, ...branchForm });
        if (response.error) throw new Error(response.error);
      }

      await refreshBranches(selectedCompanyId);
      await refreshClients();
      setBranchModalOpen(false);
      return true;
    });
  }

  function saveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    if (!clientForm.companyId || !clientForm.branchId) return;

    void execute(async () => {
      if (editingClient) {
        const response = await updateClient(editingClient.id, clientForm);
        if (response.error) throw new Error(response.error);
      } else {
        const response = await createClient(clientForm);
        if (response.error) throw new Error(response.error);
      }

      await refreshClients();
      setClientModalOpen(false);
      return true;
    });
  }

  function removeBranch(branchId: string) {
    if (!window.confirm("¿Eliminar esta sucursal?")) return;
    clearError();
    void execute(async () => {
      const response = await deleteCompanyBranch(branchId);
      if (response.error) throw new Error(response.error);
      await refreshBranches(selectedCompanyId);
      await refreshClients();
      return true;
    });
  }

  function removeClient(clientId: string) {
    if (!window.confirm("Se eliminará este cliente de la sucursal. ¿Continuar?")) return;
    clearError();
    void execute(async () => {
      const response = await deleteClient(clientId);
      if (response.error) throw new Error(response.error);
      await refreshClients();
      return true;
    });
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Sucursales"
        subtitle="Administrá sucursales por empresa y los clientes de cada una."
      />

      {isBootstrapping && <p className="text-sm text-muted-foreground">Cargando sucursales...</p>}
      {bootstrapError && <p className="text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Empresa</p>
            <Select
              value={selectedCompanyId ?? ""}
              onChange={(event) => setSelectedCompanyId(event.target.value || null)}
            >
              <option value="">Seleccioná empresa</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={openCreateBranch} disabled={!selectedCompanyId}>
            <Plus className="size-4" /> Nueva sucursal
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>{selectedCompany ? `Sucursales de ${selectedCompany.name}` : "Sucursales"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {branches.map((branch) => {
              const selected = branch.id === selectedBranchId;
              return (
                <article
                  key={branch.id}
                  className={`rounded-xl border p-3 transition ${selected ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/40"}`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedBranchId(branch.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{branch.name}</p>
                      <Badge variant={branch.active ? "success" : "warning"}>
                        {branch.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{branch.address || "Sin dirección"}</p>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditBranch(branch)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeBranch(branch.id)}>
                      <Trash2 className="size-3.5" /> Eliminar
                    </Button>
                  </div>
                </article>
              );
            })}

            {!branches.length && (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                No hay sucursales para esta empresa.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Clientes de la sucursal</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedBranchId
                    ? "Gestioná los clientes asociados a la sucursal seleccionada."
                    : "Seleccioná una sucursal para ver sus clientes."}
                </p>
              </div>
              <Button onClick={openCreateClient} disabled={!selectedBranchId} className="ml-auto">
                <Plus className="size-4" /> Crear cliente
              </Button>
            </div>

            {!!selectedBranchId && (
              <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-1 text-sm">
                <Users className="size-4 text-primary" />
                {branchClients.length} cliente{branchClients.length === 1 ? "" : "s"} en esta sucursal
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.position || "-"}</TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditClient(client)}>
                          <Pencil className="size-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeClient(client.id)}>
                          <Trash2 className="size-3.5" /> Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!selectedBranchId && (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                Elegí una sucursal para habilitar la gestión de clientes.
              </p>
            )}
            {!!selectedBranchId && !branchClients.length && (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                Esta sucursal todavía no tiene clientes registrados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title={editingBranch ? "Editar sucursal" : "Nueva sucursal"}
      >
        <form className="space-y-4" onSubmit={saveBranch}>
          <div className="grid gap-3">
            <Input
              placeholder="Nombre de sucursal"
              value={branchForm.name}
              onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Email"
              value={branchForm.email}
              onChange={(event) => setBranchForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              placeholder="Teléfono"
              value={branchForm.phone}
              onChange={(event) => setBranchForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Input
              placeholder="Dirección"
              value={branchForm.address}
              onChange={(event) => setBranchForm((prev) => ({ ...prev, address: event.target.value }))}
            />
            <Select
              value={branchForm.active ? "1" : "0"}
              onChange={(event) => setBranchForm((prev) => ({ ...prev, active: event.target.value === "1" }))}
            >
              <option value="1">Activa</option>
              <option value="0">Inactiva</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button type="button" variant="ghost" onClick={() => setBranchModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        title={editingClient ? "Editar cliente" : "Crear cliente"}
      >
        <form className="space-y-4" onSubmit={saveClient}>
          <div className="grid gap-3">
            <Input
              placeholder="Nombre y apellido"
              value={clientForm.name}
              onChange={(event) => setClientForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Correo electrónico"
              type="email"
              value={clientForm.email}
              onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <Input
              placeholder="Teléfono"
              value={clientForm.phone}
              onChange={(event) => setClientForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Input
              placeholder="Puesto o cargo"
              value={clientForm.position}
              onChange={(event) => setClientForm((prev) => ({ ...prev, position: event.target.value }))}
            />
            <Input
              placeholder="Dirección"
              value={clientForm.address}
              onChange={(event) => setClientForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button type="button" variant="ghost" onClick={() => setClientModalOpen(false)}>
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
