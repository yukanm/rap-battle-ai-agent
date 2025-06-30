import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:from-purple-700 hover:to-pink-700 hover:shadow-xl hover:scale-105',
        destructive: 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800 hover:shadow-xl hover:scale-105',
        outline: 'border-2 border-purple-500 bg-transparent text-purple-400 shadow-lg hover:bg-purple-500 hover:text-white hover:shadow-xl hover:scale-105',
        secondary: 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg hover:from-gray-800 hover:to-gray-900 hover:shadow-xl hover:scale-105',
        ghost: 'text-white hover:bg-white/10 hover:text-white rounded-full',
        link: 'text-purple-400 underline-offset-4 hover:underline hover:text-purple-300',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 rounded-lg px-4 text-xs',
        lg: 'h-14 rounded-2xl px-8 py-4 text-base font-bold',
        icon: 'h-12 w-12 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
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
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }