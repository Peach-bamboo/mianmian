const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const labRecords = db.collection('lab_records')

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid，请从小程序端调用 addLabRecord 云函数'
    }
  }

  const labKey = String(event.labKey || '')
  const labName = String(event.labName || '')
  const action = String(event.action || 'view')
  const duration = Number(event.duration || 0)

  if (!labKey || !labName) {
    return {
      success: false,
      message: 'labKey 和 labName 不能为空'
    }
  }

  await labRecords.add({
    data: {
      openid,
      labKey,
      labName,
      action,
      duration: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
      createdAt: db.serverDate()
    }
  })

  return {
    success: true
  }
}
