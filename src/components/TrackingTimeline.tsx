import { cn } from '@/lib/utils';
import {
  Package,
  PackageSearch,
  PackageCheck,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  Building2,
} from 'lucide-react';
import type { OrderStage, StageTimestamp } from '@/services/orderTrackingService';

interface TrackingTimelineProps {
  stages: StageTimestamp[];
  dispatchMethod: string;
  className?: string;
}

// Stage configuration
const stageConfig: Record<
  OrderStage,
  {
    label: string;
    icon: React.ElementType;
    description: string;
  }
> = {
  placed: {
    label: 'Order Placed',
    icon: Package,
    description: 'Order received and confirmed',
  },
  picking: {
    label: 'Picking',
    icon: PackageSearch,
    description: 'Items being collected from warehouse',
  },
  picked: {
    label: 'Picked',
    icon: PackageCheck,
    description: 'All items collected and ready',
  },
  dispatching: {
    label: 'Preparing Dispatch',
    icon: Building2,
    description: 'Order being prepared for shipment',
  },
  dispatched: {
    label: 'Dispatched',
    icon: Truck,
    description: 'Order handed to courier',
  },
  in_transit: {
    label: 'In Transit',
    icon: Truck,
    description: 'On the way to destination',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    description: 'Successfully delivered',
  },
  collected: {
    label: 'Collected',
    icon: MapPin,
    description: 'Collected from warehouse',
  },
};

export const TrackingTimeline = ({
  stages,
  dispatchMethod,
  className,
}: TrackingTimelineProps) => {
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line connector */}
      <div className="absolute left-6 top-8 h-[calc(100%-4rem)] w-0.5 bg-gray-200" />

      <div className="space-y-0">
        {stages.map((stage, index) => {
          const config = stageConfig[stage.stage];
          const Icon = config.icon;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage} className="relative flex items-start gap-4 pb-8">
              {/* Icon container with animations */}
              <div
                className={cn(
                  'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500',
                  stage.completed && 'border-green-500 bg-green-500 text-white',
                  stage.current && !stage.completed && [
                    'border-blue-500 bg-blue-500 text-white',
                    'animate-pulse shadow-lg shadow-blue-500/50',
                  ],
                  !stage.completed && !stage.current && 'border-gray-300 bg-white text-gray-400'
                )}
              >
                {stage.completed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Icon className={cn('h-6 w-6', stage.current && 'animate-bounce')} />
                )}

                {/* Pulse ring for current stage */}
                {stage.current && !stage.completed && (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="absolute -inset-1 animate-pulse rounded-full bg-blue-400/30" />
                  </>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      'font-semibold transition-colors',
                      stage.completed && 'text-green-700',
                      stage.current && !stage.completed && 'text-blue-700',
                      !stage.completed && !stage.current && 'text-gray-400'
                    )}
                  >
                    {config.label}
                  </h4>
                  {stage.timestamp && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(stage.timestamp)}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-sm',
                    stage.completed || stage.current ? 'text-gray-600' : 'text-gray-400'
                  )}
                >
                  {config.description}
                </p>

                {/* Progress bar for current stage */}
                {stage.current && !stage.completed && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full animate-progress rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{
                          animation: 'progress 2s ease-in-out infinite',
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-blue-600">In progress...</p>
                  </div>
                )}
              </div>

              {/* Connector line animation for completed stages */}
              {!isLast && stage.completed && (
                <div
                  className="absolute left-6 top-12 h-8 w-0.5 bg-green-500"
                  style={{
                    animation: 'slideDown 0.5s ease-out',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes progress {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }

        @keyframes slideDown {
          from {
            height: 0;
          }
          to {
            height: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

// Compact horizontal timeline for list views
export const TrackingTimelineCompact = ({
  stages,
  className,
}: {
  stages: StageTimestamp[];
  className?: string;
}) => {
  const completedCount = stages.filter((s) => s.completed).length;
  const currentIndex = stages.findIndex((s) => s.current);
  const progress = ((completedCount + (currentIndex >= 0 ? 0.5 : 0)) / stages.length) * 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 via-blue-500 to-blue-600 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Animated shine effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          style={{
            animation: 'shine 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Stage dots */}
      <div className="mt-2 flex justify-between">
        {stages.map((stage, index) => {
          const config = stageConfig[stage.stage];
          return (
            <div
              key={stage.stage}
              className="flex flex-col items-center"
              title={config.label}
            >
              <div
                className={cn(
                  'h-3 w-3 rounded-full border-2 transition-all duration-500',
                  stage.completed && 'border-green-500 bg-green-500',
                  stage.current && !stage.completed && [
                    'border-blue-500 bg-blue-500',
                    'animate-pulse',
                  ],
                  !stage.completed && !stage.current && 'border-gray-300 bg-white'
                )}
              />
              <span className="mt-1 text-[10px] text-gray-500 hidden sm:block">
                {config.label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default TrackingTimeline;
