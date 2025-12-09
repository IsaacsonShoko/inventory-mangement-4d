import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useRef } from 'react';

// Chart color palette
export const CHART_PALETTE = [
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#06b6d4', // cyan-500
];

// Theme-aware colors (using CSS variables)
export const THEME_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg animate-scale-in">
      <p className="font-semibold mb-2 text-sm">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// CSV export utility
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  data?: any[];
  className?: string;
  showExport?: boolean;
}

export function ChartWrapper({
  title,
  description,
  children,
  action,
  data,
  className = '',
  showExport = true
}: ChartWrapperProps) {
  return (
    <Card className={`card-hover ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showExport && data && data.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToCSV(data, title.replace(/\s+/g, '_').toLowerCase())}
                className="h-8 px-2 button-press"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className="animate-fade-in">{children}</CardContent>
    </Card>
  );
}

// Bar Chart Component
interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export function SimpleBarChart({
  data,
  title,
  description,
  dataKey = 'value',
  nameKey = 'name',
  color = CHART_PALETTE[0],
  height = 300,
  showExport = true,
}: {
  data: BarChartData[];
  title: string;
  description?: string;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={nameKey}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// Multi-Bar Chart (for comparisons)
export function MultiBarChart({
  data,
  title,
  description,
  bars,
  height = 300,
  showExport = true,
}: {
  data: any[];
  title: string;
  description?: string;
  bars: Array<{ dataKey: string; name: string; color?: string }>;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color || CHART_PALETTE[index % CHART_PALETTE.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// Line Chart (for trends over time)
export function TrendLineChart({
  data,
  title,
  description,
  lines,
  height = 300,
  showExport = true,
}: {
  data: any[];
  title: string;
  description?: string;
  lines: Array<{ dataKey: string; name: string; color?: string }>;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color || CHART_PALETTE[index % CHART_PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// Area Chart (for cumulative/stacked data)
export function StackedAreaChart({
  data,
  title,
  description,
  areas,
  height = 300,
  showExport = true,
}: {
  data: any[];
  title: string;
  description?: string;
  areas: Array<{ dataKey: string; name: string; color?: string }>;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {areas.map((area, index) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stackId="1"
                stroke={area.color || CHART_PALETTE[index % CHART_PALETTE.length]}
                fill={area.color || CHART_PALETTE[index % CHART_PALETTE.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// Pie/Donut Chart
export function DonutChart({
  data,
  title,
  description,
  height = 300,
  showExport = true,
  innerRadius = 60,
  outerRadius = 100,
}: {
  data: Array<{ name: string; value: number }>;
  title: string;
  description?: string;
  height?: number;
  showExport?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) =>
                percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                  className="stroke-background"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} ({entry.payload.value})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// Simple Pie Chart (no inner radius)
export function SimplePieChart({
  data,
  title,
  description,
  height = 300,
  showExport = true,
}: {
  data: Array<{ name: string; value: number }>;
  title: string;
  description?: string;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <DonutChart
      data={data}
      title={title}
      description={description}
      height={height}
      showExport={showExport}
      innerRadius={0}
      outerRadius={100}
    />
  );
}

// Radar Chart (for multi-dimensional comparison)
export function RadarChartComponent({
  data,
  title,
  description,
  metrics,
  height = 400,
  showExport = true,
}: {
  data: any[];
  title: string;
  description?: string;
  metrics: Array<{ dataKey: string; name: string; color?: string }>;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={data}>
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <PolarRadiusAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {metrics.map((metric, index) => (
              <Radar
                key={metric.dataKey}
                name={metric.name}
                dataKey={metric.dataKey}
                stroke={metric.color || CHART_PALETTE[index % CHART_PALETTE.length]}
                fill={metric.color || CHART_PALETTE[index % CHART_PALETTE.length]}
                fillOpacity={0.4}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// Horizontal Bar Chart
export function HorizontalBarChart({
  data,
  title,
  description,
  dataKey = 'value',
  nameKey = 'name',
  color = CHART_PALETTE[0],
  height = 300,
  showExport = true,
}: {
  data: BarChartData[];
  title: string;
  description?: string;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
  showExport?: boolean;
}) {
  return (
    <ChartWrapper title={title} description={description} data={data} showExport={showExport}>
      <div className="animate-chart-grow">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[0, 6, 6, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

// KPI Metric Card with sparkline
export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  sparklineData,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: any;
  sparklineData?: number[];
}) {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className="card-hover">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold animate-count-up">{value}</p>
              {change && (
                <span className={`text-xs font-medium ${changeColors[changeType]}`}>
                  {change}
                </span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.map((v, i) => ({ value: v, index: i }))}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
