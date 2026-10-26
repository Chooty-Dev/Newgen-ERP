import { getActiveShopsAction } from "@/actions/shops";
import { SummaryReportsView } from "@/components/shared/summary-reports-view";

export default async function AdminSummaryPage() {
  const shopsRes = await getActiveShopsAction();
  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="text-base text-muted-foreground">
          Financial Analytics & Summary
        </p>
      </div>

      <SummaryReportsView initialShops={shops} userRole="ADMIN" />
    </div>
  );
}
