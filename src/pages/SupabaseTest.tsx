import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import {
  useInventoryItems,
  useItemCategories,
  usePointOfPresence,
  useContractors,
  usePickingQueue,
  useDispatchQueue,
} from '@/hooks/useSupabase';

interface TestResult {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  count?: number;
  error?: string;
  data?: unknown;
}

const SupabaseTest = () => {
  const [showData, setShowData] = useState<string | null>(null);

  // Test queries
  const inventory = useInventoryItems();
  const categories = useItemCategories();
  const pop = usePointOfPresence();
  const contractors = useContractors();
  const pickingQueue = usePickingQueue();
  const dispatchQueue = useDispatchQueue();

  const tests: TestResult[] = [
    {
      name: 'Inventory Items',
      status: inventory.isLoading ? 'loading' : inventory.isError ? 'error' : inventory.data ? 'success' : 'idle',
      count: inventory.data?.length,
      error: inventory.error?.message,
      data: inventory.data?.slice(0, 3),
    },
    {
      name: 'Item Categories',
      status: categories.isLoading ? 'loading' : categories.isError ? 'error' : categories.data ? 'success' : 'idle',
      count: categories.data?.length,
      error: categories.error?.message,
      data: categories.data,
    },
    {
      name: 'Point of Presence',
      status: pop.isLoading ? 'loading' : pop.isError ? 'error' : pop.data ? 'success' : 'idle',
      count: pop.data?.length,
      error: pop.error?.message,
      data: pop.data?.slice(0, 3),
    },
    {
      name: 'Contractors',
      status: contractors.isLoading ? 'loading' : contractors.isError ? 'error' : contractors.data ? 'success' : 'idle',
      count: contractors.data?.length,
      error: contractors.error?.message,
      data: contractors.data,
    },
    {
      name: 'Picking Queue',
      status: pickingQueue.isLoading ? 'loading' : pickingQueue.isError ? 'error' : pickingQueue.data ? 'success' : 'idle',
      count: pickingQueue.data?.length,
      error: pickingQueue.error?.message,
      data: pickingQueue.data?.slice(0, 3),
    },
    {
      name: 'Dispatch Queue',
      status: dispatchQueue.isLoading ? 'loading' : dispatchQueue.isError ? 'error' : dispatchQueue.data ? 'success' : 'idle',
      count: dispatchQueue.data?.length,
      error: dispatchQueue.error?.message,
      data: dispatchQueue.data?.slice(0, 3),
    },
  ];

  const refetchAll = () => {
    inventory.refetch();
    categories.refetch();
    pop.refetch();
    contractors.refetch();
    pickingQueue.refetch();
    dispatchQueue.refetch();
  };

  const allSuccess = tests.every(t => t.status === 'success');
  const anyError = tests.some(t => t.status === 'error');
  const anyLoading = tests.some(t => t.status === 'loading');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
          <p className="text-muted-foreground mt-1">
            Verifying database connectivity and data retrieval
          </p>
        </div>
        <Button onClick={refetchAll} variant="outline" disabled={anyLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${anyLoading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`mb-6 ${allSuccess ? 'border-green-500' : anyError ? 'border-red-500' : 'border-yellow-500'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {anyLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            ) : allSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {anyLoading ? 'Testing connections...' : allSuccess ? 'All tests passed!' : 'Some tests failed'}
              </h2>
              <p className="text-muted-foreground">
                {tests.filter(t => t.status === 'success').length} / {tests.length} tests successful
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Tests */}
      <div className="grid gap-4">
        {tests.map((test) => (
          <Card key={test.name}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {test.status === 'loading' && (
                    <Badge variant="outline" className="bg-yellow-50">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading
                    </Badge>
                  )}
                  {test.status === 'success' && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Success ({test.count} records)
                    </Badge>
                  )}
                  {test.status === 'error' && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  {test.status === 'idle' && (
                    <Badge variant="secondary">Idle</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {test.status === 'error' && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {test.error || 'Unknown error occurred'}
                </div>
              )}
              {test.status === 'success' && test.data && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowData(showData === test.name ? null : test.name)}
                  >
                    {showData === test.name ? 'Hide' : 'Show'} sample data
                  </Button>
                  {showData === test.name && (
                    <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Connection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Project ID:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded">njtlhmhspywqdnpsqock</code>
            </div>
            <div>
              <span className="text-muted-foreground">Environment:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded">
                {import.meta.env.MODE}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseTest;
