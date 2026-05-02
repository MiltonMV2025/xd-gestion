import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card className="border border-border/60 bg-card/70 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
