import { Link } from "react-router-dom";
import { 
  ShoppingCart, 
  Package, 
  ClipboardList, 
  FileText, 
  AlertTriangle, 
  MapPin, 
  Map, 
  Bell,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Landing = () => {
  const modules = [
    { 
      title: "Stock Ordering", 
      icon: ShoppingCart, 
      path: "/stock-order",
      description: "Create, track, and manage orders for technicians and warehouses with automated tracking.",
      gradient: "from-purple-500 to-purple-600",
      available: true
    },
    { 
      title: "Asset Management", 
      icon: Package, 
      path: "/asset-management",
      description: "Monitor inventory, track serial numbers, and maintain complete asset lifecycle records.",
      gradient: "from-violet-500 to-violet-600",
      available: false
    },
    { 
      title: "Stock Counts", 
      icon: ClipboardList, 
      path: "/stock-counts",
      description: "Mobile camera scanner for accurate stock counting with audit trail generation.",
      gradient: "from-fuchsia-500 to-fuchsia-600",
      available: false
    },
    { 
      title: "Reports", 
      icon: FileText, 
      path: "/stock-counts-report",
      description: "Analytics and reporting on stock activities with historical data and discrepancy tracking.",
      gradient: "from-purple-600 to-indigo-600",
      available: false
    },
    { 
      title: "Exceptions", 
      icon: AlertTriangle, 
      path: "/exceptions-report",
      description: "Real-time monitoring of inventory anomalies and unauthorized movements.",
      gradient: "from-pink-500 to-rose-600",
      available: false
    },
    { 
      title: "Tracking", 
      icon: MapPin, 
      path: "/tracking",
      description: "Real-time shipment tracking with delivery status and complete history.",
      gradient: "from-indigo-500 to-blue-600",
      available: false
    },
    { 
      title: "Point of Presence", 
      icon: Map, 
      path: "/point-of-presence",
      description: "Technician registry with locations, contact details for workforce management.",
      gradient: "from-violet-600 to-purple-600",
      available: false
    },
    { 
      title: "Stock Alerts", 
      icon: Bell, 
      path: "/stock-alerts",
      description: "Smart notifications for low inventory, reorder points, and critical movements.",
      gradient: "from-purple-500 to-pink-600",
      available: false
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-56 sm:w-96 h-56 sm:h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow animate-delay-2"></div>
        <div className="absolute top-1/2 left-1/2 w-40 sm:w-64 h-40 sm:h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow animate-delay-4"></div>
      </div>

      {/* Compact Hero Section - Mobile Optimized */}
      <section className="relative z-10 py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 sm:space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-2 sm:mb-4 animate-scale-in">
              <span className="text-xs sm:text-sm font-medium text-primary">4D Analytics Inventory Management</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight px-2">
              Streamline Operations
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Optimize inventory & field technician management with integrated Stock Orders, Stock Counts, and PoP registry — all in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* Compact Modules Grid - Mobile Optimized */}
      <section className="relative z-10 py-8 sm:py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((module, idx) => {
              const Icon = module.icon;
              return (
                <Link 
                  key={module.path} 
                  to={module.path}
                  className="group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <Card className="h-full border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-glow hover:-translate-y-1 sm:hover:-translate-y-2 bg-card/80 backdrop-blur-md animate-slide-up relative overflow-hidden">
                    {/* Animated gradient border on hover */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${module.gradient} p-[2px] -z-10`}>
                      <div className="h-full w-full bg-card rounded-lg"></div>
                    </div>
                    
                    <CardContent className="p-4 sm:p-5 space-y-3 flex flex-col h-full">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={2.5} />
                      </div>
                      
                      <div className="flex-grow space-y-2">
                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                          {module.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {module.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        {module.available ? (
                          <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2 sm:px-2.5 py-1 rounded-full border border-green-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground/70 bg-muted/30 px-2 sm:px-2.5 py-1 rounded-full">
                            Soon
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subtle footer spacing */}
      <div className="h-12 sm:h-16"></div>
    </div>
  );
};

export default Landing;
