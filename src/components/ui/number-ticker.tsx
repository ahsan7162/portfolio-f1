import { useEffect, useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })
  const fmt = (n: number) =>
    Intl.NumberFormat("en-US", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(n)

  // v2 edit: prerendered HTML shows the real value (SEO, no-JS, reduced
  // motion). With motion on, reset to the start value before first paint.
  useLayoutEffect(() => {
    if (!ref.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    ref.current.textContent = fmt(direction === "down" ? value : startValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    if (isInView && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value)
      }, delay * 1000)
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
    }
  }, [motionValue, isInView, delay, value, direction, startValue])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)))
        }
      }),
    [springValue, decimalPlaces]
  )

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tabular-nums",
        className
      )}
      {...props}
    >
      {fmt(value)}
    </span>
  )
}
