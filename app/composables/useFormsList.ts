import { formService } from '../services/form'
import type { FormsQuery } from '../services/form'
import type { FormStatus, SummaryPageDto } from '../domain/api/form'
import { alignPage } from '../domain/form-read'

export function useFormsList() {
  const route = useRoute()
  const query = shallowRef<FormsQuery>({ page: 1 })
  const notice = ref('')
  const service = formService(useRuntimeConfig().public.apiBaseUrl)
  const read = useFormRead<SummaryPageDto>(() => `${route.fullPath}|${query.value.page}|${query.value.status ?? ''}`)
  async function load(manual = false, mayAlign = true, alignmentNotice = '', authPresentation = read.reader.captureAuthPresentation(manual)): Promise<void> {
    if (!read.canRead.value) return
    notice.value = alignmentNotice
    const sent = query.value
    await read.reader.read(signal => service.list(sent, signal), manual, async value => {
      const alignment = alignPage(value.pagination, mayAlign)
      if (alignment.reload) {
        // Carry this operation's presentation, never its previous query data.
        // External loads capture anew; every GET still owns a current ticket.
        query.value = { ...sent, page: alignment.page }
        await load(manual, false, `頁數已變更，已回到第 ${alignment.page} 頁。`, authPresentation)
        return
      }
      // Empty results normalize the UI to page 1 without another request.
      if (alignment.page !== sent.page) query.value = { ...sent, page: alignment.page }
      read.state.data = value
      if (alignment.exhausted) notice.value = '頁數再次變更，請按刷新取得最新資料。'
    }, authPresentation)
  }
  function filter(status: FormStatus | undefined) {
    if (status === query.value.status || read.state.dialog) return
    query.value = { page: 1, ...(status ? { status } : {}) }
    void load()
  }
  function page(value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value === query.value.page || read.state.dialog) return
    query.value = { ...query.value, page: value }; void load()
  }
  watch([read.canRead, () => read.auth.value.sessionRevision, () => route.fullPath], () => {
    notice.value = ''
    if (read.canRead.value) void load()
  }, { immediate: true })
  return { ...read, query, notice, filter, page, refresh: () => load(true) }
}
