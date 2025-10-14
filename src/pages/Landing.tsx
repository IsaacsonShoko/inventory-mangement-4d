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
      description: "Facilitates the creation, tracking, and management of stock orders. Create orders for technicians, regional warehouses, or non-technician deliveries with full recipient management and automated order tracking.",
      gradient: "from-purple-500 to-purple-600",
      available: true
    },
    { 
      title: "Asset Management", 
      icon: Package, 
      path: "/asset-management",
      description: "Comprehensive asset tracking and management system. Monitor all inventory items, track serial numbers, manage stock levels across locations, and maintain complete asset lifecycle records.",
      gradient: "from-violet-500 to-violet-600",
      available: false
    },
    { 
      title: "Stock Counts", 
      icon: ClipboardList, 
      path: "/stock-counts",
      description: "Mobile camera-triggered scanner for scanning serial numbers during stock counting. This improves accuracy and reduces manual errors, ensuring precise inventory reconciliation and audit trails.",
      gradient: "from-fuchsia-500 to-fuchsia-600",
      available: false
    },
    { 
      title: "Stock Counts Report", 
      icon: FileText, 
      path: "/stock-counts-report",
      description: "Comprehensive analytics and reporting on all stock count activities. View historical count data, identify discrepancies, track count completion rates, and generate detailed audit reports.",
      gradient: "from-purple-600 to-indigo-600",
      available: false
    },
    { 
      title: "Exceptions Report", 
      icon: AlertTriangle, 
      path: "/exceptions-report",
      description: "Monitor and track inventory anomalies and exceptions in real-time. Identify missing items, duplicate entries, unauthorized movements, and other irregularities requiring immediate attention.",
      gradient: "from-pink-500 to-rose-600",
      available: false
    },
    { 
      title: "Tracking", 
      icon: MapPin, 
      path: "/tracking",
      description: "Real-time shipment and order tracking capabilities. Monitor delivery status, view current locations, track estimated delivery times, and maintain complete shipment history for all orders.",
      gradient: "from-indigo-500 to-blue-600",
      available: false
    },
    { 
      title: "Point of Presence", 
      icon: Map, 
      path: "/point-of-presence",
      description: "Central registry for field technicians capturing geographical locations, contact details, and location codes for effective workforce management. Ensures field staff are dispatched to appropriate locations with complete technician profiles.",
      gradient: "from-violet-600 to-purple-600",
      available: false
    },
    { 
      title: "Stock Alerts", 
      icon: Bell, 
      path: "/stock-alerts",
      description: "Smart inventory notification system that monitors stock levels and triggers alerts for low inventory, reorder points, expiring items, and critical stock movements to prevent stockouts.",
      gradient: "from-purple-500 to-pink-600",
      available: false
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* App Purpose Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary py-16 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
              Xlink Inventory Management System
            </h1>
            
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
              <CardContent className="p-8 space-y-4 text-left">
                <h2 className="text-2xl font-bold text-white mb-4">
                  App Purpose
                </h2>
                <p className="text-white/90 text-lg leading-relaxed">
                  This app is designed to streamline and optimize inventory and field technician 
                  management processes. It integrates functionalities for Stock Orders, Stock Counts, and 
                  Point of Presence (PoP) registry, enabling businesses to manage both inventory and field 
                  operations efficiently.
                </p>
                <p className="text-white/90 text-lg leading-relaxed">
                  By integrating real-time data capture with powerful tracking and management features, 
                  this app minimizes errors and enhances operational efficiency across stock and technician 
                  management processes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Modules Grid Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((module, idx) => {
              const Icon = module.icon;
              return (
                <Link 
                  key={module.path} 
                  to={module.path}
                  className="group"
                >
                  <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 bg-card/50 backdrop-blur-sm animate-fade-in overflow-hidden"
                    style={{ animationDelay: `${idx * 75}ms` }}
                  >
                    <div className={`h-2 bg-gradient-to-r ${module.gradient} group-hover:h-3 transition-all duration-300`}></div>
                    <CardContent className="p-6 space-y-4 flex flex-col h-full">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="h-8 w-8 text-white" strokeWidth={2.5} />
                      </div>
                      
                      <div className="flex-grow space-y-3">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {module.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {module.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        {module.available ? (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
