import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const DURATION = 4500

function ProgressBar({ variant }: { variant?: string }) {
  const [width, setWidth] = React.useState(100)

  React.useEffect(() => {
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setWidth(pct)
      if (pct > 0) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const color =
    variant === "destructive"
      ? "bg-red-500/60"
      : variant === "success"
      ? "bg-emerald-500/60"
      : "bg-primary/60"

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 rounded-b-xl overflow-hidden">
      <div
        className={`h-full ${color} transition-none`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={DURATION}>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="grid gap-0.5 flex-1 pr-4">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
          <ProgressBar variant={variant ?? "default"} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
