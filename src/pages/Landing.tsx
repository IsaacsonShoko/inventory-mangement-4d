import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Truck,
  FileBarChart,
  ShoppingCart,
  ClipboardList,
  MapPin,
  Map,
  Bell,
  Boxes,
  Compass,
  Users,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ModuleCard = {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  path: string;
  color: string;
  status?: "active" | "soon";
  testId?: string;
};

const primaryModules: ModuleCard[] = [
  {
    title: "Picking",
    description:
      "Direct warehouse staff into the correct business line queue, monitor pick progress, and surface outstanding orders in real time.",
    icon: Package,
    path: "/picking",
    color: "from-violet-500 to-purple-600",
    status: "active",
    testId: "card-picking",
  },
  {
    title: "Dispatching",
    description:
      "Transition picked orders into dispatch, record waybills, and keep courier assignments aligned with Airtable workflows.",
    icon: Truck,
    path: "/dispatching",
    color: "from-purple-500 to-fuchsia-600",
    status: "active",
    testId: "card-dispatching",
  },
  {
    title: "Exceptions Report",
    description:
      "Review mismatches from the Power BI exceptions feed to reconcile warehouse inventory with NAV in moments.",
    icon: FileBarChart,
    path: "/exceptions-report",
    color: "from-fuchsia-500 to-pink-600",
    status: "active",
    testId: "card-exceptions",
  },
];

const supportingModules: ModuleCard[] = [
  {
    title: "Stock Ordering",
    description: "Create, track, and manage technician and warehouse orders with automated fulfilment tasks.",
    icon: ShoppingCart,
    path: "/stock-order",
    color: "from-purple-500 to-purple-600",
    status: "active",
  },
  {
    title: "Stock Counts",
    description: "Capture cycle counts via mobile scanning with built-in audit trails and approvals.",
    icon: ClipboardList,
    path: "/stock-counts",
    color: "from-fuchsia-500 to-fuchsia-600",
    status: "soon",
  },
  {
    title: "Asset Management",
    description: "Track serialized hardware across lifecycles, repairs, and redeployments.",
    icon: Boxes,
    path: "/asset-management",
    color: "from-sky-500 to-blue-600",
    status: "soon",
  },
  {
    title: "Tracking",
    description: "Monitor shipments, delivery milestones, and proof-of-delivery metadata in one place.",
    icon: MapPin,
    path: "/tracking",
    color: "from-indigo-500 to-blue-600",
    status: "soon",
  },
  {
    title: "Point of Presence",
    description: "Maintain your national technician roster, regions, and contact information.",
    icon: Map,
    path: "/point-of-presence",
    color: "from-violet-600 to-purple-600",
    status: "soon",
  },
  {
    title: "Stock Alerts",
    description: "Receive automation-driven alerts when reorder points or critical stock rules fire.",
    icon: Bell,
    path: "/stock-alerts",
    color: "from-purple-500 to-pink-600",
    status: "soon",
  },
  {
    title: "Workforce Insights",
    description: "Blend workforce analytics with inventory movements to optimise deployment.",
    icon: Users,
    path: "/coming-soon",
    color: "from-amber-500 to-orange-500",
    status: "soon",
  },
  {
    title: "Field Operations",
    description: "Coordinate onsite installations, relocations, and recovery jobs.",
    icon: Compass,
    path: "/coming-soon",
    color: "from-emerald-500 to-teal-600",
    status: "soon",
  },
];

const Landing = () => {
  const userName = "Isaacson Shoko";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl orb-animate orb-4s" />
  <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-secondary/10 blur-3xl orb-animate orb-5s orb-delay-1s" />
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-3xl orb-animate orb-6s orb-delay-2s" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-border/40 bg-background/60 backdrop-blur">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">4D Analytics Inventory Management System</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{userName}</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-12 max-w-6xl space-y-16">
          <section className="text-center space-y-6 animate-in fade-in duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <span className="text-sm font-medium text-primary">Unified warehouse command centre</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Streamline Picking, Dispatch, and Exceptions in one flow
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Blend PowerApps workflows with a modern React experience, backed by Airtable and n8n automations. Launch fulfilment workstreams in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/stock-order">
                <Button size="lg" className="gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Create Stock Order
                </Button>
              </Link>
              <Link to="/picking">
                <Button size="lg" variant="outline" className="gap-2">
                  <Package className="h-5 w-5" />
                  View Picking Queue
                </Button>
              </Link>
            </div>
          </section>

          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-semibold">Fulfilment Modules</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These workflows mirror the PowerApps picking and dispatch journeys, now backed by the same Airtable schema.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {primaryModules.map(({ icon: Icon, title, description, path, color, status, testId }, index) => (
                <Link key={title} to={path} data-testid={testId}>
                  <Card
                    className="group h-full border-primary/20 bg-primary/5 backdrop-blur hover:scale-[1.02] transition-all duration-300"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <CardHeader>
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {title}
                        <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="px-3 py-1">
                        {status === "active" ? "Active" : "Coming soon"}
                      </Badge>
                      <span>Powered by Airtable queues</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold">Operations Workspace</h2>
                <p className="text-muted-foreground max-w-2xl">
                  Access the supporting modules that keep inventory, technicians, and alerts aligned with the fulfilment journey.
                </p>
              </div>
              <Link to="/exceptions-report">
                <Button variant="ghost" className="gap-2">
                  <FileBarChart className="h-5 w-5" />
                  Open Exceptions Dashboard
                </Button>
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {supportingModules.map(({ icon: Icon, title, description, path, color, status }) => (
                <Link key={title} to={path} className="group">
                  <Card className="h-full border border-border/40 bg-card/80 backdrop-blur hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-5 space-y-4">
                      <div className={`w-12 h-12 rounded-md bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {title}
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {description}
                        </p>
                      </div>
                      <Badge variant={status === "active" ? "default" : "outline"} className="uppercase tracking-wide text-[11px]">
                        {status === "active" ? "Active" : "Coming Soon"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Landing;
