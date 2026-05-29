import { AppProviders } from "@/components/providers/AppProviders";

import { BulkUploadJobDetail } from "@/features/bulk-operations/components/BulkUploadJobDetail";

export function BulkUploadJobDetailApp({ jobId }: { jobId: string }) {
  return (
    <AppProviders>
      <BulkUploadJobDetail jobId={jobId} />
    </AppProviders>
  );
}
