import { formService } from '../services/form'
import type { FormDetailDto } from '../domain/api/form'
import { detailLocation } from '../domain/form-read'

export function useFormDetail(mode: 'form' | 'edit') {
  const route = useRoute()
  const router = useRouter()
  const service = formService(useRuntimeConfig().public.apiBaseUrl)
  const operation = useOperationState('delta', () => `form:${String(route.params.formId).toLowerCase()}`)
  const id = computed(() => String(route.params.formId ?? ''))
  const read = useFormRead<FormDetailDto>(() => `${route.fullPath}|${mode}|${id.value}`)
  const owner = computed(() => !!read.state.data && read.auth.value.outcome === 'authenticated' && read.auth.value.user?.id === read.state.data.userId)
  let verifying = false
  async function load(manual = false, permit: () => boolean = () => true): Promise<boolean> {
    if (!read.canRead.value || operation.state.value.loading) return false
    const sentId = id.value
    const revision = read.auth.value.sessionRevision
    const currentRead = operation.operation.value!.captureRead()
    const fresh = () => currentRead() && permit()
    let adopted = false
    await read.reader.read(signal => service.detail(sentId, signal), manual, async (value, ticket) => {
      const target = detailLocation(value, read.auth.value.outcome === 'authenticated' ? read.auth.value.user?.id : undefined, mode)
      if (!permit()) return
      adopted = operation.operation.value!.reconcile(() => { read.state.data = value; return true }, () => ticket.isCurrent() && currentRead())
      if (adopted && target && ticket.isCurrent()) await router.replace(target)
    }, read.reader.captureAuthPresentation(manual), fresh)
    if (fresh() && sentId === id.value && revision === read.auth.value.sessionRevision && read.state.error?.kind === 'not-found') {
      operation.operation.value!.reconcile(() => { read.state.data = null; return true }, () => currentRead() && sentId === id.value && revision === read.auth.value.sessionRevision)
    }
    return adopted
  }
  watch([read.canRead, () => read.auth.value.sessionRevision, () => route.fullPath], () => { if (read.canRead.value && !verifying) void load() }, { immediate: true })
  async function verify(permit: () => boolean = () => true): Promise<boolean> {
    if (operation.state.value.loading) return false
    const currentRead = operation.operation.value!.captureRead(), path = route.fullPath
    const fresh = () => currentRead() && permit()
    verifying = true
    try {
      const candidate = await useAuth().session.candidate()
      if (!fresh() || path !== route.fullPath || !candidate.isCurrent()) return false
      if (candidate.result.kind !== 'success') {
        const failure = candidate.result
        await read.reader.read(async () => failure, true, undefined, 'dialog', fresh); return false
      }
      if (!candidate.adopt()) return false
      // The authorized identity adoption intentionally clears the old read context.
      // A new Form ticket still checks path, Session and the original write revision.
      const adopted = await load(true, () => currentRead() && path === route.fullPath)
      return adopted && currentRead() && path === route.fullPath && owner.value
    } finally { verifying = false }
  }
  return { ...read, owner, operation, verify, refresh: async (permit?: () => boolean) => { await load(true, permit) } }
}
