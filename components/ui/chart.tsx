import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chartContainerVariants = cva("relative", {
  variants: {
    size: {
      default: "h-80",
      sm: "h-48",
      lg: "h-96",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface ChartContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chartContainerVariants> {}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(({ className, size, ...props }, ref) => {
  return <div className={cn(chartContainerVariants({ size, className }))} ref={ref} {...props} />
})
ChartContainer.displayName = "ChartContainer"

const chartVariants = cva("absolute inset-0", {
  variants: {
    type: {
      default: "",
      donut: "flex items-center justify-center",
    },
  },
  defaultVariants: {
    type: "default",
  },
})

export interface ChartProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof chartVariants> {}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(({ className, type, ...props }, ref) => {
  return <div className={cn(chartVariants({ type, className }))} ref={ref} {...props} />
})
Chart.displayName = "Chart"

const chartLegendVariants = cva("flex justify-center gap-2 text-sm", {
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

export interface ChartLegendProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chartLegendVariants> {}

const ChartLegend = React.forwardRef<HTMLDivElement, ChartLegendProps>(({ className, orientation, ...props }, ref) => {
  return <div className={cn(chartLegendVariants({ orientation, className }))} ref={ref} {...props} />
})
ChartLegend.displayName = "ChartLegend"

const chartTooltipContentVariants = cva("rounded-md border bg-popover p-4 text-sm shadow-sm outline-none", {
  variants: {
    side: {
      top: "animate-slide-down-and-fade",
      bottom: "animate-slide-up-and-fade",
      left: "animate-slide-right-and-fade",
      right: "animate-slide-left-and-fade",
    },
  },
})

export interface ChartTooltipContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chartTooltipContentVariants> {}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ className, side, ...props }, ref) => {
    return <div className={cn(chartTooltipContentVariants({ side, className }))} ref={ref} {...props} />
  },
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export interface ChartTooltipItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  color?: string
}

export const ChartTooltipItem = React.forwardRef<HTMLDivElement, ChartTooltipItemProps>(
  ({ className, label, value, color, ...props }, ref) => {
    return (
      <div className="flex items-center justify-between space-x-2" ref={ref} {...props}>
        <div className="flex items-center space-x-1">
          {color ? <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> : null}
          <span className="font-semibold">{label}</span>
        </div>
        <span className="font-medium">{value}</span>
      </div>
    )
  },
)
ChartTooltipItem.displayName = "ChartTooltipItem"

export { Chart, ChartContainer, ChartLegend, ChartTooltipContent }
