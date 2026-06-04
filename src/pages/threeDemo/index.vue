<template>
  <view class="lab-page">
    <CosmosHeadbar
      title="可视化实验室"
      subtitle="把抽象知识变成可拖拽、可观察的动态实验"
      :meta="`${experiments.length} 实验`"
      :top-offset="16"
    />

    <view class="lab-content">
      <view class="preview-card">
        <view class="preview-head">
          <text class="preview-title">Three.js 旋转星球</text>
          <text class="preview-status">{{ statusText }}</text>
        </view>
        <view class="canvas-shell">
          <canvas
            id="three-demo-canvas"
            type="webgl"
            class="preview-canvas"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @touchcancel="handleTouchEnd"
          />
        </view>
        <text class="preview-tip">左右拖动可改变自转速度</text>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">实验项目</text>
          <text class="panel-meta">点击进入</text>
        </view>
        <view
          v-for="experiment in experiments"
          :key="experiment.key"
          class="experiment-item"
          @tap="goExperiment(experiment.key)"
        >
          <view class="experiment-copy">
            <text class="experiment-name">{{ experiment.name }}</text>
            <text class="experiment-desc">{{ experiment.desc }}</text>
          </view>
          <text class="experiment-arrow">›</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">最近实验记录</text>
          <text class="panel-meta">{{ history.length }} 条</text>
        </view>
        <view v-if="history.length">
          <view v-for="item in history" :key="item.time" class="history-item">
            <text class="history-name">{{ item.name }}</text>
            <text class="history-time">{{ item.time }}</text>
          </view>
        </view>
        <view v-else class="history-empty">
          <text>还没有实验记录，先进入一次实验吧</text>
        </view>
      </view>
    </view>

    <Tabbar active-key="lab" />
  </view>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import Taro from '@tarojs/taro'
import { createScopedThreejs } from 'threejs-miniprogram'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import Tabbar from '../../components/Tabbar.vue'
import { addLabRecordByCloud } from '../../services/cloud'

const statusText = ref('等待启动')
const history = ref([])
const enterTime = Date.now()

const experiments = [
  { key: 'planet', name: '旋转星球', desc: '观察自转、光照与拖拽惯性' },
  { key: 'event-loop', name: '事件循环', desc: '模拟任务队列与执行顺序' },
  { key: 'sort3d', name: '3D 排序可视化', desc: '用轨迹对比排序过程' }
]

let THREE
let canvas
let renderer
let scene
let camera
let planetGroup
let ring
let animationFrameId = 0
let lastTouchX = 0
let dragVelocity = 0
let isDragging = false

function getLabHistory() {
  const stored = Taro.getStorageSync('lab_history')
  return Array.isArray(stored) ? stored : []
}

