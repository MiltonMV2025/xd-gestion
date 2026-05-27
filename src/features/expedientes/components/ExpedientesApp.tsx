import { AppProviders } from "@/components/providers/AppProviders";

import { ExpedientesPage } from "@/features/expedientes/components/ExpedientesPage";

export function ExpedientesApp() {
  return (
    <AppProviders>
      <ExpedientesPage />
    </AppProviders>
  );
}
