import { useState } from "react";
import { LayoutDashboard, AppWindow, BookOpen, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MetricCards from "./MetricCards";
import ActivityChart from "./ActivityChart";
import ActiveLearnersTable from "./ActiveLearnersTable";
import AppBreakdownCards from "./AppBreakdownCards";
import type { KpiMetrics, TimeSeriesPoint, ActiveLearner, AppBreakdown } from "@/lib/db/dashboard-queries";

type View = "overview" | "learners" | "apps";

const navItems: { key: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "learners", label: "Learners", icon: BookOpen },
  { key: "apps", label: "Apps", icon: AppWindow },
];

type Props = {
  kpiMetrics: KpiMetrics;
  timeSeries: TimeSeriesPoint[];
  activeLearners: ActiveLearner[];
  appBreakdowns: AppBreakdown[];
};

export default function DashboardShell({
  kpiMetrics,
  timeSeries,
  activeLearners,
  appBreakdowns,
}: Props) {
  const [view, setView] = useState<View>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-56" : "w-0 overflow-hidden"
        } shrink-0 border-r bg-sidebar text-sidebar-foreground transition-all duration-200`}
      >
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <LayoutDashboard className="h-5 w-5" />
          <span>LIL Dashboard</span>
        </div>
        <Separator />
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                view === key
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <a
            href="/"
            className="text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            &larr; Back to API docs
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="flex h-14 items-center gap-2 border-b px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {navItems.find((n) => n.key === view)?.label}
          </h1>
        </header>

        <div className="p-6 space-y-6">
          {view === "overview" && (
            <>
              <MetricCards data={kpiMetrics} />
              <ActivityChart data={timeSeries} />
              <ActiveLearnersTable data={activeLearners} />
            </>
          )}

          {view === "learners" && <ActiveLearnersTable data={activeLearners} />}

          {view === "apps" && <AppBreakdownCards data={appBreakdowns} />}
        </div>
      </main>
    </div>
  );
}
