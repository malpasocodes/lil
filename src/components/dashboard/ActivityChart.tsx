import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/lib/db/dashboard-queries";

const chartConfig = {
  logins: {
    label: "Logins",
    color: "var(--color-chart-1)",
  },
  events: {
    label: "Learning Events",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
        <CardDescription>Daily logins and learning events over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fillLogins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(v) => formatDate(v as string)} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="logins"
              type="monotone"
              stroke="var(--color-chart-1)"
              fill="url(#fillLogins)"
              strokeWidth={2}
            />
            <Area
              dataKey="events"
              type="monotone"
              stroke="var(--color-chart-2)"
              fill="url(#fillEvents)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
