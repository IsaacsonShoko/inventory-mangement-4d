import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Truck,
  BarChart3,
  ShoppingCart,
  ClipboardList,
  MapPin,
  Map,
  Boxes,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";

type ModuleCard = {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  path: string;
  color: string;
  status?: "active" | "soon";
  testId?: string;
};

const fieldOperationModules: ModuleCard[] = [
  {
    title: "Stock Order",
    description: "Create, track, and manage technician and warehouse orders with automated fulfilment tasks.",
    icon: ShoppingCart,
    path: "/stock-order",
    color: "from-violet-500 to-purple-600",
    status: "active",
    testId: "card-stock-order",
  },
  {
    title: "Stock Counts",
    description: "Capture cycle counts via mobile scanning with built-in audit trails and approvals.",
    icon: ClipboardList,
    path: "/stock-counts",
    color: "from-purple-500 to-fuchsia-600",
    status: "soon",
    testId: "card-stock-counts",
  },
  {
    title: "Asset Management",
    description: "Track serialized hardware across lifecycles, repairs, and redeployments.",
    icon: Boxes,
    path: "/asset-management",
    color: "from-sky-500 to-blue-600",
    status: "active",
    testId: "card-asset-management",
  },
  {
    title: "Tracking",
    description: "Monitor shipments, delivery milestones, and proof-of-delivery metadata in one place.",
    icon: MapPin,
    path: "/tracking",
    color: "from-indigo-500 to-blue-600",
    status: "soon",
    testId: "card-tracking",
  },
];

const adminWorkspaceModules: ModuleCard[] = [
  {
    title: "Picking Queue",
    description: "Direct warehouse staff into the correct business line queue and monitor pick progress.",
    icon: Package,
    path: "/picking",
    color: "from-purple-500 to-purple-600",
    status: "active",
    testId: "card-picking",
  },
  {
    title: "Dispatching Queue",
    description: "Transition picked orders into dispatch and record courier handover notes.",
    icon: Truck,
    path: "/dispatching",
    color: "from-fuchsia-500 to-pink-600",
    status: "active",
    testId: "card-dispatching",
  },
  {
    title: "Analytics Dashboard",
    description: "Monitor KPIs, stock alerts, device health, and performance metrics in real-time.",
    icon: BarChart3,
    path: "/kpi-dashboard",
    color: "from-emerald-500 to-teal-600",
    status: "active",
    testId: "card-analytics",
  },
  {
    title: "Point of Presence",
    description: "Maintain your national technician roster, regions, and contact information.",
    icon: Map,
    path: "/point-of-presence",
    color: "from-violet-600 to-purple-600",
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
          <div className="container mx-auto px-4 py-2.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <span className="text-lg font-semibold">4D Analytics Inventory Management System</span>
              <span className="text-xs text-muted-foreground">Welcome back, <span className="font-medium text-foreground">{userName}</span></span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="container mx-auto px-4 py-4 max-w-7xl space-y-5">
          <section className="space-y-1.5">
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                4D Analytics Inventory Management
              </h1>
              <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
                Streamline operations with automated workflows and real-time inventory control.
              </p>
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="text-center">
              <h2 className="text-base font-semibold">Field Operations</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {fieldOperationModules.map(({ icon: Icon, title, description, path, color, status, testId }, index) => (
                <Link key={title} to={path} data-testid={testId}>
                  <Card
                    className="group h-full border-border/50 bg-card/80 backdrop-blur hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          {title}
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                        </h3>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          {description}
                        </p>
                      </div>
                      <Badge variant={status === "active" ? "default" : "outline"} className="uppercase text-[9px] px-1.5 py-0.5">
                        {status === "active" ? "Active" : "Coming Soon"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="text-center">
              <h2 className="text-base font-semibold">Admin Workspace</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {adminWorkspaceModules.map(({ icon: Icon, title, description, path, color, status }, index) => (
                <Link key={title} to={path} className="group">
                  <Card 
                    className="h-full border-border/50 bg-card/80 backdrop-blur hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold flex items-center gap-1">
                          {title}
                          <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </h3>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          {description}
                        </p>
                      </div>
                      <Badge variant={status === "active" ? "default" : "outline"} className="uppercase text-[9px] px-1.5 py-0.5">
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
