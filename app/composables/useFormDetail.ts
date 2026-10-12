import { formService } from '../services/form'
import type { FormDetailDto } from '../domain/api/form'
import { detailLocation } from '../domain/form-read'

export function useFormDetail(mode: 'form' | 'edit') {
  const route = useRoute()
  const router = useRouter()
  const service = formService(useRuntimeConfig().public.apiBaseUrl)
  const id = computed(() => String(route.params.formId ?? ''))
  const read = useFormRead<FormDetailDto>(() => `${route.fullPath}|${mode}|${id.value}`)
  const owner = computed(() => !!read.state.data && read.auth.value.outcome === 'authenticated' && read.auth.value.user?.id === read.state.data.userId)
  async function load(manual = false) {
    if (!read.canRead.value) return
    const sentId = id.value
    await read.reader.read(signal => service.detail(sentId, signal), manual, async (value, ticket) => {
      const target = detailLocation(value, read.auth.value.outcome === 'authenticated' ? read.auth.value.user?.id : undefined, mode)
      if (target) { if (ticket.isCurrent()) await router.replace(target); return }
      read.state.data = value
    })
  }
  watch([read.canRead, () => read.auth.value.sessionRevision, () => route.fullPath], () => { if (read.canRead.value) void load() }, { immediate: true })
  return { ...read, owner, refresh: () => load(true) }
}
