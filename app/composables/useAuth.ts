import { AuthSession, initialAuthState } from '../domain/auth-state'
import { userService } from '../services/user'
const sessions = new WeakMap<object, AuthSession>()
export function useAuth() {
  const app = useNuxtApp()
  const state = useState('auth-state', initialAuthState)
  const busy = useState('auth-write-pending', () => false)
  let session = sessions.get(app)
  if (!session) {
    session = new AuthSession(state.value, userService(useRuntimeConfig().public.apiBaseUrl).me)
    sessions.set(app, session)
  }
  return { state, session, busy }
}
