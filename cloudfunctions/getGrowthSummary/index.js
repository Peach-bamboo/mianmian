const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const questionStates = db.collection('user_question_states')
const practiceRecords = db.collection('practice_records')
const dailyQuestions = db.collection('daily_questions')
const labRecords = db.collection('lab_records')

function getChinaDateParts(date) {
  const chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return {
    year: chinaDate.getUTCFullYear(),
    month: chinaDate.getUTCMonth(),
    day: chinaDate.getUTCDate()
  }
}

function getChinaDateText(date) {
  const parts = getChinaDateParts(date)
  const month = String(parts.month + 1).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return `${parts.year}-${month}-${day}`
}

function getChinaDayStartUtc(date) {
  const parts = getChinaDateParts(date)
  return new Date(Date.UTC(parts.year, parts.month, parts.day) - 8 * 60 * 60 * 1000)
}

function getDailyStatus(records) {
  if (!records.length) return 'not_started'
  const hasCompleted = records.some(item => ['answer', 'mastered', 'retry'].includes(item.action))
  if (hasCompleted) return 'completed'
  return 'viewed'
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 getGrowthSummary 云函数'
    }
  }

  const totalsByCategory = event.totalsByCategory || {}

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const todayText = getChinaDateText(new Date())
  const todayStart = getChinaDayStartUtc(new Date())

  const [userResult, stateResult, recentPracticeResult, weeklyPracticeResult, dailyResult, dailyPracticeResult, labRecordResult] = await Promise.all([
    users.where({ openid }).limit(1).get(),
    questionStates.where({ openid }).limit(1000).get(),
    practiceRecords.where({ openid }).orderBy('createdAt', 'desc').limit(10).get(),
    practiceRecords.where({
      openid,
      createdAt: _.gte(sevenDaysAgo)
    }).limit(1000).get(),
    dailyQuestions.where({ openid, date: todayText }).limit(1).get(),
    practiceRecords.where({
      openid,
      mode: 'daily',
      createdAt: _.gte(todayStart)
    }).limit(100).get(),
    labRecords.where({ openid }).orderBy('createdAt', 'desc').limit(5).get()
  ])

  const user = userResult.data[0] || {}
  const states = stateResult.data || []
  const masteredCount = states.filter(item => item.mastery === 'mastered').length
  const retryCount = states.filter(item => item.mastery === 'retry').length
  const favoritedCount = states.filter(item => item.isFavorited).length
  const learnedCount = masteredCount + retryCount
  const reviewRate = learnedCount ? `${Math.round((masteredCount / learnedCount) * 100)}%` : '0%'
  const recentRecords = (recentPracticeResult.data || []).map(item => ({
    mode: item.mode || 'module',
    questionId: item.questionId,
    category: item.category || '',
    action: item.action || 'view',
    createdAt: item.createdAt
  }))
  const weeklySolved = new Set(
    (weeklyPracticeResult.data || [])
      .map(item => item.questionId)
      .filter(Boolean)
  ).size
  const dailyRecord = dailyResult.data?.[0] || null
  const dailyPracticeRecords = dailyPracticeResult.data || []
  const dailyChallenge = {
    date: todayText,
    questionId: dailyRecord?.questionId || null,
    status: dailyRecord ? getDailyStatus(dailyPracticeRecords) : 'unclaimed',
    recordCount: dailyPracticeRecords.length
  }
  const recentLabRecords = (labRecordResult.data || []).map(item => ({
    labKey: item.labKey || '',
    labName: item.labName || '',
    action: item.action || 'view',
    duration: item.duration || 0,
    createdAt: item.createdAt
  }))

  const categoryMap = new Map()
  for (const state of states) {
    const category = state.category || 'unknown'
    const item = categoryMap.get(category) || {
      category,
      mastered: 0,
      retry: 0,
      favorited: 0,
      total: Number(totalsByCategory[category] || 0)
    }
    if (state.mastery === 'mastered') item.mastered += 1
    if (state.mastery === 'retry') item.retry += 1
    if (state.isFavorited) item.favorited += 1
    categoryMap.set(category, item)
  }

  const moduleProgress = Object.keys(totalsByCategory).map((category) => {
    const item = categoryMap.get(category) || {
      category,
      mastered: 0,
      retry: 0,
      favorited: 0,
      total: Number(totalsByCategory[category] || 0)
    }
    return {
      ...item,
      percent: item.total ? Math.round((item.mastered / item.total) * 100) : 0
    }
  })

  return {
    success: true,
    user: {
      nickname: user.nickname || '微信用户',
      avatarUrl: user.avatarUrl || '',
      level: user.level || Math.max(1, Math.min(9, Math.ceil(learnedCount / 5))),
      continuousDays: user.continuousDays || 0,
      lastStudyDate: user.lastStudyDate || ''
    },
    summary: {
      masteredCount,
      retryCount,
      favoritedCount,
      reviewRate,
      weeklySolved
    },
    moduleProgress,
    recentRecords,
    dailyChallenge,
    recentLabRecords
  }
}
