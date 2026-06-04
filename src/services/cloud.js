import Taro from '@tarojs/taro'

export function isCloudReady() {
  if (process.env.TARO_ENV !== 'weapp') return false
  return Boolean(Taro.cloud || globalThis.wx?.cloud)
}

export async function callCloudFunction(name, data = {}) {
  if (!isCloudReady()) {
    throw new Error('云开发仅在微信小程序环境可用')
  }

  const cloud = Taro.cloud || globalThis.wx.cloud
  const res = await cloud.callFunction({
    name,
    data
  })

  return res.result
}

export function loginByCloud() {
  return callCloudFunction('login')
}

export function updateUserProfileByCloud(profile) {
  return callCloudFunction('updateUserProfile', profile)
}

export function getGrowthSummaryByCloud(data) {
  return callCloudFunction('getGrowthSummary', data)
}

export function addPracticeRecordByCloud(data) {
  return callCloudFunction('addPracticeRecord', data)
}

export function getDailyQuestionByCloud(data) {
  return callCloudFunction('getDailyQuestion', data)
}

export function addLabRecordByCloud(data) {
  return callCloudFunction('addLabRecord', data)
}

export async function uploadCloudFile(cloudPath, filePath) {
  if (!isCloudReady()) {
    throw new Error('云开发仅在微信小程序环境可用')
  }

  const cloud = Taro.cloud || globalThis.wx.cloud
  const res = await cloud.uploadFile({
    cloudPath,
    filePath
  })

  return res.fileID
}
