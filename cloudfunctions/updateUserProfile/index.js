const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const users = db.collection('users')

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = db.serverDate()

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 updateUserProfile 云函数'
    }
  }

  const hasNickname = Object.prototype.hasOwnProperty.call(event, 'nickname')
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(event, 'avatarUrl')
  const nickname = String(event.nickname || '').trim()
  const avatarUrl = String(event.avatarUrl || '').trim()

  const existing = await users
    .where({ openid })
    .limit(1)
    .get()

  const existingUser = existing.data[0] || {}
  const nextUser = {
    nickname: hasNickname ? nickname : (existingUser.nickname || '微信用户'),
    avatarUrl: hasAvatarUrl ? avatarUrl : (existingUser.avatarUrl || ''),
    level: existingUser.level || 1,
    continuousDays: existingUser.continuousDays || 0,
    lastStudyDate: existingUser.lastStudyDate || ''
  }

  const data = {
    updatedAt: now
  }
  if (hasNickname) data.nickname = nextUser.nickname
  if (hasAvatarUrl) data.avatarUrl = nextUser.avatarUrl

  if (existing.data.length) {
    await users.doc(existing.data[0]._id).update({ data })
  } else {
    await users.add({
      data: {
        openid,
        nickname: nextUser.nickname,
        avatarUrl: nextUser.avatarUrl,
        level: nextUser.level,
        continuousDays: nextUser.continuousDays,
        lastStudyDate: nextUser.lastStudyDate,
        createdAt: now,
        updatedAt: now
      }
    })
  }

  return {
    success: true,
    user: {
      nickname: nextUser.nickname,
      avatarUrl: nextUser.avatarUrl,
      level: nextUser.level,
      continuousDays: nextUser.continuousDays,
      lastStudyDate: nextUser.lastStudyDate
    }
  }
}
