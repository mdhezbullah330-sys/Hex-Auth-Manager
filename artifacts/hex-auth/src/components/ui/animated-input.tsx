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
    const [chars, setChars] = React.useState<{ ch: string; id: number }[]>([])
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

    /* Sync chars array whenever value changes */
    React.useEffect(() => {
      const val = currentValue
      setChars((prev) => {
        if (val.length > prev.length) {
          // Characters added — append new ones with fresh ids
          const added = val.slice(prev.length).split("").map((ch) => ({
            ch,
            id: ++idRef.current,
          }))
          return [...prev, ...added]
        } else {
          // Characters removed — trim
          return prev.slice(0, val.length)
        }
      })
    }, [currentValue])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(e.target.value)
      onChange?.(e)
    }

    const isPassword = type === "password"

    return (
      <div className="relative w-full">
        {/* Real input — transparent text so overlay shows */}
        <input
          ref={inputRef}
          type={type}
          value={currentValue}
          onChange={handleChange}
          placeholder={currentValue.length === 0 ? placeholder : ""}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm",
            "transition-all duration-200",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            /* hide actual text — overlay renders it */
            !isPassword && currentValue.length > 0 ? "text-transparent caret-foreground" : "",
            className
          )}
          {...props}
        />

        {/* Animated character overlay — only for non-password */}
        {!isPassword && currentValue.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center px-3 overflow-hidden"
            aria-hidden
          >
            {chars.map(({ ch, id }, i) => (
              <span
                key={id}
                className="inline-block text-foreground text-sm leading-none"
                style={{
                  animation: "charPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
                  animationDelay: "0ms",
                  whiteSpace: "pre",
                }}
              >
                {ch}
              </span>
            ))}
          </div>
        )}

        <style>{`
          @keyframes charPop {
            from {
              opacity: 0;
              transform: translateY(6px) scale(0.7);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    )
  }
)
AnimatedInput.displayName = "AnimatedInput"
