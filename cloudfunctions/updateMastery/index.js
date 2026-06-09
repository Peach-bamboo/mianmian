const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const questionStates = db.collection('user_question_states')

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 updateMastery 云函数'
    }
  }

  const questionId = String(event.questionId || '').trim()
  const category = String(event.category || '')
  const mastery = event.mastery === 'mastered' || event.mastery === 'retry' ? event.mastery : ''

  if (!questionId) {
    return {
      success: false,
      message: 'questionId 无效'
    }
  }

  const questionIdCandidates = Number.isFinite(Number(questionId))
    ? [questionId, Number(questionId)]
    : [questionId]

  const existing = await questionStates
    .where({ openid, questionId: _.in(questionIdCandidates) })
    .limit(1)
    .get()

  if (existing.data.length) {
    await questionStates.doc(existing.data[0]._id).update({
      data: {
        questionId,
        category,
        mastery,
        reviewCount: _.inc(1),
        lastReviewedAt: now,
        updatedAt: now
      }
    })
  } else {
    await questionStates.add({
      data: {
        openid,
        questionId,
        category,
        isFavorited: false,
        mastery,
        reviewCount: 1,
        lastReviewedAt: now,
        createdAt: now,
        updatedAt: now
      }
    })
  }

  return {
    success: true,
    state: {
      questionId,
      category,
      mastery
    }
  }
}
