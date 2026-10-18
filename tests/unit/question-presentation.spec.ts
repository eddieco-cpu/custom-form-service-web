import { describe, expect, it } from 'vitest'
import { answerRules } from '../../app/domain/question-presentation'
import type { AnswerQuestion } from '../../app/domain/answer'

const rules = (type: AnswerQuestion['type'], config: AnswerQuestion['config'] = {}) => answerRules({ key: 'q', type, config })

describe('visible answer rules', () => {
  it('shows zero length limits and keeps the input hint visible', () => {
    expect(rules('text', { minLength: '0', maxLength: '20', placeholder: '  請輸入名稱  ' })).toEqual(['文字長度：至少 0 字，最多 20 字。', '輸入提示：請輸入名稱'])
  })
  it('does not invent omitted or blank limits', () => {
    expect(rules('text', { minLength: '', maxLength: '5' })).toEqual(['文字長度：最多 5 字。'])
    expect(rules('text')).toEqual(['文字長度不限。'])
    expect(rules('number')).toEqual(['數值範圍不限。'])
  })
  it('preserves exact large and fractional bounds without Number conversion', () => {
    const max = '9007199254740993.1234567890123456789'
    expect(rules('number', { min: '0', max })).toEqual([`數值範圍：最小值 0，最大值 ${max}（包含邊界值）。`])
    expect(rules('number', { min: '-0.0000000000000000001' })).toEqual(['數值範圍：最小值 -0.0000000000000000001（包含邊界值）。'])
  })
  it('shows zero as a real rating bound and requires integer scores', () => {
    expect(rules('rating', { min: '0', max: '100' })).toEqual(['評分範圍：0～100 分，請選擇整數分數。'])
    expect(rules('rating', { min: '' })).toEqual([])
  })
  it('explains single and multiple choice without inventing selection limits', () => {
    expect(rules('single_choice')).toEqual(['單選：請選擇一個選項。'])
    expect(rules('multiple_choice')).toEqual(['多選：可選擇多個選項。'])
  })
  it('does not show invalid preview limits as accepted rules', () => {
    expect(rules('text', { minLength: '10', maxLength: '2' })).toEqual(['作答限制設定有誤，請先檢查題目設定。'])
    expect(rules('number', { min: 'oops' })).toEqual(['作答限制設定有誤，請先檢查題目設定。'])
  })
})
