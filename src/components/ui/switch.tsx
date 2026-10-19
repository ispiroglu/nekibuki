import * as SwitchPrimitive from '@radix-ui/react-switch'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Switch = forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 ease-out data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-6 rounded-full bg-background shadow-sm transition-transform duration-200 ease-out data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'
