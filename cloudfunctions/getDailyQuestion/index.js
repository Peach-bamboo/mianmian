const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const dailyQuestions = db.collection('daily_questions')

function getChinaDateText(date) {
  const chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const year = chinaDate.getUTCFullYear()
  const month = String(chinaDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(chinaDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeQuestionIds(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(id => String(id || '').trim())
    .filter(Boolean)
}

function pickQuestionId(questionIds, openid, dateText) {
  const seedText = `${openid}_${dateText}`
  let hash = 0
  for (let i = 0; i < seedText.length; i += 1) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0
  }
  return questionIds[hash % questionIds.length]
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()
  const date = getChinaDateText(new Date())

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 getDailyQuestion 云函数'
    }
  }

  const existed = await dailyQuestions.where({ openid, date }).limit(1).get()
  if (existed.data.length) {
    const record = existed.data[0]
    return {
      success: true,
      date,
      questionId: record.questionId,
      isNew: false
    }
  }

  const questionIds = normalizeQuestionIds(event.questionIds)
  if (!questionIds.length) {
    return {
      success: false,
      message: 'questionIds 不能为空'
    }
  }

  const questionId = pickQuestionId(questionIds, openid, date)
  await dailyQuestions.add({
    data: {
      openid,
      date,
      questionId,
      createdAt: now
    }
  })

  return {
    success: true,
    date,
    questionId,
    isNew: true
  }
}
