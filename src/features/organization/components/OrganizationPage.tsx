import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { deleteClient, listClients, createClient, updateClient } from "@/services/clientService";
import {
  createCompanyBranch,
  deleteCompanyBranch,
  getCompanyBranches,
  updateCompanyBranch,
} from "@/services/companyBranchService";
import { createCompany, deleteCompany, getCompanies, updateCompany } from "@/services/companyService";
import type { Client, CompanyBranchItem, CompanyItem } from "@/types/domain";

type CompanyForm = Omit<CompanyItem, "id" | "createdAt" | "logoUrl"> & { logoUrl?: string };
type BranchForm = Omit<CompanyBranchItem, "id" | "createdAt" | "companyId">;
type ClientForm = Omit<Client, "id" | "createdAt" | "companyName" | "branchName" | "photoUrl"> & {
  photoUrl?: string;
};

const emptyCompany: CompanyForm = { name: "", phone: "", email: "", address: "", logoUrl: "" };
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

export function OrganizationPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [branches, setBranches] = useState<CompanyBranchItem[]>([]);
  const [clientBranches, setClientBranches] = useState<CompanyBranchItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [editingBranch, setEditingBranch] = useState<CompanyBranchItem | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompany);
  const [branchForm, setBranchForm] = useState<BranchForm>(emptyBranch);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);

  const { execute, error, clearError, isLoading } = useAsyncAction();

  async function refreshClients(companyList: CompanyItem[] = companies) {
    const clientsResponse = await listClients(companyList);
    if (clientsResponse.error) throw new Error(clientsResponse.error);
    setClients(clientsResponse.data ?? []);
  }

  async function refreshBranches(companyId: string | null) {
    if (!companyId) {
      setBranches([]);
      setSelectedBranchId(null);
      return;
    }

    const branchResponse = await getCompanyBranches(companyId);
    if (branchResponse.error) throw new Error(branchResponse.error);
    const rows = branchResponse.data ?? [];
    setBranches(rows);
    setSelectedBranchId((current) => (current && rows.some((row) => row.id === current) ? current : null));
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

      const firstCompany = companyRows[0]?.id ?? null;
      setSelectedCompanyId(firstCompany);

      await Promise.all([refreshClients(companyRows), refreshBranches(firstCompany)]);
    } catch (cause) {
      setBootstrapError(cause instanceof Error ? cause.message : "No se pudo cargar organización");
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    void execute(async () => {
      await refreshBranches(selectedCompanyId);
      return true;
    });
  }, [selectedCompanyId]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (selectedCompanyId && client.companyId !== selectedCompanyId) return false;
      if (selectedBranchId && client.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [clients, selectedCompanyId, selectedBranchId]);

  function openCompanyCreate() {
    clearError();
    setEditingCompany(null);
    setCompanyForm(emptyCompany);
    setCompanyModalOpen(true);
  }

  function openCompanyEdit(company: CompanyItem) {
    clearError();
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      phone: company.phone,
      email: company.email,
      address: company.address,
      logoUrl: company.logoUrl,
    });
    setCompanyModalOpen(true);
  }

  function openBranchCreate() {
    clearError();
    if (!selectedCompanyId) return;
    setEditingBranch(null);
    setBranchForm(emptyBranch);
    setBranchModalOpen(true);
  }

  function openBranchEdit(branch: CompanyBranchItem) {
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

  function openClientCreate() {
    clearError();
    setEditingClient(null);
    setClientForm({
      ...emptyClient,
      companyId: selectedCompanyId,
      branchId: selectedBranchId,
    });
    setClientBranches(branches);
    setClientModalOpen(true);
  }

  function openClientEdit(client: Client) {
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
    void execute(async () => {
      if (!client.companyId) {
        setClientBranches([]);
        return true;
      }
      const response = await getCompanyBranches(client.companyId);
      if (response.error) throw new Error(response.error);
      setClientBranches(response.data ?? []);
      return true;
    });
    setClientModalOpen(true);
  }

  function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    void execute(async () => {
      if (editingCompany) {
        const response = await updateCompany({ id: editingCompany.id, ...companyForm });
        if (response.error) throw new Error(response.error);
      } else {
        const response = await createCompany(companyForm);
        if (response.error) throw new Error(response.error);
      }

      const companiesResponse = await getCompanies();
      if (companiesResponse.error) throw new Error(companiesResponse.error);
      const rows = companiesResponse.data ?? [];
      setCompanies(rows);

      if (!selectedCompanyId) {
        setSelectedCompanyId(rows[0]?.id ?? null);
      }

      setCompanyModalOpen(false);
      return true;
    });
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
    if (!clientForm.companyId) return;

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

  function removeCompany(companyId: string) {
    clearError();
    void execute(async () => {
      const response = await deleteCompany(companyId);
      if (response.error) throw new Error(response.error);
      await bootstrap();
      return true;
    });
  }

  function removeBranch(branchId: string) {
    clearError();
    if (!selectedCompanyId) return;
    void execute(async () => {
      const response = await deleteCompanyBranch(branchId);
      if (response.error) throw new Error(response.error);
      await refreshBranches(selectedCompanyId);
      await refreshClients();
      return true;
    });
  }

  function removeClient(clientId: string) {
    clearError();
    void execute(async () => {
      const response = await deleteClient(clientId);
      if (response.error) throw new Error(response.error);
      await refreshClients();
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Organización"
        subtitle="Empresas, sucursales y clientes en una experiencia unificada."
      />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando organización...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Empresas</CardTitle>
            <Button size="sm" onClick={openCompanyCreate}>
              <Plus className="mr-1 size-4" /> Nueva
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`rounded-lg border p-3 ${selectedCompanyId === company.id ? "border-primary bg-primary/10" : "border-border/60"}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setSelectedBranchId(null);
                  }}
                >
                  <p className="font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.email || "Sin email"}</p>
                </button>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openCompanyEdit(company)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeCompany(company.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sucursales</CardTitle>
            <Button size="sm" onClick={openBranchCreate} disabled={!selectedCompanyId}>
              <Plus className="mr-1 size-4" /> Nueva
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`rounded-lg border p-3 ${selectedBranchId === branch.id ? "border-primary bg-primary/10" : "border-border/60"}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedBranchId((current) => (current === branch.id ? null : branch.id))}
                >
                  <p className="font-medium">{branch.name}</p>
                  <p className="text-xs text-muted-foreground">{branch.address || "Sin dirección"}</p>
                </button>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openBranchEdit(branch)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeBranch(branch.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {!selectedCompanyId && <p className="text-xs text-muted-foreground">Seleccioná una empresa.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Clientes</CardTitle>
            <Button size="sm" onClick={openClientCreate} disabled={!selectedCompanyId}>
              <Plus className="mr-1 size-4" /> Nuevo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredClients.map((client) => (
              <div key={client.id} className="rounded-lg border border-border/60 p-3">
                <p className="font-medium">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.email || "Sin email"}</p>
                <p className="text-xs text-muted-foreground">{client.branchName || "Sin sucursal"}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openClientEdit(client)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeClient(client.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal open={companyModalOpen} onClose={() => setCompanyModalOpen(false)} title={editingCompany ? "Editar empresa" : "Nueva empresa"}>
        <form className="space-y-3" onSubmit={saveCompany}>
          <Input placeholder="Nombre" value={companyForm.name} onChange={(event) => setCompanyForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <Input placeholder="Email" value={companyForm.email} onChange={(event) => setCompanyForm((prev) => ({ ...prev, email: event.target.value }))} />
          <Input placeholder="Teléfono" value={companyForm.phone} onChange={(event) => setCompanyForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input placeholder="Dirección" value={companyForm.address} onChange={(event) => setCompanyForm((prev) => ({ ...prev, address: event.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCompanyModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={branchModalOpen} onClose={() => setBranchModalOpen(false)} title={editingBranch ? "Editar sucursal" : "Nueva sucursal"}>
        <form className="space-y-3" onSubmit={saveBranch}>
          <Input placeholder="Nombre" value={branchForm.name} onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <Input placeholder="Email" value={branchForm.email} onChange={(event) => setBranchForm((prev) => ({ ...prev, email: event.target.value }))} />
          <Input placeholder="Teléfono" value={branchForm.phone} onChange={(event) => setBranchForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input placeholder="Dirección" value={branchForm.address} onChange={(event) => setBranchForm((prev) => ({ ...prev, address: event.target.value }))} />
          <Select value={branchForm.active ? "1" : "0"} onChange={(event) => setBranchForm((prev) => ({ ...prev, active: event.target.value === "1" }))}>
            <option value="1">Activa</option>
            <option value="0">Inactiva</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setBranchModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={clientModalOpen} onClose={() => setClientModalOpen(false)} title={editingClient ? "Editar cliente" : "Nuevo cliente"}>
        <form className="space-y-3" onSubmit={saveClient}>
          <Input placeholder="Nombre" value={clientForm.name} onChange={(event) => setClientForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <Input placeholder="Email" value={clientForm.email} onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))} required />
          <Input placeholder="Teléfono" value={clientForm.phone} onChange={(event) => setClientForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input placeholder="Dirección" value={clientForm.address} onChange={(event) => setClientForm((prev) => ({ ...prev, address: event.target.value }))} />
          <Input placeholder="Cargo / Puesto" value={clientForm.position} onChange={(event) => setClientForm((prev) => ({ ...prev, position: event.target.value }))} />
          <Select
            value={clientForm.companyId ?? ""}
            onChange={(event) => {
              const companyId = event.target.value || null;
              setClientForm((prev) => ({ ...prev, companyId, branchId: null }));
              void execute(async () => {
                if (!companyId) {
                  setClientBranches([]);
                  return true;
                }
                const response = await getCompanyBranches(companyId);
                if (response.error) throw new Error(response.error);
                setClientBranches(response.data ?? []);
                return true;
              });
            }}
            required
          >
            <option value="">Seleccioná empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
          <Select
            value={clientForm.branchId ?? ""}
            onChange={(event) => setClientForm((prev) => ({ ...prev, branchId: event.target.value || null }))}
          >
            <option value="">Sin sucursal</option>
            {clientBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setClientModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
