import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedInputProps extends React.ComponentProps<"input"> {
  typedPlaceholder?: string
  typeSpeed?: number
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, type, typedPlaceholder, typeSpeed = 55, ...props }, ref) => {
    const [displayed, setDisplayed] = React.useState("")

    React.useEffect(() => {
      if (!typedPlaceholder) return
      setDisplayed("")
      let i = 0
      const id = setInterval(() => {
        if (i < typedPlaceholder.length) {
          setDisplayed(typedPlaceholder.slice(0, ++i))
        } else {
          clearInterval(id)
        }
      }, typeSpeed)
      return () => clearInterval(id)
    }, [typedPlaceholder, typeSpeed])

    return (
      <input
        type={type}
        placeholder={typedPlaceholder ? displayed : props.placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
AnimatedInput.displayName = "AnimatedInput"
