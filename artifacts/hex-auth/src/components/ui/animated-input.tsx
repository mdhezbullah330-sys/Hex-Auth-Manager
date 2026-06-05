import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedInputProps extends React.ComponentProps<"input"> {
  typedPlaceholder?: string
  typeSpeed?: number
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, type, typedPlaceholder, typeSpeed = 55, onChange, value, defaultValue, ...props }, ref) => {
    const [placeholder, setPlaceholder] = React.useState("")
    const [internalValue, setInternalValue] = React.useState(
      (value as string) ?? (defaultValue as string) ?? ""
    )
    const idRef = React.useRef(0)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const isControlled = value !== undefined

    const currentValue = isControlled ? (value as string) : internalValue

    React.useImperativeHandle(ref, () => inputRef.current!)

    /* Placeholder typewriter — only while input is empty */
    React.useEffect(() => {
      if (!typedPlaceholder) return
      if (currentValue.length > 0) {
        setPlaceholder("")
        return
      }
      setPlaceholder("")
      let i = 0
      const id = setInterval(() => {
        if (i < typedPlaceholder.length) {
          setPlaceholder(typedPlaceholder.slice(0, ++i))
        } else {
          clearInterval(id)
        }
      }, typeSpeed)
      return () => clearInterval(id)
    }, [typedPlaceholder, typeSpeed, currentValue.length === 0])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(e.target.value)
      onChange?.(e)
    }

    return (
      <input
        ref={inputRef}
        type={type}
        value={currentValue}
        onChange={handleChange}
        placeholder={currentValue.length === 0 ? placeholder : ""}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
          "transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
AnimatedInput.displayName = "AnimatedInput"
