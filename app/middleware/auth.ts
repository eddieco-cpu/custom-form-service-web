import { loginLocation } from '../utils/redirect'
export default defineNuxtRouteMiddleware(async (to) => {
  const { session, state } = useAuth()
  await session.initialize()
  if (state.value.outcome === 'anonymous') return navigateTo(loginLocation(to.fullPath), { replace: true })
})
