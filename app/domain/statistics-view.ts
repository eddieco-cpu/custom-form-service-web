import type { StatisticsDto } from './api/statistics'
import { modeLabels, visibilityLabels } from './form-read'
import { formatTaipei } from '../utils/datetime'
import { ExactNumber } from '../utils/exact-number'

const typeLabels = { text: '文字', number: '數字', single_choice: '單選', multiple_choice: '多選', rating: '評分' }
export function statisticsView(dto: StatisticsDto) {
  return {
    formId: dto.formId, title: dto.title, description: dto.description, creatorDisplayName: dto.creatorDisplayName,
    count: dto.count, mode: modeLabels[dto.responseMode], visibility: visibilityLabels[dto.resultVisibility],
    deadline: dto.submissionDeadlineAt === null ? '未設定' : formatTaipei(dto.submissionDeadlineAt),
    questions: dto.questions.map((question, index) => ({
      key: question.questionId, number: index + 1, title: question.title, description: question.description,
      type: typeLabels[question.type], count: question.count,
      items: question.statistics.map((item, position) => ({
        key: 'optionId' in item ? item.optionId : String(position),
        label: 'label' in item ? item.label : item.value instanceof ExactNumber ? item.value.token : String(item.value),
        count: item.count,
        ...(item.respondents === undefined ? {} : { respondents: item.respondents }),
      })),
    })),
  } as const
}
export type StatisticsView = ReturnType<typeof statisticsView>
export type StatisticsQuestionView = StatisticsView['questions'][number]
export type StatisticsItemView = StatisticsQuestionView['items'][number]
