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
  ArrowRight,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const modules = [
    { 
      title: "Stock Ordering", 
      icon: ShoppingCart, 
      path: "/stock-order",
      description: "Create and manage orders seamlessly",
      gradient: "from-purple-500 to-purple-600",
      available: true
    },
    { 
      title: "Asset Management", 
      icon: Package, 
      path: "/asset-management",
      description: "Track assets in real-time",
      gradient: "from-violet-500 to-violet-600",
      available: false
    },
    { 
      title: "Stock Counts", 
      icon: ClipboardList, 
      path: "/stock-counts",
      description: "Accurate inventory counting",
      gradient: "from-fuchsia-500 to-fuchsia-600",
      available: false
    },
    { 
      title: "Count Reports", 
      icon: FileText, 
      path: "/stock-counts-report",
      description: "Comprehensive analytics",
      gradient: "from-purple-600 to-indigo-600",
      available: false
    },
    { 
      title: "Exceptions", 
      icon: AlertTriangle, 
      path: "/exceptions-report",
      description: "Monitor anomalies instantly",
      gradient: "from-pink-500 to-rose-600",
      available: false
    },
    { 
      title: "Tracking", 
      icon: MapPin, 
      path: "/tracking",
      description: "Real-time shipment tracking",
      gradient: "from-indigo-500 to-blue-600",
      available: false
    },
    { 
      title: "Point of Presence", 
      icon: Map, 
      path: "/point-of-presence",
      description: "Manage technician locations",
      gradient: "from-violet-600 to-purple-600",
      available: false
    },
    { 
      title: "Stock Alerts", 
      icon: Bell, 
      path: "/stock-alerts",
      description: "Smart inventory notifications",
      gradient: "from-purple-500 to-pink-600",
      available: false
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed and efficiency"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade data protection"
    },
    {
      icon: TrendingUp,
      title: "Real-time Insights",
      description: "Make data-driven decisions instantly"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-block mb-4">
              <span className="text-purple-200 text-sm font-semibold tracking-wider uppercase bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                Xlink Inventory Management
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              Simplify Your
              <span className="block bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                Inventory Operations
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
              Streamline stock management, track field technicians, and optimize your workflow—all in one powerful platform
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button 
                asChild
                size="lg" 
                className="bg-white text-primary hover:bg-purple-50 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Link to="/stock-order">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="grid md:grid-cols-3 gap-4 mt-16 max-w-4xl mx-auto">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all animate-fade-in hover:scale-105"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <feature.icon className="h-8 w-8 text-purple-200 mb-3" />
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-purple-100 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Grid Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Powerful Modules
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage inventory and field operations efficiently
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((module, idx) => {
              const Icon = module.icon;
              return (
                <Link 
                  key={module.path} 
                  to={module.path}
                  className="group"
                >
                  <Card className="h-full border-2 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 bg-card/50 backdrop-blur-sm animate-fade-in overflow-hidden"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={`h-2 bg-gradient-to-r ${module.gradient} group-hover:h-3 transition-all`}></div>
                    <CardContent className="p-6 space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {module.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {module.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {module.available ? (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            Coming Soon
                          </span>
                        )}
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-purple-100">
            Transform your inventory management today
          </p>
          <Button 
            asChild
            size="lg" 
            className="bg-white text-primary hover:bg-purple-50 shadow-xl hover:shadow-2xl transition-all hover:scale-105 mt-6"
          >
            <Link to="/stock-order">
              Start Your First Order
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
