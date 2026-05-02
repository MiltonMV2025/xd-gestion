import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { getDepartments, getRoles } from "@/services/catalogService";
import {
  createUser,
  getUsers,
  setUserAvatar,
  suspendUser,
  updateUser,
  uploadAvatar,
} from "@/services/userService";
import type { DepartmentItem, RoleItem, UserItem } from "@/types/domain";

interface UserFormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
  departmentId: string;
}

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  roleId: "",
  departmentId: "",
};

export function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { execute, isLoading, error, clearError } = useAsyncAction();

  const roleOptions = useMemo(() => roles.filter((role) => role.type === "system"), [roles]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setIsBootstrapping(true);
      setBootstrapError(null);

      const [rolesResult, departmentsResult] = await Promise.all([getRoles(), getDepartments()]);
      if (!mounted) return;

      if (rolesResult.error) {
        setBootstrapError(`Roles: ${rolesResult.error}`);
        setIsBootstrapping(false);
        return;
      }

      if (departmentsResult.error) {
        setBootstrapError(`Departamentos: ${departmentsResult.error}`);
        setIsBootstrapping(false);
        return;
      }

      const rolesData = rolesResult.data ?? [];
      const departmentsData = departmentsResult.data ?? [];
      setRoles(rolesData);
      setDepartments(departmentsData);

      const usersResult = await getUsers(rolesData, departmentsData);
      if (!mounted) return;

      if (usersResult.error) {
        setBootstrapError(`Usuarios: ${usersResult.error}`);
      } else {
        setUsers(usersResult.data ?? []);
      }

      setIsBootstrapping(false);
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setAvatarPreview("");
      return;
    }

    if (avatarFile) {
      const objectUrl = URL.createObjectURL(avatarFile);
      setAvatarPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setAvatarPreview(editingUser?.avatarUrl ?? "");
  }, [avatarFile, editingUser, open]);

  async function refreshUsers(rolesRef = roles, departmentsRef = departments) {
    const usersResult = await getUsers(rolesRef, departmentsRef);
    if (usersResult.error) throw new Error(usersResult.error);
    setUsers(usersResult.data ?? []);
  }

  function closeModal() {
    setOpen(false);
    setEditingUser(null);
    setAvatarFile(null);
    setForm(emptyForm);
    clearError();
  }

  function openCreateModal() {
    clearError();
    setEditingUser(null);
    setAvatarFile(null);
    setForm({
      ...emptyForm,
      roleId: roleOptions[0]?.id ?? roles[0]?.id ?? "",
      departmentId: departments[0]?.id ?? "",
    });
    setOpen(true);
  }

  function openEditModal(user: UserItem) {
    clearError();
    setEditingUser(user);
    setAvatarFile(null);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId ?? roleOptions[0]?.id ?? roles[0]?.id ?? "",
      departmentId: user.departmentId ?? departments[0]?.id ?? "",
    });
    setOpen(true);
  }

  function resetEdition() {
    if (!editingUser) return;
    setAvatarFile(null);
    setForm({
      name: editingUser.name,
      email: editingUser.email,
      password: "",
      roleId: editingUser.roleId ?? roleOptions[0]?.id ?? roles[0]?.id ?? "",
      departmentId: editingUser.departmentId ?? departments[0]?.id ?? "",
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    void execute(async () => {
      let userId = editingUser?.id ?? "";

      if (editingUser) {
        const response = await updateUser({
          id: editingUser.id,
          name: form.name,
          email: form.email,
          roleId: form.roleId,
          departmentId: form.departmentId,
        });
        if (response.error) throw new Error(response.error);
      } else {
        if (!form.password) throw new Error("La contraseña es obligatoria para crear usuario.");
        const response = await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          roleId: form.roleId,
          departmentId: form.departmentId,
        });
        if (response.error) throw new Error(response.error);
        userId = response.data ?? "";
      }

      if (avatarFile && userId) {
        const uploadResult = await uploadAvatar(userId, avatarFile);
        if (uploadResult.error) throw new Error(uploadResult.error);
        if (uploadResult.data) {
          const avatarResult = await setUserAvatar(userId, uploadResult.data);
          if (avatarResult.error) throw new Error(avatarResult.error);
        }
      }

      await refreshUsers();
      closeModal();
      return true;
    });
  }

  function handleSuspend(userId: string) {
    clearError();
    void execute(async () => {
      const response = await suspendUser(userId);
      if (response.error) throw new Error(response.error);
      await refreshUsers();
      return true;
    });
  }

  return (
    <section>
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de usuarios conectada a RPC y catálogos de roles/departamentos."
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-1 size-4" /> Nuevo usuario
          </Button>
        }
      />

      {isBootstrapping && <p className="mb-3 text-sm text-muted-foreground">Cargando catálogos...</p>}
      {bootstrapError && <p className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Avatar</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="size-10 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xs">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "primary" : "neutral"}>
                  {user.roleName ?? user.role}
                </Badge>
              </TableCell>
              <TableCell>{user.departmentName ?? "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>
                    <Pencil className="mr-1 size-4" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleSuspend(user.id)}>
                    <Trash2 className="mr-1 size-4" /> Suspender
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal open={open} onClose={closeModal} title={editingUser ? "Editar usuario" : "Crear usuario"}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
            <button
              type="button"
              className="group relative"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar avatar"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="size-20 rounded-full object-cover ring-2 ring-border transition group-hover:ring-primary"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-muted text-lg font-semibold ring-2 ring-border transition group-hover:ring-primary">
                  {(form.name || "U").slice(0, 1).toUpperCase()}
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
              onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
            />

            <p className="text-xs text-muted-foreground">
              {avatarFile ? `Archivo seleccionado: ${avatarFile.name}` : "Sin cambios de imagen"}
            </p>

            {avatarFile && (
              <Button 
                type="button" 
                variant="ghost" 
                size="xs" 
                className="text-destructive hover:bg-destructive/10 hover:text-destructive" 
                onClick={() => setAvatarFile(null)}
              >
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
              required
            />
            {!editingUser && (
              <Input
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            )}
            <Select
              value={form.roleId}
              onChange={(event) => setForm((prev) => ({ ...prev, roleId: event.target.value }))}
              required
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <Select
              value={form.departmentId}
              onChange={(event) => setForm((prev) => ({ ...prev, departmentId: event.target.value }))}
              required
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
            {editingUser && (
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
