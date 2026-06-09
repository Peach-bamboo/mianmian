import Taro from '@tarojs/taro'
import fallbackQuestions from '../data/questions.json'
import { callCloudFunction } from './cloud'
import questionBankCore from '../domain/questionBankCore.cjs'

const {
  mergeStoredQuestionState,
  normalizeId,
  normalizeQuestion: normalizeQuestionCore,
  normalizeQuestions: normalizeQuestionsCore
} = questionBankCore

const CACHE_KEYS = {
  meta: 'question_bank_meta',
  metaVersion: 'question_bank_meta_version',
  categories: 'question_bank_categories',
  listPrefix: 'question_bank_list:',
  detailPrefix: 'question_bank_detail:'
}

const CATEGORY_META = [
  { id: 'html', name: 'HTML', shortName: 'H', group: 'base', description: '语义化、结构与浏览器基础', level: '结构与语义', themeColor: '#ff7146', gradient: 'radial-gradient(circle at 35% 30%, #ffd0b8 0%, #ff7146 48%, #7a1d12 100%)', sort: 10 },
  { id: 'css', name: 'CSS', shortName: 'C', group: 'base', description: '布局、动画、响应式与视觉样式', level: '布局与动画', themeColor: '#5da8ff', gradient: 'radial-gradient(circle at 35% 30%, #c7dcff 0%, #5da8ff 48%, #163672 100%)', sort: 20 },
  { id: 'js', name: 'JavaScript', shortName: 'JS', group: 'runtime', description: '闭包、原型、异步与语言机制', level: '核心恒星', themeColor: '#32d9ff', gradient: 'radial-gradient(circle at 35% 30%, #d8fbff 0%, #32d9ff 48%, #0b5172 100%)', sort: 30 },
  { id: 'vue', name: 'Vue', shortName: 'V', group: 'framework', description: '响应式、组件、diff 与生态工程', level: '响应式生态', themeColor: '#42f5b0', gradient: 'radial-gradient(circle at 35% 30%, #c9ffe4 0%, #42f5b0 48%, #0b6a4a 100%)', sort: 40 },
  { id: 'react', name: 'React', shortName: 'R', group: 'framework', description: 'Fiber、Hooks、状态与渲染模型', level: '组件模型', themeColor: '#66dcff', gradient: 'radial-gradient(circle at 35% 30%, #d5f7ff 0%, #66dcff 48%, #0a3d55 100%)', sort: 50 },
  { id: 'node', name: 'Node', shortName: 'N', group: 'runtime', description: '事件循环、模块系统与服务端基础', level: '运行时服务', themeColor: '#5de879', gradient: 'radial-gradient(circle at 35% 30%, #d3ffc7 0%, #5de879 48%, #104918 100%)', sort: 60 },
  { id: 'applet', name: '小程序', shortName: '微', group: 'advanced', description: '生命周期、跨端能力与工程限制', level: '跨端基地', themeColor: '#58ff7a', gradient: 'radial-gradient(circle at 35% 30%, #d6ffd4 0%, #58ff7a 48%, #0d4a1b 100%)', sort: 70 },
  { id: 'net', name: '网络', shortName: '网', group: 'advanced', description: 'HTTP、缓存、安全与性能边界', level: '协议星域', themeColor: '#ff9b4b', gradient: 'radial-gradient(circle at 35% 30%, #ffd4ac 0%, #ff9b4b 48%, #65300b 100%)', sort: 80 },
  { id: 'arithmetic', name: '算法', shortName: '算', group: 'advanced', description: '复杂度、数据结构与解题模型', level: '逻辑晶体', themeColor: '#ffc14d', gradient: 'radial-gradient(circle at 35% 30%, #ffe7a8 0%, #ffc14d 48%, #684000 100%)', sort: 90 }
]

const CATEGORY_LOOKUP = new Map(CATEGORY_META.map(item => [item.id, item]))

