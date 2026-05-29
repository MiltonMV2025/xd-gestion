import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { bulkCreateUsers } from "@/services/bulkOperationsService";
import type {
  BulkOperationOutcome,
  BulkUserRow,
  DepartmentItem,
  RoleItem,
} from "@/types/domain";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  roles: RoleItem[];
  departments: DepartmentItem[];
}

interface DraftRow {
  name: string;
  email: string;
  roleId: string;
  departmentId: string;
}

function emptyRow(): DraftRow {
  return { name: "", email: "", roleId: "", departmentId: "" };
}

export function BulkUsersModal({ open, onClose, onSuccess, roles, departments }: Props) {
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [phase, setPhase] = useState<"edit" | "submitting" | "result">("edit");
  const [outcome, setOutcome] = useState<BulkOperationOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (password.length < 4) return false;
    if (rows.length === 0) return false;
    return rows.every(
      (r) =>
        r.name.trim() !== "" &&
        r.email.trim() !== "" &&
        r.roleId !== "" &&
        r.departmentId !== "",
    );
  }, [password, rows]);

  function resetState() {
    setPassword("");
    setRows([emptyRow()]);
    setPhase("edit");
    setOutcome(null);
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit() {
    if (!session) {
      setError("La sesión expiró. Iniciá sesión nuevamente.");
      return;
    }
    setError(null);
    setPhase("submitting");

    const payload: BulkUserRow[] = rows.map((r) => ({
      name: r.name.trim(),
      email: r.email.trim().toLowerCase(),
      password,
      role_id: r.roleId,
      department_id: r.departmentId,
    }));

    const result = await bulkCreateUsers({
      rows: payload,
      actorId: session.user.id,
      fileName: "Carga desde modal",
    });

    if (result.error || !result.data) {
      setError(result.error ?? "Error inesperado al procesar la carga.");
      setPhase("edit");
      return;
    }

    setOutcome(result.data);
    setPhase("result");
    if (result.data.successCount > 0) onSuccess?.();
  }

  return (
    <Modal
      title={phase === "result" ? "Resultado de la carga" : "Crear usuarios en bloque"}
      open={open}
      onClose={handleClose}
      size="lg"
    >
      {phase !== "result" ? (
        <EditView
          password={password}
          onPasswordChange={setPassword}
          rows={rows}
          updateRow={updateRow}
          addRow={addRow}
          removeRow={removeRow}
          roles={roles}
          departments={departments}
          canSubmit={canSubmit && phase === "edit"}
          submitting={phase === "submitting"}
          error={error}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      ) : (
        <ResultView outcome={outcome!} rows={rows} onClose={handleClose} />
      )}
    </Modal>
  );
}

// ---------------- subcomponents ----------------

function EditView({
  password,
  onPasswordChange,
  rows,
  updateRow,
  addRow,
  removeRow,
  roles,
  departments,
  canSubmit,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  password: string;
  onPasswordChange: (value: string) => void;
  rows: DraftRow[];
  updateRow: (index: number, patch: Partial<DraftRow>) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  roles: RoleItem[];
  departments: DepartmentItem[];
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Completá una fila por usuario. Todos comparten la misma contraseña inicial — distribuila por tu
        canal habitual y pediles que la cambien en su próximo ingreso.
      </p>

      <div className="space-y-1">
        <label htmlFor="bulk-users-password" className="text-sm font-medium">
          Contraseña inicial
        </label>
        <Input
          id="bulk-users-password"
          type="text"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Mínimo 4 caracteres"
          autoComplete="off"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="w-10 px-2 py-1.5 font-medium text-muted-foreground">#</th>
              <th className="px-2 py-1.5 font-medium text-muted-foreground">Nombre</th>
              <th className="px-2 py-1.5 font-medium text-muted-foreground">Email</th>
              <th className="px-2 py-1.5 font-medium text-muted-foreground">Rol</th>
              <th className="px-2 py-1.5 font-medium text-muted-foreground">Departamento</th>
              <th className="w-10 px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                <td className="px-2 py-1.5 text-xs text-muted-foreground">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(index, { email: e.target.value })}
                    placeholder="juan@empresa.com"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={row.roleId}
                    onChange={(e) => updateRow(index, { roleId: e.target.value })}
                  >
                    <option value="">Seleccionar…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={row.departmentId}
                    onChange={(e) => updateRow(index, { departmentId: e.target.value })}
                  >
                    <option value="">Seleccionar…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1 || submitting}
                    aria-label={`Quitar fila ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={addRow} disabled={submitting}>
        <Plus className="size-4" /> Agregar fila
      </Button>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Procesando…
            </>
          ) : (
            <>Crear {rows.length} usuario{rows.length === 1 ? "" : "s"}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ResultView({
  outcome,
  rows,
  onClose,
}: {
  outcome: BulkOperationOutcome;
  rows: DraftRow[];
  onClose: () => void;
}) {
  const failures = outcome.results.filter((r) => r.status === "error");
  const allOk = outcome.failureCount === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {allOk ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
        <span>
          {outcome.totalRows} usuario{outcome.totalRows === 1 ? "" : "s"} procesado{outcome.totalRows === 1 ? "" : "s"} —{" "}
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            {outcome.successCount} creado{outcome.successCount === 1 ? "" : "s"}
          </span>
          {outcome.failureCount > 0 && (
            <>
              {" · "}
              <span className="font-medium text-destructive">
                {outcome.failureCount} con error
              </span>
            </>
          )}
        </span>
      </div>

      {failures.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-muted/60 text-left">
              <tr>
                <th className="px-2 py-1.5 font-medium text-muted-foreground">#</th>
                <th className="px-2 py-1.5 font-medium text-muted-foreground">Email</th>
                <th className="px-2 py-1.5 font-medium text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((r) => (
                <tr key={r.rowIndex} className="border-t border-border">
                  <td className="px-2 py-1.5 text-muted-foreground">{r.rowIndex + 1}</td>
                  <td className="px-2 py-1.5 font-mono text-[11px]">
                    {rows[r.rowIndex]?.email ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-destructive">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button asChild variant="ghost">
          <a href={`/bulk-operations/historial/${outcome.jobId}`}>Ver en historial</a>
        </Button>
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}
