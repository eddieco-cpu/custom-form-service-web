import { assertProductionApiBaseUrl } from '../utils/production-api-url'

export default defineNitroPlugin(() => {
  // Docker enables this guard; existing local preview/integration tests keep
  // their intentional HTTP localhost topology.
  if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_PUBLIC_API_BASE_URL === 'true') {
    assertProductionApiBaseUrl(useRuntimeConfig().public.apiBaseUrl)
  }
})
