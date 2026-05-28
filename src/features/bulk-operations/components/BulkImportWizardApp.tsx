import { AppProviders } from "@/components/providers/AppProviders";

import { BulkImportWizard } from "@/features/bulk-operations/components/BulkImportWizard";
import type { TemplateEntity } from "@/features/bulk-operations/lib/templateSchemas";

export function BulkImportWizardApp({ entity }: { entity: TemplateEntity }) {
  return (
    <AppProviders>
      <BulkImportWizard entity={entity} />
    </AppProviders>
  );
}