function safeGetStorage(key, fallback) {
  try {
    const value = Taro.getStorageSync(key)
    return value || fallback
  } catch (error) {
    return fallback
  }
}

function safeSetStorage(key, value) {
  try {
    Taro.setStorageSync(key, value)
  } catch (error) {
    console.warn('question bank cache write failed', key, error)
  }
}

function normalizeQuestion(raw = {}) {
  return normalizeQuestionCore(raw, CATEGORY_LOOKUP)
}

export function normalizeQuestions(questions = []) {
  return normalizeQuestionsCore(questions, CATEGORY_LOOKUP)
}

export function getFallbackQuestions() {
  const bundled = getBundledQuestions()
  const stored = safeGetStorage('questions', null)
  if (!Array.isArray(stored) || !stored.length) {
    return bundled
  }

  const storedQuestions = normalizeQuestions(stored)
  const storedMap = new Map(storedQuestions.map(item => [String(item.id), item]))
  const bundledMap = new Map(bundled.map(item => [String(item.id), item]))
  const merged = bundled.map(question => mergeStoredQuestionState(question, storedMap.get(String(question.id))))

  storedQuestions.forEach((question) => {
    if (!bundledMap.has(String(question.id))) {
      merged.push(question)
    }
  })

  return merged
}

export function getBundledQuestions() {
  return normalizeQuestions(fallbackQuestions)
}

export function getFallbackCategories() {
  const questions = getFallbackQuestions()
  return CATEGORY_META.map((category) => ({
    ...category,
    questionCount: questions.filter(question => question.category === category.id).length
  }))
}

function buildListCacheKey(params = {}) {
  const normalized = {
    categoryId: params.categoryId || params.category || '',
    keyword: params.keyword || '',
    difficulty: params.difficulty || '',
    tag: params.tag || '',
    page: params.page || 1,
    pageSize: params.pageSize || 100,
    randomCount: params.randomCount || ''
  }
  return `${CACHE_KEYS.listPrefix}${JSON.stringify(normalized)}`
}

function filterLocalQuestions(params = {}) {
  const categoryId = params.categoryId || params.category || ''
  const keyword = String(params.keyword || '').trim().toLowerCase()
  const difficulty = params.difficulty || ''
  const tag = params.tag || ''
  const page = Number(params.page || 1)
  const pageSize = Number(params.pageSize || 100)
  const start = (page - 1) * pageSize
  const source = getFallbackQuestions()

  const filtered = source.filter((question) => {
    const byCategory = !categoryId || categoryId === 'random' || question.category === categoryId
    const searchTarget = `${question.question} ${question.summary} ${question.tags.join(' ')}`.toLowerCase()
    const byKeyword = !keyword || searchTarget.includes(keyword)
    const byDifficulty = !difficulty || question.difficulty === difficulty
    const byTag = !tag || question.tags.includes(tag)
    return byCategory && byKeyword && byDifficulty && byTag
  })

  const list = categoryId === 'random'
    ? pickRandom(filtered, Number(params.randomCount || 10))
    : filtered.slice(start, start + pageSize)

  return {
    list,
    page,
    pageSize,
    total: filtered.length,
    hasMore: start + pageSize < filtered.length,
    source: 'fallback'
  }
}

function pickRandom(items, count) {
  const selected = []
  const used = new Set()
  while (selected.length < count && used.size < items.length) {
    const randomIndex = Math.floor(Math.random() * items.length)
    const item = items[randomIndex]
    if (!used.has(item.id)) {
      used.add(item.id)
      selected.push(item)
    }
  }
  return selected
}

async function callQuestionBank(action, data = {}) {
  const result = await callCloudFunction('getQuestionBank', { action, ...data })
  if (!result?.success) {
    throw new Error(result?.message || `题库云函数 ${action} 调用失败`)
  }
  return result.data
}

