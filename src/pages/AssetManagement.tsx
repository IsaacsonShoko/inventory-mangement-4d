import { useSearchParams, Link } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

import { DeviceRegistryTab } from '@/components/asset-management/DeviceRegistryTab';
import { RepairsTab } from '@/components/asset-management/RepairsTab';
import { MovementsTab } from '@/components/asset-management/MovementsTab';

import { useAuth } from '@/hooks/useAuth';
import { useDeviceStatusCounts } from '@/hooks/useAssetManagement';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AssetManagementContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'registry';
  const { profile } = useAuth();

  const isAdminOrBackOffice = profile?.role === 'admin' || profile?.role === 'back_office';

  const { data: statusCounts } = useDeviceStatusCounts();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground">
            {isAdminOrBackOffice
              ? 'Manage all devices in the system'
              : 'View and manage your assigned devices'}
          </p>
        </div>
        {isAdminOrBackOffice && (
          <Link to="/stock-ingestion">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Stock Ingestion
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      {statusCounts && Object.keys(statusCounts).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {status}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count ?? 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="mt-4">
          <DeviceRegistryTab />
        </TabsContent>

        <TabsContent value="repairs" className="mt-4">
          <RepairsTab />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <MovementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AssetManagement() {
  return (
    <ProtectedRoute>
      <AssetManagementContent />
    </ProtectedRoute>
  );
}
