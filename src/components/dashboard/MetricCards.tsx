import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, LogIn, CalendarDays, Activity, TrendingUp, TrendingDown } from "lucide-react";
import type { KpiMetrics } from "@/lib/db/dashboard-queries";

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">N/A</span>;
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isPositive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

const metrics = [
  {
    key: "totalLearners" as const,
    label: "Total Learners",
    icon: Users,
    trend: null,
  },
  {
    key: "loginsToday" as const,
    label: "Logins Today",
    icon: LogIn,
    trend: "loginsTodayChange" as const,
  },
  {
    key: "loginsThisWeek" as const,
    label: "Logins This Week",
    icon: CalendarDays,
    trend: "loginsWeekChange" as const,
  },
  {
    key: "totalEvents" as const,
    label: "Total Events",
    icon: Activity,
    trend: null,
  },
];

export default function MetricCards({ data }: { data: KpiMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(({ key, label, icon: Icon, trend }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data[key].toLocaleString()}</div>
            {trend && (
              <p className="mt-1">
                <TrendBadge value={data[trend]} />
                <span className="ml-1 text-xs text-muted-foreground">
                  vs previous period
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
