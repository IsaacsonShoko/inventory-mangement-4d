import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { GripVertical, Eye, Edit, Clock, User, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateRepairTicketStatus } from '@/hooks/useAssetManagement';
import type { RepairStatusEnum } from '@/integrations/supabase/services-asset';
import { toast } from 'sonner';

// Status columns configuration
const KANBAN_COLUMNS: RepairStatusEnum[] = [
  'Reported',
  'Assessing',
  'In-Repair',
  'Quality-Check',
  'Repaired',
  'Returned',
];

// Status colors (matching RepairsTab.tsx)
const statusColors: Record<RepairStatusEnum, string> = {
  'Reported': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 border-red-200 dark:border-red-800',
  'Assessing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800',
  'In-Repair': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 border-orange-200 dark:border-orange-800',
  'Repaired': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-200 dark:border-green-800',
  'Quality-Check': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800',
  'Returned': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700',
  'Decommissioned': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700',
};

// Column header colors
const columnHeaderColors: Record<RepairStatusEnum, string> = {
  'Reported': 'border-t-red-500',
  'Assessing': 'border-t-yellow-500',
  'In-Repair': 'border-t-orange-500',
  'Quality-Check': 'border-t-blue-500',
  'Repaired': 'border-t-green-500',
  'Returned': 'border-t-gray-500',
  'Decommissioned': 'border-t-slate-500',
};

interface RepairsKanbanProps {
  tickets: any[];
  onViewDetails: (ticket: any) => void;
  onEdit: (ticket: any) => void;
}

// Draggable ticket card component
function TicketCard({ ticket, onViewDetails, onEdit, isDragging = false }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = isDragging || isSortableDragging;

  // Calculate days since reported
  const daysSinceReported = useMemo(() => {
    if (!ticket.reported_date) return 0;
    const diff = Date.now() - new Date(ticket.reported_date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [ticket.reported_date]);

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`mb-3 transition-all duration-200 ${
          isActive
            ? 'opacity-50 scale-105 shadow-2xl rotate-2'
            : 'hover:shadow-md cursor-grab active:cursor-grabbing'
        }`}
      >
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-mono text-muted-foreground truncate">
                  #{ticket.ticket_number}
                </span>
              </div>
              <p className="font-semibold text-sm truncate">
                {ticket.device?.serial_number || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {ticket.device?.device_type || 'Unknown Device'}
              </p>
            </div>
            {daysSinceReported > 3 && (
              <div className="flex-shrink-0">
                <Badge variant="destructive" className="text-xs animate-badge-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {daysSinceReported}d
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs truncate max-w-full">
                {ticket.fault_category || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(ticket.reported_date), 'MMM d')}
              </span>
              <span className="flex items-center gap-1 truncate max-w-[100px]">
                <User className="h-3 w-3" />
                {ticket.reported_by?.split('@')[0] || 'Unknown'}
              </span>
            </div>
            <div className="flex gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs button-press"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(ticket);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs button-press"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(ticket);
                }}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable column component
function KanbanColumn({
  status,
  tickets,
  onViewDetails,
  onEdit,
  isOver
}: {
  status: RepairStatusEnum;
  tickets: any[];
  onViewDetails: (ticket: any) => void;
  onEdit: (ticket: any) => void;
  isOver: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-72">
      <Card className={`h-full border-t-4 ${columnHeaderColors[status]} transition-all duration-200 ${
        isOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
      }`}>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {status.replace('-', ' ')}
            </CardTitle>
            <Badge
              variant="secondary"
              className={`ml-2 ${tickets.length > 0 ? 'animate-count-up' : ''}`}
            >
              {tickets.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ScrollArea className="h-[calc(100vh-350px)] pr-2">
            <SortableContext
              items={tickets.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0">
                {tickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="animate-slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TicketCard
                      ticket={ticket}
                      onViewDetails={onViewDetails}
                      onEdit={onEdit}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
            {tickets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p className="mb-1">No tickets</p>
                <p className="text-xs">Drop tickets here</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function RepairsKanban({ tickets, onViewDetails, onEdit }: RepairsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const updateTicketStatus = useUpdateRepairTicketStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<RepairStatusEnum, any[]> = {
      'Reported': [],
      'Assessing': [],
      'In-Repair': [],
      'Quality-Check': [],
      'Repaired': [],
      'Returned': [],
      'Decommissioned': [],
    };

    tickets.forEach((ticket) => {
      const status = ticket.status as RepairStatusEnum;
      if (grouped[status]) {
        grouped[status].push(ticket);
      }
    });

    return grouped;
  }, [tickets]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Check if over a column or a ticket
      const overStatus = KANBAN_COLUMNS.find(s => s === over.id);
      if (overStatus) {
        setOverColumn(overStatus);
      } else {
        // Find which column the ticket belongs to
        const overTicket = tickets.find(t => t.id === over.id);
        if (overTicket) {
          setOverColumn(overTicket.status);
        }
      }
    } else {
      setOverColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverColumn(null);

    if (!over) return;

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    // Determine target column
    let targetStatus: RepairStatusEnum | null = null;

    // Check if dropped directly on a column
    if (KANBAN_COLUMNS.includes(over.id as RepairStatusEnum)) {
      targetStatus = over.id as RepairStatusEnum;
    } else {
      // Dropped on another ticket - find its column
      const overTicket = tickets.find(t => t.id === over.id);
      if (overTicket) {
        targetStatus = overTicket.status as RepairStatusEnum;
      }
    }

    if (targetStatus && activeTicket.status !== targetStatus) {
      updateTicketStatus.mutate(
        { id: activeTicket.id, status: targetStatus },
        {
          onSuccess: () => {
            toast.success(`Ticket moved to ${targetStatus}`, {
              description: `#${activeTicket.ticket_number} status updated`,
            });
          },
          onError: () => {
            toast.error('Failed to update ticket status');
          },
        }
      );
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={ticketsByStatus[status]}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
            isOver={overColumn === status}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <Card className="w-72 cursor-grabbing shadow-2xl rotate-3 opacity-95">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">
                      #{activeTicket.ticket_number}
                    </span>
                  </div>
                  <p className="font-semibold text-sm">
                    {activeTicket.device?.serial_number || 'N/A'}
                  </p>
                </div>
                <Badge className={`${statusColors[activeTicket.status as RepairStatusEnum]} text-xs`}>
                  {activeTicket.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-3 pb-3">
              <Badge variant="outline" className="text-xs">
                {activeTicket.fault_category}
              </Badge>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
