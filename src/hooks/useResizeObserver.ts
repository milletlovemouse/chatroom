import { useEffect } from "react"

export default function useResizeObserver(target: Element, callback: ResizeObserverCallback) {
  let resizeObserver: ResizeObserver
  const disconnect = () => {
    resizeObserver && resizeObserver.disconnect()
    resizeObserver = null
  }
  return () => {
    disconnect()
    if (target) {
      resizeObserver = new ResizeObserver(callback)
      resizeObserver.observe(target)
    }
    return disconnect
  }
}