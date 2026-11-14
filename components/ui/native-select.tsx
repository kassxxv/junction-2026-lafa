import { ChevronDown } from "lucide-react"
import * as React from "react"
import { cn } from "cn"

/**
 * A real <select> styled like Input: same height, border, radius, focus ring and chevron on every
 * screen. Native on purpose: keyboard, screen readers and phones get the platform picker.
 * `wrapperClassName` sizes the control (e.g. "w-24"); `className` styles the select itself.
 */
function NativeSelect({ className, wrapperClassName, ...props }: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span data-slot="native-select-wrapper" className={cn("relative inline-flex w-full", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-8 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-input bg-card py-1 pr-8 pl-2.5 text-base font-normal text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
          className
        )}
        {...props}
      />
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  )
}

export { NativeSelect }
