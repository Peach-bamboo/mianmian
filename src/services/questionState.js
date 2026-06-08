import Taro from '@tarojs/taro'
import { callCloudFunction } from './cloud'
import { getFallbackQuestions } from './questionBank'

export function loadLocalQuestions() {
  return getFallbackQuestions()
}

export function mergeQuestionStates(questions, states = []) {
  const stateMap = new Map(states.map(item => [String(item.questionId), item]))
  return questions.map((question) => {
    const state = stateMap.get(String(question.id))
    if (!state) return question

    return {
      ...question,
      isFavorited: state.isFavorited,
      mastery: state.mastery || ''
    }
  })
}

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
