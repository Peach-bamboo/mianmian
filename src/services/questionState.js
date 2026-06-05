import Taro from '@tarojs/taro'
import questionsData from '../data/questions.json'
import { callCloudFunction } from './cloud'

export function loadLocalQuestions() {
  const stored = Taro.getStorageSync('questions')
  if (Array.isArray(stored) && stored.length) return stored
  return questionsData
}

export function mergeQuestionStates(questions, states = []) {
  const stateMap = new Map(states.map(item => [item.questionId, item]))
  return questions.map((question) => {
    const state = stateMap.get(question.id)
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
