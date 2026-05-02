import type {
  Client,
  CompanyItem,
  DashboardMetrics,
  Order,
  ProductionOrder,
  Quote,
  UserItem,
} from "@/types/domain";

export const metricsSeed: DashboardMetrics = {
  pendingQuotes: 8,
  ordersInProgress: 5,
  finishedJobs: 19,
};

export const clientsSeed: Client[] = [
  {
    id: "c-1",
    name: "María López",
    phone: "+503 7000-1111",
    email: "maria@metalurgica.com",
    address: "San Salvador, Zona Industrial",
    companyId: "co-1",
    position: "Compras",
    photoUrl: "",
    companyName: "Metalúrgica Centro",
    createdAt: "2026-04-18",
  },
  {
    id: "c-2",
    name: "Carlos Rivas",
    phone: "+503 7000-2222",
    email: "carlos@rivas.com",
    address: "Santa Tecla, Calle El Progreso",
    companyId: "co-2",
    position: "Operaciones",
    photoUrl: "",
    companyName: "Empaques Rivas",
    createdAt: "2026-04-20",
  },
];

export const companiesSeed: CompanyItem[] = [
  {
    id: "co-1",
    name: "Metalúrgica Centro",
    phone: "",
    email: "",
    address: "",
    logoUrl: "",
    createdAt: "2026-04-10",
  },
  {
    id: "co-2",
    name: "Empaques Rivas",
    phone: "",
    email: "",
    address: "",
    logoUrl: "",
    createdAt: "2026-04-12",
  },
];

export const quotesSeed: Quote[] = [
  {
    id: "q-1",
    clientId: "c-1",
    description: "Fabricación de 200 cajas",
    total: 1820,
    status: "pending",
    createdAt: "2026-04-21",
  },
  {
    id: "q-2",
    clientId: "c-2",
    description: "Impresión etiquetas premium",
    total: 960,
    status: "approved",
    createdAt: "2026-04-23",
  },
];

export const productionOrdersSeed: ProductionOrder[] = [
  {
    id: "po-1",
    quoteId: "q-2",
    clientName: "Empaques Rivas",
    status: "in_progress",
    estimatedDelivery: "2026-05-04",
  },
];

export const ordersSeed: Order[] = [
  {
    id: "o-1",
    clientName: "Empaques Rivas",
    status: "in_progress",
    updatedAt: "2026-05-01",
  },
  {
    id: "o-2",
    clientName: "Metalúrgica Centro",
    status: "finished",
    updatedAt: "2026-04-30",
  },
];

export const usersSeed: UserItem[] = [
  {
    id: "u-1",
    name: "Admin Principal",
    email: "admin@xdgestion.com",
    roleId: "r-1",
    departmentId: "d-1",
    avatarUrl: "",
    role: "admin",
    roleName: "admin",
    departmentName: "Dirección",
  },
  {
    id: "u-2",
    name: "Operador 1",
    email: "operador@xdgestion.com",
    roleId: "r-2",
    departmentId: "d-2",
    avatarUrl: "",
    role: "employee",
    roleName: "employee",
    departmentName: "Producción",
  },
];
