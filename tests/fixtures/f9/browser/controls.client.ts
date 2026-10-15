import { defineNuxtPlugin, useRouter, useAuth } from '#imports'
// Fixture build only: inject Session/route events into the unmodified product page.
export default defineNuxtPlugin(() => {
  const { session } = useAuth(), router = useRouter()
  window.f9Harness = { login: user => session.login(user), verify: () => session.verify(), profile: user => session.profile(user), push: path => router.push(path) }
})
