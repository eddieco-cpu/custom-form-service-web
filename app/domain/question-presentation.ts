import type { AnswerQuestion } from './answer'
import type { ConfigByType } from './api/form'
import { validateConfig } from './definition-validation'

// Use the same parsed limits as answer validation, including exact numeric bounds.
export function answerRules(question: Pick<AnswerQuestion, 'key' | 'type' | 'config'>): string[] {
  const parsed = validateConfig(question.type, question.config, question.key)
  if (parsed.kind === 'invalid') return ['作答限制設定有誤，請先檢查題目設定。']
  const rules: string[] = []
  switch (question.type) {
    case 'text': {
      const config = parsed.candidate as ConfigByType['text']
      const limits = [config.minLength === undefined ? '' : `至少 ${config.minLength} 字`, config.maxLength === undefined ? '' : `最多 ${config.maxLength} 字`].filter(Boolean)
      rules.push(limits.length ? `文字長度：${limits.join('，')}。` : '文字長度不限。')
      if (config.placeholder) rules.push(`輸入提示：${config.placeholder}`)
      break
    }
    case 'number': {
      const config = parsed.candidate as ConfigByType['number']
      const limits = [config.min === undefined ? '' : `最小值 ${config.min}`, config.max === undefined ? '' : `最大值 ${config.max}`].filter(Boolean)
      rules.push(limits.length ? `數值範圍：${limits.join('，')}（包含邊界值）。` : '數值範圍不限。')
      if (config.placeholder) rules.push(`輸入提示：${config.placeholder}`)
      break
    }
    case 'single_choice': rules.push('單選：請選擇一個選項。'); break
    case 'multiple_choice': rules.push('多選：可選擇多個選項。'); break
    case 'rating': {
      const config = parsed.candidate as ConfigByType['rating']
      if (config.min !== undefined && config.max !== undefined) rules.push(`評分範圍：${config.min}～${config.max} 分，請選擇整數分數。`)
      break
    }
  }
  return rules
}
