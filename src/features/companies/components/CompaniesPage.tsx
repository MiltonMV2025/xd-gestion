import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { createCompany, deleteCompany, getCompanies, updateCompany } from "@/services/companyService";
import type { CompanyItem } from "@/types/domain";

type CompanyForm = Omit<CompanyItem, "id" | "createdAt" | "logoUrl"> & { logoUrl?: string };

const emptyForm: CompanyForm = { name: "", phone: "", email: "", address: "", logoUrl: "" };

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyItem | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const { execute, isLoading, error, clearError } = useAsyncAction();

  async function refresh() {
    const response = await getCompanies();
    if (response.error) throw new Error(response.error);
    setCompanies(response.data ?? []);
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setIsBootstrapping(true);
      setBootstrapError(null);
      const response = await getCompanies();
      if (!mounted) return;
      if (response.error) setBootstrapError(response.error);
      else setCompanies(response.data ?? []);
      setIsBootstrapping(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function openCreate() {
    clearError();
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(company: CompanyItem) {
    clearError();
    setEditing(company);
    setForm({
      name: company.name,
      phone: company.phone,
      email: company.email,
      address: company.address,
      logoUrl: company.logoUrl,
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    clearError();
  }

  function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    void execute(async () => {
      if (editing) {
        const response = await updateCompany({ id: editing.id, ...form });
        if (response.error) throw new Error(response.error);
      } else {
        const response = await createCompany(form);
        if (response.error) throw new Error(response.error);
      }

      await refresh();
      closeModal();
      return true;
    });
  }

  function removeCompany(companyId: string) {
    if (!window.confirm("¿Eliminar esta empresa?")) return;
    clearError();
    void execute(async () => {
      const response = await deleteCompany(companyId);
      if (response.error) throw new Error(response.error);
      await refresh();
      return true;
    });
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Empresas"
        subtitle="Administrá las empresas base del sistema."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva empresa
          </Button>
        }
      />

      {isBootstrapping && <p className="text-sm text-muted-foreground">Cargando empresas...</p>}
      {bootstrapError && <p className="text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Listado de empresas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.email || "-"}</TableCell>
                  <TableCell>{company.phone || "-"}</TableCell>
                  <TableCell>{company.address || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(company)}>
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeCompany(company.id)}>
                        <Trash2 className="size-3.5" /> Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!companies.length && (
            <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
              No hay empresas registradas.
            </p>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={closeModal} title={editing ? "Editar empresa" : "Nueva empresa"}>
        <form className="space-y-4" onSubmit={saveCompany}>
          <div className="grid gap-3">
            <Input
              placeholder="Nombre de empresa"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              placeholder="Teléfono"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Input
              placeholder="Dirección"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
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
