import { Building2, ClipboardList, History, MapPin } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Tile {
  href: string;
  title: string;
  description: string;
  icon: typeof Building2;
}

const TILES: Tile[] = [
  {
    href: "/bulk-operations/empresas",
    title: "Empresas",
    description: "Importar empresas desde una planilla Excel.",
    icon: Building2,
  },
  {
    href: "/bulk-operations/sucursales",
    title: "Sucursales",
    description: "Importar sucursales asignadas a empresas existentes.",
    icon: MapPin,
  },
  {
    href: "/bulk-operations/clientes",
    title: "Clientes",
    description: "Importar clientes vinculados a empresa y sucursal.",
    icon: ClipboardList,
  },
  {
    href: "/bulk-operations/historial",
    title: "Historial",
    description: "Ver el registro de cargas, errores y responsables.",
    icon: History,
  },
];

export function BulkOperationsHome() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Operaciones en bloque</h2>
        <p className="text-sm text-muted-foreground">
          Cargá registros masivamente desde una plantilla Excel. El historial documenta cada
          carga y sus resultados por fila.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <a
              key={tile.href}
              href={tile.href}
              className="group block focus:outline-none"
            >
              <Card className="h-full transition group-hover:ring-primary/40 group-focus-visible:ring-primary/60">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="mt-3">{tile.title}</CardTitle>
                  <CardDescription>{tile.description}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}
