import { AppProviders } from "@/components/providers/AppProviders";

import { BulkUploadLog } from "@/features/bulk-operations/components/BulkUploadLog";

export function BulkUploadLogApp() {
  return (
    <AppProviders>
      <BulkUploadLog />
    </AppProviders>
  );
}
