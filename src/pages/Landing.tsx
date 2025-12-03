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
  ArrowRight,
  PackagePlus,
  Database,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { RoleGate } from "@/components/ProtectedRoute";

type ModuleCard = {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  path: string;
  color: string;
  status?: "active" | "soon";
  testId?: string;
  requiredRoles?: UserRole[]; // Roles that can access this module (undefined = all authenticated)
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
    status: "active",
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
    status: "active",
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
    requiredRoles: ['admin', 'back_office'],
  },
  {
    title: "Dispatching Queue",
    description: "Transition picked orders into dispatch and record courier handover notes.",
    icon: Truck,
    path: "/dispatching",
    color: "from-fuchsia-500 to-pink-600",
    status: "active",
    testId: "card-dispatching",
    requiredRoles: ['admin', 'back_office'],
  },
  {
    title: "Analytics Dashboard",
    description: "Monitor KPIs, stock alerts, device health, and performance metrics in real-time.",
    icon: BarChart3,
    path: "/kpi",
    color: "from-emerald-500 to-teal-600",
    status: "active",
    testId: "card-analytics",
    requiredRoles: ['admin', 'back_office'],
  },
  {
    title: "Point of Presence",
    description: "Maintain your national technician roster, regions, and contact information.",
    icon: Map,
    path: "/point-of-presence",
    color: "from-violet-600 to-purple-600",
    status: "active",
    testId: "card-point-of-presence",
    requiredRoles: ['admin', 'back_office'],
  },
  {
    title: "Product Catalog",
    description: "Manage inventory items, categories, descriptions, and device images.",
    icon: Database,
    path: "/stock-admin",
    color: "from-amber-500 to-orange-600",
    status: "active",
    testId: "card-product-catalog",
    requiredRoles: ['admin', 'back_office'],
  },
  {
    title: "Stock Ingestion",
    description: "Register new devices into inventory with batch tracking and serial number validation.",
    icon: PackagePlus,
    path: "/stock-ingestion",
    color: "from-teal-500 to-cyan-600",
    status: "active",
    testId: "card-stock-ingestion",
    requiredRoles: ['admin', 'back_office'],
  },
  {
    title: "User Management",
    description: "Approve pending user signups, manage roles, and control access to the system.",
    icon: Users,
    path: "/admin/users",
    color: "from-red-500 to-pink-600",
    status: "active",
    testId: "card-user-management",
    requiredRoles: ['admin'], // Admin only
  },
];

const Landing = () => {
  const { profile, hasRole } = useAuth();
  const { data: pendingCount = 0 } = usePendingApprovals();
  const userName = profile?.full_name || profile?.email || "User";

  // Check if user has access to any admin workspace modules
  const hasAdminAccess = hasRole(['admin', 'back_office']);

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
              <span className="text-lg font-semibold">Xlink Technologies Pty Ltd Inventory Management System</span>
              <span className="text-xs text-muted-foreground">Welcome, <span className="font-medium text-foreground">{userName}</span></span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="container mx-auto px-4 py-4 max-w-7xl space-y-5">
          <section className="space-y-1.5">
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                Xlink Technologies Inventory Management
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
                    <CardContent className="p-4 relative">
                      <Badge
                        variant={status === "active" ? "default" : "outline"}
                        className="absolute top-4 right-4 uppercase text-[9px] px-1.5 py-0.5"
                      >
                        {status === "active" ? "Active" : "Coming Soon"}
                      </Badge>
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="space-y-2 mt-3">
                        <h3 className="text-sm font-semibold text-left flex items-center gap-1">
                          {title}
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                        </h3>
                        <p className="text-[10px] text-muted-foreground leading-relaxed text-left min-h-[2.5rem]">
                          {description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Admin Workspace - Only show if user has back_office or admin role */}
          {hasAdminAccess && (
            <section className="space-y-2.5">
              <div className="text-center">
                <h2 className="text-base font-semibold">Admin Workspace</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {adminWorkspaceModules.map(({ icon: Icon, title, description, path, color, status, requiredRoles }, index) => (
                  <RoleGate key={title} allowedRoles={requiredRoles || ['admin', 'back_office', 'user']}>
                    <Link to={path} className="group relative">
                      {title === "User Management" && pendingCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 z-10 bg-red-600 hover:bg-red-700 rounded-full h-6 w-6 flex items-center justify-center p-0 text-xs font-bold">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </Badge>
                      )}
                      <Card
                        className="h-full border-border/50 bg-card/80 backdrop-blur hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <CardContent className="p-4 relative">
                          <Badge
                            variant={status === "active" ? "default" : "outline"}
                            className="absolute top-4 right-4 uppercase text-[9px] px-1.5 py-0.5"
                          >
                            {status === "active" ? "Active" : "Coming Soon"}
                          </Badge>
                          <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="space-y-2 mt-3">
                            <h3 className="text-sm font-semibold text-left flex items-center gap-1">
                              {title}
                              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </h3>
                            <p className="text-[10px] text-muted-foreground leading-relaxed text-left min-h-[2.5rem]">
                              {description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </RoleGate>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default Landing;
