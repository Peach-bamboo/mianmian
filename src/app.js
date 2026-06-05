import { createApp } from 'vue'
import Taro from '@tarojs/taro'
import './app.scss'

const CLOUD_ENV_ID = 'cloudbase-6gdlm2mh02471f6b'

function initCloud() {
  if (process.env.TARO_ENV !== 'weapp') return

  const cloud = Taro.cloud || globalThis.wx?.cloud
  if (!cloud) return

  cloud.init({
    env: CLOUD_ENV_ID,
    traceUser: true
  })
}

const App = createApp({
  onLaunch () {
    initCloud()
  },
  onShow (options) {},
  // 入口组件不需要实现 render 方法，即使实现了也会被 taro 所覆盖
})

export default App