export async function getQuestionMeta() {
  const cached = safeGetStorage(CACHE_KEYS.meta, null)
  try {
    const meta = await callQuestionBank('meta')
    safeSetStorage(CACHE_KEYS.meta, meta)
    return meta
  } catch (error) {
    return cached || {
      version: 'fallback',
      updatedAt: '',
      categoryCount: getFallbackCategories().length,
      questionCount: getFallbackQuestions().length
    }
  }
}

function clearQuestionBankCaches() {
  try {
    const info = Taro.getStorageInfoSync()
    ;(info.keys || []).forEach((key) => {
      if (
        key === CACHE_KEYS.categories ||
        key.startsWith(CACHE_KEYS.listPrefix) ||
        key.startsWith(CACHE_KEYS.detailPrefix)
      ) {
        Taro.removeStorageSync(key)
      }
    })
  } catch (error) {
    console.warn('question bank cache clear failed', error)
  }
}

export async function refreshQuestionBankMeta() {
  const previousVersion = safeGetStorage(CACHE_KEYS.metaVersion, '')
  const meta = await getQuestionMeta()
  if (meta.version && previousVersion && meta.version !== previousVersion) {
    clearQuestionBankCaches()
  }
  if (meta.version) {
    safeSetStorage(CACHE_KEYS.metaVersion, meta.version)
  }
  return meta
}

export async function getCategoryList(options = {}) {
  const cached = safeGetStorage(CACHE_KEYS.categories, null)
  if (cached && !options.refresh) return cached

  try {
    const categories = await callQuestionBank('categories')
    const normalized = categories.map((item) => ({
      ...(CATEGORY_LOOKUP.get(item.id || item._id) || {}),
      ...item,
      id: item.id || item._id
    }))
    if (!normalized.length) {
      throw new Error('云端题库分类为空')
    }
    safeSetStorage(CACHE_KEYS.categories, normalized)
    return normalized
  } catch (error) {
    const fallback = cached || getFallbackCategories()
    safeSetStorage(CACHE_KEYS.categories, fallback)
    return fallback
  }
}

export async function getQuestionList(params = {}, options = {}) {
  const cacheKey = buildListCacheKey(params)
  const cached = safeGetStorage(cacheKey, null)
  if (cached && !options.refresh) return cached

  const categoryId = params.categoryId || params.category || ''

  try {
    const data = await callQuestionBank('list', params)
    const list = normalizeQuestions(data.list || [])
    const shouldFallbackWhenEmpty = !params.keyword && !params.difficulty && !params.tag
    if (!list.length && shouldFallbackWhenEmpty) {
      throw new Error('云端题目列表为空')
    }
    const normalizedList = categoryId === 'random'
      ? pickRandom(list, Number(params.randomCount || 10))
      : list
    const normalized = {
      ...data,
      list: normalizedList,
      total: categoryId === 'random' ? normalizedList.length : data.total,
      hasMore: categoryId === 'random' ? false : data.hasMore
    }
    safeSetStorage(cacheKey, normalized)
    return normalized
  } catch (error) {
    const fallback = cached || filterLocalQuestions(params)
    safeSetStorage(cacheKey, fallback)
    return fallback
  }
}

export async function getQuestionDetail(id) {
  const cacheKey = `${CACHE_KEYS.detailPrefix}${id}`
  const cached = safeGetStorage(cacheKey, null)
  if (cached?.answerMarkdown) return cached

  try {
    const data = await callQuestionBank('detail', { id })
    const detail = normalizeQuestion(data)
    safeSetStorage(cacheKey, detail)
    return detail
  } catch (error) {
    const fallback = getFallbackQuestions().find(question => question.id === normalizeId(id))
    if (fallback) {
      safeSetStorage(cacheKey, fallback)
      return fallback
    }
    throw error
  }
}

export function saveQuestionsToLegacyStorage(questions) {
  const normalized = normalizeQuestions(questions)
  safeSetStorage('questions', normalized)
  return normalized
}

export function getCategoryLabel(categoryId) {
  return CATEGORY_LOOKUP.get(categoryId)?.name || categoryId || '题库'
}

export { CATEGORY_META }
