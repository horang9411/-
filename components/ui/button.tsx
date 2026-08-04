import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#315f47] text-white hover:bg-[#284f3b]",
        secondary: "border border-[#dde3df] bg-white text-[#3f4943] hover:bg-[#f6f8f6]",
        ghost: "text-[#536059] hover:bg-[#eef2ef]",
        yellow: "bg-[#f6d978] text-[#4a3b0d] hover:bg-[#efd069]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 rounded-[9px] px-3 text-[13px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
