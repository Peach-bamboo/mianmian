const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const users = db.collection('users')

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 login 云函数测试'
    }
  }

  const existing = await users
    .where({ openid })
    .limit(1)
    .get()

  if (existing.data.length) {
    const user = existing.data[0]
    await users.doc(user._id).update({
      data: {
        updatedAt: now
      }
    })

    return {
      openid,
      user: {
        nickname: user.nickname || '微信用户',
        avatarUrl: user.avatarUrl || '',
        level: user.level || 1,
        continuousDays: user.continuousDays || 0,
        lastStudyDate: user.lastStudyDate || ''
      }
    }
  }

  const defaultUser = {
    openid,
    nickname: '微信用户',
    avatarUrl: '',
    level: 1,
    continuousDays: 0,
    lastStudyDate: '',
    createdAt: now,
    updatedAt: now
  }

  await users.add({
    data: defaultUser
  })

  return {
    openid,
    user: {
      nickname: defaultUser.nickname,
      avatarUrl: defaultUser.avatarUrl,
      level: defaultUser.level,
      continuousDays: defaultUser.continuousDays,
      lastStudyDate: defaultUser.lastStudyDate
    }
  }
}
