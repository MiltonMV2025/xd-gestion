import { AppProviders } from "@/components/providers/AppProviders";

import { BulkOperationsHome } from "@/features/bulk-operations/components/BulkOperationsHome";

export function BulkOperationsHomeApp() {
  return (
    <AppProviders>
      <BulkOperationsHome />
    </AppProviders>
  );
}
