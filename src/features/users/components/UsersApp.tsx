import { AppProviders } from "@/components/providers/AppProviders";

import { UsersPage } from "@/features/users/components/UsersPage";

export function UsersApp() {
  return (
    <AppProviders>
      <UsersPage />
    </AppProviders>
  );
}
