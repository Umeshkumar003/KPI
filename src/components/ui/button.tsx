import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-orange-400 !bg-orange-500 !text-white text-sm font-medium leading-none ring-offset-background transition-all duration-200 ease-out hover:!bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:!text-white",
  {
    variants: {
      variant: {
        default:
          "bg-orange-500 text-white shadow-sm shadow-orange-900/10 hover:bg-orange-600 hover:shadow-md hover:shadow-orange-900/20 active:scale-[0.98]",
        destructive:
          "bg-orange-600 text-white shadow-sm hover:bg-orange-700 hover:shadow-md active:scale-[0.98]",
        outline:
          "border border-orange-300 bg-orange-50 text-orange-700 shadow-sm hover:border-orange-400 hover:bg-orange-100 hover:text-orange-800 hover:shadow active:scale-[0.98] dark:border-orange-500/70 dark:bg-orange-950/30 dark:text-orange-200 dark:hover:bg-orange-900/40 dark:hover:text-orange-100 dark:hover:border-orange-400/80",
        secondary:
          "border border-orange-300 bg-orange-100 text-orange-800 shadow-sm hover:bg-orange-200 hover:border-orange-400 hover:shadow-md active:scale-[0.98] dark:border-orange-500/70 dark:bg-orange-900/40 dark:text-orange-100 dark:hover:bg-orange-900/55",
        ghost:
          "text-orange-700 hover:bg-orange-100 hover:text-orange-800 active:scale-[0.99] dark:text-orange-200 dark:hover:bg-orange-900/40 dark:hover:text-orange-100",
        link: "text-orange-600 underline-offset-4 shadow-none hover:underline hover:text-orange-700 active:scale-100 dark:text-orange-300 dark:hover:text-orange-200",
      },
      size: {
        default: "h-10 px-4 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
