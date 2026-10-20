import { useEffect } from 'react'
import { CaptureUpdateAction } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { attachComponentArrows } from '@/lib/connections'

export function useComponentConnections(api: ExcalidrawImperativeAPI | null, readOnly: boolean) {
  useEffect(() => {
    if (!api || readOnly) return
    let active = true
    const unsubscribe = api.onPointerUp((tool, down, event) => {
      if (event.ctrlKey || event.metaKey || down.withCmdOrCtrl) return
      // Native pointer-up finalizes the arrow after emitting this callback.
      queueMicrotask(() => {
        if (!active || api.getAppState().multiElement) return
        const state = api.getAppState()
        const elements = api.getSceneElementsIncludingDeleted()
        const ids = new Set(
          elements
            .filter(
              (e) =>
                e.type === 'arrow' &&
                e.version !== down.originalElements.get(e.id)?.version &&
                (tool.type === 'arrow' ||
                  state.selectedElementIds[e.id] ||
                  down.hit.element?.id === e.id),
            )
            .map((e) => e.id),
        )
        const attached = attachComponentArrows(elements, ids, state.zoom.value)
        if (attached !== elements)
          api.updateScene({
            elements: attached,
            // Binding completes the existing gesture; it must not add an extra undo step.
            captureUpdate: CaptureUpdateAction.NEVER,
          })
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [api, readOnly])
}
