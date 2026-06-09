import Taro from '@tarojs/taro'
import { callCloudFunction } from './cloud'
import { getFallbackQuestions } from './questionBank'
import questionBankCore from '../domain/questionBankCore.cjs'

const { mergeQuestionStates } = questionBankCore

export function loadLocalQuestions() {
  return getFallbackQuestions()
}

export { mergeQuestionStates }

export async function syncCloudQuestionStates() {
  const questions = loadLocalQuestions()
  const result = await callCloudFunction('getQuestionStates')
  const merged = mergeQuestionStates(questions, result?.states || [])
  Taro.setStorageSync('questions', merged)
  return merged
}

export function toggleFavoriteByCloud(question) {
  return callCloudFunction('toggleFavorite', {
    questionId: question.id,
    category: question.category,
    isFavorited: Boolean(question.isFavorited)
  })
}

export function updateMasteryByCloud(question) {
  return callCloudFunction('updateMastery', {
    questionId: question.id,
    category: question.category,
    mastery: question.mastery || ''
  })
}
