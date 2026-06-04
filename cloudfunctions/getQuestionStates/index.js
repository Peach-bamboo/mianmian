const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const questionStates = db.collection('user_question_states')

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 getQuestionStates 云函数',
      states: []
    }
  }

  const result = await questionStates
    .where({ openid })
    .limit(1000)
    .get()

  return {
    success: true,
    states: result.data.map(item => ({
      questionId: item.questionId,
      category: item.category,
      isFavorited: Boolean(item.isFavorited),
      mastery: item.mastery || '',
      reviewCount: item.reviewCount || 0,
      lastReviewedAt: item.lastReviewedAt || null
    }))
  }
}
