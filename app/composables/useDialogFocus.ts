import { nextTick } from 'vue'
import { useRoute } from 'vue-router'

// Capture before loading disables/blurs the control. Restore only after the
// caller's close/navigation flow and the Dialog focus scope have finished.
export function useDialogFocus(fallback: () => HTMLElement | null | undefined = () => undefined) {
  const route = useRoute()
  let trigger: HTMLElement | undefined
  let path = ''
  function capture() {
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    path = route.fullPath
  }
  function available(element: HTMLElement | null | undefined): element is HTMLElement {
    return !!element?.isConnected && element !== document.body && !element.matches(':disabled, [aria-disabled="true"]')
      && !element.closest('[inert], [aria-hidden="true"], [role="dialog"][aria-modal="true"]')
      && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
  }
  async function restore() {
    await nextTick()
    // Reka removes the focus scope on this turn; suppress its trigger-less
    // default separately so it cannot later move focus back to BODY.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
    const samePage = path === route.fullPath
    const candidates = [samePage ? trigger : undefined, samePage ? fallback() : undefined, document.querySelector<HTMLElement>('main h1')]
    const target = candidates.find(available)
    if (!target) return
    if (!target.matches('button, input, select, textarea, a[href], [tabindex]')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }
  return { capture, restore }
}
