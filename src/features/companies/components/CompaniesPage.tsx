import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
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
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
  updateCompanyPhoto,
  uploadCompanyPhoto,
} from "@/services/companyService";
import type { CompanyItem } from "@/types/domain";

type CompanyForm = Omit<CompanyItem, "id" | "createdAt">;

const emptyForm: CompanyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  logoUrl: "",
};

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyItem | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { execute, error, clearError, isLoading } = useAsyncAction();

  async function loadCompanies() {
    const response = await getCompanies();
    if (response.error) throw new Error(response.error);
    setCompanies(response.data ?? []);
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);
      try {
        const response = await getCompanies();
        if (!mounted) return;
        if (response.error) {
          setBootstrapError(response.error);
        } else {
          setCompanies(response.data ?? []);
        }
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setLogoPreview("");
      return;
    }

    if (logoFile) {
      const objectUrl = URL.createObjectURL(logoFile);
      setLogoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setLogoPreview(editing?.logoUrl ?? "");
  }, [logoFile, editing, open]);

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setLogoFile(null);
    setForm(emptyForm);
    clearError();
  }

  function openCreate() {
    clearError();
    setEditing(null);
    setLogoFile(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: CompanyItem) {
    clearError();
    setEditing(item);
    setLogoFile(null);
    setForm({
      name: item.name,
      phone: item.phone,
      email: item.email,
      address: item.address,
      logoUrl: item.logoUrl,
    });
    setOpen(true);
  }

  function resetEdition() {
    if (!editing) return;
    setLogoFile(null);
    setForm({
      name: editing.name,
      phone: editing.phone,
      email: editing.email,
      address: editing.address,
      logoUrl: editing.logoUrl,
    });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    void execute(async () => {
      let companyId = editing?.id ?? "";

      if (editing) {
        const response = await updateCompany({
          id: editing.id,
          ...form,
        });
        if (response.error) throw new Error(response.error);
      } else {
        const response = await createCompany(form);
        if (response.error) throw new Error(response.error);
        companyId = response.data ?? "";
      }

      if (logoFile && companyId) {
        const upload = await uploadCompanyPhoto(companyId, logoFile);
        if (upload.error) throw new Error(upload.error);
        if (upload.data) {
          const updateLogo = await updateCompanyPhoto(companyId, upload.data);
          if (updateLogo.error) throw new Error(updateLogo.error);
        }
      }

      await loadCompanies();
      closeModal();
      return true;
    });
  }

  function handleDelete(companyId: string) {
    clearError();
    void execute(async () => {
      const response = await deleteCompany(companyId);
      if (response.error) throw new Error(response.error);
      await loadCompanies();
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Empresas"
        subtitle="Gestión de empresas asociadas a clientes y cotizaciones."
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-1 size-4" /> Nueva empresa
          </Button>
        }
      />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando empresas...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="size-10 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xs">
                    {company.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </TableCell>
              <TableCell>{company.name}</TableCell>
              <TableCell>{company.email || "-"}</TableCell>
              <TableCell>{company.phone || "-"}</TableCell>
              <TableCell>{company.address || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(company)}>
                    <Pencil className="mr-1 size-4" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(company.id)}>
                    <Trash2 className="mr-1 size-4" /> Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal open={open} onClose={closeModal} title={editing ? "Editar empresa" : "Crear empresa"}>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
            <button
              type="button"
              className="group relative"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar foto"
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="size-20 rounded-full object-cover ring-2 ring-border transition group-hover:ring-primary"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-muted text-lg font-semibold ring-2 ring-border transition group-hover:ring-primary">
                  {(form.name || "E").slice(0, 1).toUpperCase()}
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
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            />

            <p className="text-xs text-muted-foreground">
              {logoFile ? `Archivo seleccionado: ${logoFile.name}` : "Sin cambios de imagen"}
            </p>

            {logoFile && (
              <Button type="button" variant="ghost" size="xs" onClick={() => setLogoFile(null)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
              placeholder="Email"
              type="email"
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

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
            {editing && (
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