function pushLabHistory(name) {
  const now = new Date()
  const line = {
    name,
    time: `${now.getMonth() + 1}-${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
  const next = [line, ...getLabHistory()].slice(0, 6)
  Taro.setStorageSync('lab_history', next)
  history.value = next
}

async function recordLabAction(labKey, labName, action = 'view', duration = 0) {
  try {
    await addLabRecordByCloud({
      labKey,
      labName,
      action,
      duration
    })
  } catch (error) {
    console.log('实验记录同步失败', error)
  }
}

function goExperiment(key) {
  const target = experiments.find(item => item.key === key)
  if (target) {
    pushLabHistory(target.name)
    recordLabAction(target.key, target.name, 'enter')
  }
  if (key !== 'planet') {
    Taro.showToast({ title: '实验脚手架已就绪', icon: 'none' })
    return
  }
  Taro.showToast({ title: '上方预览区已运行', icon: 'none' })
}

function queryCanvasNode() {
  return new Promise((resolve, reject) => {
    const query = Taro.createSelectorQuery()
    query.select('#three-demo-canvas').node()
    query.select('.canvas-shell').boundingClientRect()
    query.exec((res) => {
      const node = res?.[0]?.node
      const rect = res?.[1]
      if (!node || !rect?.width || !rect?.height) {
        reject(new Error('未获取到实验画布节点'))
        return
      }
      resolve({ node, rect })
    })
  })
}

function initScene(rect) {
  THREE = createScopedThreejs(canvas)
  const pixelRatio = Taro.getSystemInfoSync().pixelRatio || 1
  const width = rect.width
  const height = rect.height

  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060b1f)

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(0, 0.1, 4.6)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height)

  scene.add(new THREE.AmbientLight(0x6f8cff, 0.6))
  const pointLight = new THREE.PointLight(0x8fe7ff, 1.2, 20)
  pointLight.position.set(3, 4, 5)
  scene.add(pointLight)

  planetGroup = new THREE.Group()
  scene.add(planetGroup)

  const planetGeometry = new THREE.SphereGeometry(0.85, 48, 48)
  const planetMaterial = new THREE.MeshPhongMaterial({
    color: 0x39d0ff,
    emissive: 0x102a66,
    shininess: 80
  })
  planetGroup.add(new THREE.Mesh(planetGeometry, planetMaterial))

  const gridGeometry = new THREE.SphereGeometry(0.856, 24, 16)
  const gridMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9f7ff,
    transparent: true,
    opacity: 0.26,
    wireframe: true
  })
  planetGroup.add(new THREE.Mesh(gridGeometry, gridMaterial))

  ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.02, 16, 120),
    new THREE.MeshBasicMaterial({ color: 0x9cf2ff, transparent: true, opacity: 0.78 })
  )
  ring.rotation.x = Math.PI * 0.62
  planetGroup.add(ring)

  const starGeometry = new THREE.Geometry()
  for (let i = 0; i < 90; i += 1) {
    starGeometry.vertices.push(new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12
    ))
  }
  scene.add(new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.85 })
  ))

  statusText.value = '运行中'
  renderLoop()
}

function renderLoop() {
  animationFrameId = canvas.requestAnimationFrame(renderLoop)
  if (planetGroup) {
    planetGroup.rotation.y += 0.008 + dragVelocity
    planetGroup.rotation.x += 0.0018
  }
  if (ring) {
    ring.rotation.z += 0.005
  }
  dragVelocity *= isDragging ? 0.985 : 0.93
  renderer.render(scene, camera)
}

function stopScene() {
  if (canvas && animationFrameId) {
    canvas.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }
  if (renderer) renderer.dispose()
  THREE = null
  canvas = null
  renderer = null
  scene = null
  camera = null
  planetGroup = null
  ring = null
}

function getTouchX(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0]
  return touch?.clientX ?? touch?.pageX ?? touch?.x ?? 0
}

function handleTouchStart(event) {
  isDragging = true
  lastTouchX = getTouchX(event)
}

function handleTouchMove(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  const currentX = getTouchX(event)
  const delta = currentX - lastTouchX
  dragVelocity = Math.max(-0.08, Math.min(0.08, delta * 0.006))
  lastTouchX = currentX
}

function handleTouchEnd() {
  isDragging = false
}

onMounted(async () => {
  history.value = getLabHistory()
  recordLabAction('lab-home', '可视化实验室', 'view')
  if (process.env.TARO_ENV !== 'weapp') {
    statusText.value = '请在小程序端运行'
    return
  }

  try {
    await nextTick()
    const result = await queryCanvasNode()
    canvas = result.node
    initScene(result.rect)
  } catch (error) {
    statusText.value = '初始化失败'
    console.error(error)
  }
})

onUnmounted(() => {
  recordLabAction('lab-home', '可视化实验室', 'leave', (Date.now() - enterTime) / 1000)
  stopScene()
})
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.lab-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #101a35 0%, #070b18 100%);
  color: #f5f8ff;
}

.lab-content {
  padding: 0 fig(23) calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.preview-card,
.panel {
  margin-top: fig(12);
  padding: fig(14);
  border-radius: fig(16);
  border: 1px solid rgba(33, 58, 105, 0.8);
  background: #101a2f;
  box-sizing: border-box;
}

.preview-head,
.panel-head,
.experiment-item,
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-title,
.preview-status,
.preview-tip,
.panel-title,
.panel-meta,
.experiment-name,
.experiment-desc,
.history-name,
.history-time,
.history-empty text {
  display: block;
}

.preview-title {
  color: #eaf3ff;
  font-size: fig(14);
  font-weight: 700;
  line-height: fig(20);
}

.preview-status {
  color: #45d39d;
  font-size: fig(11);
  line-height: fig(16);
}

.canvas-shell {
  margin-top: fig(10);
  width: 100%;
  height: fig(210);
  border-radius: fig(14);
  overflow: hidden;
  border: 1px solid rgba(56, 87, 145, 0.7);
}

.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-tip {
  margin-top: fig(8);
  color: #8ea1ca;
  font-size: fig(11);
  line-height: fig(16);
}

.panel-title {
  color: #e7f1ff;
  font-size: fig(14);
  font-weight: 700;
  line-height: fig(20);
}

.panel-meta {
  color: #7e93be;
  font-size: fig(11);
  line-height: fig(16);
}

.experiment-item {
  margin-top: fig(10);
  padding: fig(10) fig(10);
  border-radius: fig(12);
  background: #111f39;
}

.experiment-copy {
  min-width: 0;
}

.experiment-name {
  color: #dce9ff;
  font-size: fig(13);
  font-weight: 600;
  line-height: fig(18);
}

.experiment-desc {
  margin-top: fig(4);
  color: #849bc8;
  font-size: fig(11);
  line-height: fig(16);
}

.experiment-arrow {
  color: #6f84b0;
  font-size: fig(17);
}

.history-item {
  margin-top: fig(10);
  padding-top: fig(8);
  border-top: 1px solid rgba(45, 68, 109, 0.62);
}

.history-name {
  color: #cfe0ff;
  font-size: fig(12);
  line-height: fig(17);
}

.history-time {
  color: #7f95c1;
  font-size: fig(11);
  line-height: fig(16);
}

.history-empty {
  margin-top: fig(10);
  padding: fig(12);
  border-radius: fig(12);
  background: #111f39;
  text-align: center;
}

.history-empty text {
  color: #8ea1ca;
  font-size: fig(12);
  line-height: fig(18);
}
</style>
