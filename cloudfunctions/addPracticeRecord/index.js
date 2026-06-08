const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const users = db.collection('users')
const practiceRecords = db.collection('practice_records')

function getChinaDateText(date) {
  const chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const year = chinaDate.getUTCFullYear()
  const month = String(chinaDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(chinaDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getYesterdayText(date) {
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000)
  return getChinaDateText(yesterday)
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()
  const localNow = new Date()

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 addPracticeRecord 云函数'
    }
  }

  const questionId = String(event.questionId || '').trim()
  const mode = String(event.mode || 'module')
  const category = String(event.category || '')
  const action = String(event.action || 'view')

  if (!questionId) {
    return {
      success: false,
      message: 'questionId 无效'
    }
  }

  await practiceRecords.add({
    data: {
      openid,
      mode,
      questionId,
      category,
      action,
      createdAt: now
    }
  })

  const userResult = await users.where({ openid }).limit(1).get()
  const today = getChinaDateText(localNow)
  const yesterday = getYesterdayText(localNow)

  if (userResult.data.length) {
    const user = userResult.data[0]
    const nextContinuousDays =
      user.lastStudyDate === today
        ? user.continuousDays || 0
        : user.lastStudyDate === yesterday
          ? (user.continuousDays || 0) + 1
          : 1

    await users.doc(user._id).update({
      data: {
        continuousDays: nextContinuousDays,
        lastStudyDate: today,
        updatedAt: now
      }
    })
  } else {
    await users.add({
      data: {
        openid,
        nickname: '微信用户',
        avatarUrl: '',
        level: 1,
        continuousDays: 1,
        lastStudyDate: today,
        createdAt: now,
        updatedAt: now
      }
    })
  }

  return {
    success: true
  }
}
