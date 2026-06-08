const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const categories = db.collection('question_categories')
const questions = db.collection('questions')
const assets = db.collection('question_assets')

function normalizeId(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

function normalizeQuestion(item) {
  const id = normalizeId(item._id || item.id)
  const title = item.title || item.question || ''
  const categoryId = item.categoryId || item.category || ''
  return {
    id,
    title,
    question: title,
    categoryId,
    category: categoryId,
    categoryName: item.categoryName || '',
    difficulty: item.difficulty || 'medium',
    tags: Array.isArray(item.tags) ? item.tags : [],
    summary: item.summary || '',
    answer: item.answer || item.answerMarkdown || '',
    answerMarkdown: item.answerMarkdown || '',
    diagramType: item.diagramType || '',
    assetIds: Array.isArray(item.assetIds) ? item.assetIds : [],
    assets: Array.isArray(item.assets) ? item.assets : [],
    version: item.version || 1,
    sort: item.sort || 0,
    updatedAt: item.updatedAt || '',
    publishedAt: item.publishedAt || ''
  }
}

async function getCategories() {
  const result = await categories
    .where({ status: 'published' })
    .orderBy('sort', 'asc')
    .limit(100)
    .get()

  return result.data.map(item => ({
    id: item._id || item.id,
    name: item.name,
    shortName: item.shortName || '',
    description: item.description || '',
    icon: item.icon || '',
    themeColor: item.themeColor || '',
    group: item.group || '',
    level: item.level || '',
    sort: item.sort || 0,
    questionCount: item.questionCount || 0,
    updatedAt: item.updatedAt || ''
  }))
}

async function getList(event) {
  const page = Math.max(Number(event.page || 1), 1)
  const pageSize = Math.min(Math.max(Number(event.pageSize || 20), 1), 100)
  const skip = (page - 1) * pageSize
  const categoryId = event.categoryId || event.category || ''
  const difficulty = event.difficulty || ''
  const tag = event.tag || ''
  const keyword = String(event.keyword || '').trim()

  const where = { status: 'published' }
  if (categoryId && categoryId !== 'random') where.categoryId = categoryId
  if (difficulty) where.difficulty = difficulty
  if (tag) where.tags = _.in([tag])
  if (keyword) {
    where.searchText = db.RegExp({
      regexp: keyword,
      options: 'i'
    })
  }

  const countResult = await questions.where(where).count()
  const result = await questions
    .where(where)
    .orderBy('sort', 'asc')
    .orderBy('updatedAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .field({
      answer: false,
      answerMarkdown: false
    })
    .get()

  return {
    list: result.data.map(normalizeQuestion),
    page,
    pageSize,
    total: countResult.total,
    hasMore: skip + pageSize < countResult.total,
    source: 'cloud'
  }
}

async function getDetail(event) {
  const id = normalizeId(event.id)
  let result

  try {
    const docResult = await questions.doc(id).get()
    result = { data: docResult.data ? [docResult.data] : [] }
  } catch (error) {
    const legacyId = Number(id)
    const query = Number.isFinite(legacyId)
      ? _.or([{ id }, { legacyId }])
      : _.or([{ id }, { legacyId: id }])

    result = await questions
      .where(query)
      .limit(1)
      .get()
  }

  if (!result.data.length) {
    return null
  }

  if (result.data[0].status !== 'published') {
    return null
  }

  const question = normalizeQuestion(result.data[0])
  if (!question.assetIds.length) return question

  const assetResult = await assets
    .where({ _id: _.in(question.assetIds) })
    .limit(50)
    .get()

  return {
    ...question,
    assets: assetResult.data.map(item => ({
      id: item._id,
      type: item.type || 'image',
      url: item.url || item.fileID || '',
      httpsUrl: item.httpsUrl || '',
      alt: item.alt || '',
      width: item.width || 0,
      height: item.height || 0
    }))
  }
}

async function getMeta() {
  const categoryCount = await categories.where({ status: 'published' }).count()
  const questionCount = await questions.where({ status: 'published' }).count()
  const latest = await questions
    .where({ status: 'published' })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  const updatedAt = latest.data[0]?.updatedAt || ''
  return {
    version: updatedAt || `published-${questionCount.total}`,
    updatedAt,
    categoryCount: categoryCount.total,
    questionCount: questionCount.total
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'list'

  try {
    if (action === 'categories') {
      return { success: true, data: await getCategories() }
    }

    if (action === 'list' || action === 'search') {
      return { success: true, data: await getList(event) }
    }

    if (action === 'detail') {
      const detail = await getDetail(event)
      if (!detail) {
        return { success: false, message: '题目不存在或未发布' }
      }
      return { success: true, data: detail }
    }

    if (action === 'meta') {
      return { success: true, data: await getMeta() }
    }

    return { success: false, message: `未知题库动作：${action}` }
  } catch (error) {
    return {
      success: false,
      message: error.message || '题库云函数执行失败'
    }
  }
}
