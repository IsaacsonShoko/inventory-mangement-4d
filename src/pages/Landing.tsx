import { Link } from "react-router-dom";
import { 
  ShoppingCart, 
  Package, 
  ClipboardList, 
  FileText, 
  AlertTriangle, 
  MapPin, 
  Map, 
  Bell 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Landing = () => {
  const modules = [
    { 
      title: "Stock Ordering", 
      icon: ShoppingCart, 
      path: "/stock-order",
      description: "Create and manage stock orders"
    },
    { 
      title: "Asset Stock Management", 
      icon: Package, 
      path: "/asset-management",
      description: "Track and manage assets"
    },
    { 
      title: "Stock Counts", 
      icon: ClipboardList, 
      path: "/stock-counts",
      description: "Conduct inventory counts"
    },
    { 
      title: "Stock Counts Report", 
      icon: FileText, 
      path: "/stock-counts-report",
      description: "View count reports"
    },
    { 
      title: "Exceptions Report", 
      icon: AlertTriangle, 
      path: "/exceptions-report",
      description: "Track exceptions"
    },
    { 
      title: "Tracking", 
      icon: MapPin, 
      path: "/tracking",
      description: "Track shipments"
    },
    { 
      title: "Point of Presence", 
      icon: Map, 
      path: "/point-of-presence",
      description: "Manage locations"
    },
    { 
      title: "Stock Alerts", 
      icon: Bell, 
      path: "/stock-alerts",
      description: "Monitor stock levels"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">
            Xlink Inventory Management System
          </h1>
          <div className="mx-auto max-w-3xl">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <h2 className="mb-3 text-xl font-semibold text-white">
                  App Purpose Description
                </h2>
                <p className="mb-4 text-white/90">
                  This app is designed to streamline and optimize inventory and field technician 
                  management processes. It integrates functionalities for Stock Orders, Stock Counts, and 
                  Point of Presence (PoP) registry, enabling business to manage both inventory and field 
                  operations efficiently.
                </p>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Key functionalities include:
                </h3>
                <ul className="space-y-2 text-left text-white/90">
                  <li>
                    <strong>Stock Orders:</strong> Facilitates the creation, tracking, and management of stock orders.
                  </li>
                  <li>
                    <strong>Stock Counts:</strong> The app includes a mobile camera-triggered scanner for scanning serial 
                    numbers, improving accuracy and reducing manual errors during stock counting.
                  </li>
                  <li>
                    <strong>Point of Presence Management:</strong> Acts as a central registry for field technicians, 
                    capturing their geographical location, contact details, and location codes for effective 
                    BIM Management. This feature ensures field staff are courier to the appropriate locations.
                  </li>
                </ul>
                <p className="mt-4 text-white/90">
                  By integrating real-time data capture with powerful tracking and management features, 
                  this app minimizes errors and enhances operational efficiency across stock and technician 
                  management processes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} to={module.path}>
                <Card className="group h-full transition-all hover:scale-105 bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="mb-4 rounded-lg bg-white/20 p-4 group-hover:bg-white/30 transition-colors">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      {module.title}
                    </h3>
                    <p className="text-sm text-white/80">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Landing;
