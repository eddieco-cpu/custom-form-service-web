import { safeRedirect } from '../utils/redirect'
export default defineNuxtRouteMiddleware(async (to) => {
  const { session, state } = useAuth()
  await session.initialize()
  if (state.value.outcome === 'authenticated') return navigateTo(safeRedirect(to.query.redirect, window.location.origin), { replace: true })
})
