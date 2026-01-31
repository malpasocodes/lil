import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, LogIn, CalendarDays, Activity } from "lucide-react";
import type { AppBreakdown } from "@/lib/db/dashboard-queries";

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}

export default function AppBreakdownCards({
  data,
}: {
  data: AppBreakdown[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-8 text-center">
        No registered apps yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((app) => (
        <Card key={app.appId}>
          <CardHeader>
            <CardTitle>{app.appName}</CardTitle>
            {app.description && (
              <CardDescription>{app.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            <StatRow icon={Users} label="Learners" value={app.totalLearners} />
            <StatRow icon={LogIn} label="Logins Today" value={app.loginsToday} />
            <StatRow
              icon={CalendarDays}
              label="Logins This Week"
              value={app.loginsThisWeek}
            />
            <StatRow icon={Activity} label="Total Events" value={app.totalEvents} />
            {Object.keys(app.eventTypes).length > 0 && (
              <div className="border-t pt-3 mt-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Event Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(app.eventTypes).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="gap-1">
                      {type}
                      <span className="bg-foreground/10 rounded px-1 text-[10px]">
                        {count}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
