import { format } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useRecentMovements } from '@/hooks/useAssetManagement';

export function MovementsTab() {
  const { data: movements, isLoading } = useRecentMovements(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Recent Device Movements ({movements?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements?.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {format(new Date(movement.movement_date), 'PP p')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {movement.device?.serial_number || 'N/A'}
                      {movement.device?.device_type && (
                        <span className="block text-xs text-muted-foreground">
                          {movement.device.device_type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.movement_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {movement.from_holder_type
                        ? `${movement.from_holder_type}: ${movement.from_holder_id}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {movement.to_holder_type
                        ? `${movement.to_holder_type}: ${movement.to_holder_id}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{movement.performed_by}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {movement.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {movements?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No movements recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
