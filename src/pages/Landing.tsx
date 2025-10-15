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
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    status: "soon",
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
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <span className="text-xl font-semibold">4D Analytics Inventory Management System</span>
              <span className="text-sm text-muted-foreground">Welcome back, <span className="font-medium text-foreground">{userName}</span></span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="container mx-auto px-6 py-12 max-w-6xl space-y-16">
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold">Field Operations</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Launch field-ready workflows for orders, counts, assets, and tracking from a single control centre.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {fieldOperationModules.map(({ icon: Icon, title, description, path, color, status, testId }, index) => (
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

          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold">Admin Workspace</h2>
                <p className="text-muted-foreground max-w-2xl">
                  Manage queues, fulfilment handovers, and technician records that keep operations aligned.
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
              {adminWorkspaceModules.map(({ icon: Icon, title, description, path, color, status }) => (
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
