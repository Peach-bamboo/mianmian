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
          <text class="preview-title">{{ activeExperimentInfo.name }}</text>
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
        <text class="preview-tip">{{ previewTip }}</text>
      </view>

      <view v-if="activeExperiment === 'event-loop'" class="panel experiment-panel">
        <view class="panel-head">
          <text class="panel-title">事件循环模拟器</text>
          <text class="panel-meta">步骤 {{ eventStep }} / {{ eventTimeline.length }}</text>
        </view>
        <view class="queue-grid">
          <view
            v-for="queue in eventQueues"
            :key="queue.key"
            class="queue-card"
            :class="`queue-${queue.key}`"
          >
            <text class="queue-title">{{ queue.title }}</text>
            <text class="queue-desc">{{ queue.desc }}</text>
            <view class="task-list">
              <text
                v-for="task in queue.tasks"
                :key="task.label"
                class="task-chip"
                :class="{ active: task.active, done: task.done }"
              >{{ task.label }}</text>
            </view>
          </view>
        </view>
        <view class="control-row">
          <view class="control-button secondary" @tap="resetEventLoop">
            <text>重置</text>
          </view>
          <view class="control-button" @tap="stepEventLoop">
            <text>{{ eventStep >= eventTimeline.length ? '完成' : '下一步' }}</text>
          </view>
        </view>
        <view class="log-card">
          <text class="log-title">执行日志</text>
          <text v-for="line in eventLogs" :key="line" class="log-line">{{ line }}</text>
        </view>
      </view>

      <view v-if="activeExperiment === 'sort3d'" class="panel experiment-panel">
        <view class="panel-head">
          <text class="panel-title">3D 冒泡排序</text>
          <text class="panel-meta">步骤 {{ sortStepIndex }} / {{ sortSteps.length }}</text>
        </view>
        <view class="sort-value-row">
          <text
            v-for="(value, index) in sortValues"
            :key="`${index}-${value}`"
            class="sort-value"
            :class="{ active: sortCompare.includes(index), sorted: sortSorted.includes(index) }"
          >{{ value }}</text>
        </view>
        <text class="sort-desc">{{ sortDesc }}</text>
        <view class="control-row">
          <view class="control-button secondary" @tap="resetSort">
            <text>重置</text>
          </view>
          <view class="control-button" @tap="stepSort">
            <text>{{ sortStepIndex >= sortSteps.length ? '已完成' : '下一步' }}</text>
          </view>
        </view>
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
          :class="{ active: activeExperiment === experiment.key }"
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import Taro from '@tarojs/taro'
import { createScopedThreejs } from 'threejs-miniprogram'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import Tabbar from '../../components/Tabbar.vue'
import { addLabRecordByCloud } from '../../services/cloud'

const statusText = ref('等待启动')
const history = ref([])
const enterTime = Date.now()
const activeExperiment = ref('planet')

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
let labGroup
let planetGroup
let ring
let sortBars = []
let eventOrbitNodes = []
let animationFrameId = 0
let lastTouchX = 0
let dragVelocity = 0
let isDragging = false

const eventTimeline = [
  { queue: 'call', label: 'script()', log: '执行全局同步脚本，调用栈开始工作' },
  { queue: 'call', label: 'console.log', log: '同步任务立即执行，输出第一条日志' },
  { queue: 'micro', label: 'Promise.then', log: '调用栈清空后，优先清空微任务队列' },
  { queue: 'render', label: 'render', log: '微任务结束，浏览器进入一次渲染机会' },
  { queue: 'macro', label: 'setTimeout', log: '取出一个宏任务，进入下一轮事件循环' },
  { queue: 'micro', label: 'Promise in timeout', log: '宏任务内部产生的微任务继续优先执行' }
]

const eventStep = ref(0)
const eventLogs = ref([])

const initialSortValues = [8, 3, 6, 1, 7, 4]
const sortValues = ref([...initialSortValues])
const sortSteps = ref(createBubbleSortSteps(initialSortValues))
const sortStepIndex = ref(0)
const sortCompare = ref([])
const sortSorted = ref([])
const sortDesc = ref('点击下一步，观察相邻柱体比较和交换。')

const activeExperimentInfo = computed(() => experiments.find(item => item.key === activeExperiment.value) || experiments[0])

const previewTip = computed(() => {
  if (activeExperiment.value === 'event-loop') return '点击下一步观察调用栈、微任务、渲染与宏任务的执行顺序'
  if (activeExperiment.value === 'sort3d') return '点击下一步观察 3D 柱体比较、交换和归位'
  return '左右拖动可改变自转速度'
})

const eventQueues = computed(() => {
  const active = eventTimeline[eventStep.value - 1] || null
  const completed = eventTimeline.slice(0, eventStep.value).map(item => item.label)
  const queueMap = [
    { key: 'call', title: '调用栈', desc: '同步代码先进入调用栈执行' },
    { key: 'micro', title: '微任务', desc: 'Promise.then 等微任务优先清空' },
    { key: 'render', title: '渲染', desc: '一次可视更新机会' },
    { key: 'macro', title: '宏任务', desc: 'setTimeout 等进入下一轮' }
  ]
  return queueMap.map(queue => ({
    ...queue,
    tasks: eventTimeline
      .filter(item => item.queue === queue.key)
      .map(item => ({
        label: item.label,
        active: active?.label === item.label,
        done: completed.includes(item.label)
      }))
  }))
})

function createBubbleSortSteps(values) {
  const arr = [...values]
  const steps = []
  for (let i = 0; i < arr.length - 1; i += 1) {
    for (let j = 0; j < arr.length - 1 - i; j += 1) {
      const left = arr[j]
      const right = arr[j + 1]
      const shouldSwap = left > right
      steps.push({
        type: shouldSwap ? 'swap' : 'compare',
        compare: [j, j + 1],
        before: [...arr],
        message: shouldSwap
          ? `${left} > ${right}，交换两个柱体`
          : `${left} <= ${right}，保持顺序`
      })
      if (shouldSwap) {
        arr[j] = right
        arr[j + 1] = left
      }
      steps.push({
        type: 'state',
        compare: [],
        values: [...arr],
        sorted: Array.from({ length: i + 1 }, (_, index) => arr.length - 1 - index),
        message: `当前序列：${arr.join(' · ')}`
      })
    }
  }
  steps.push({
    type: 'done',
    compare: [],
    values: [...arr],
    sorted: arr.map((_, index) => index),
    message: '排序完成，所有柱体已按高度归位'
  })
  return steps
}

function resetEventLoop() {
  eventStep.value = 0
  eventLogs.value = []
  statusText.value = '等待推进'
  updateEventPreview()
}

function stepEventLoop() {
  if (eventStep.value >= eventTimeline.length) return
  const step = eventTimeline[eventStep.value]
  eventStep.value += 1
  eventLogs.value = [`${eventStep.value}. ${step.log}`, ...eventLogs.value].slice(0, 6)
  statusText.value = step.label
  updateEventPreview()
  recordLabAction('event-loop', '事件循环', 'step')
}

function resetSort() {
  sortValues.value = [...initialSortValues]
  sortSteps.value = createBubbleSortSteps(initialSortValues)
  sortStepIndex.value = 0
  sortCompare.value = []
  sortSorted.value = []
  sortDesc.value = '点击下一步，观察相邻柱体比较和交换。'
  statusText.value = '等待排序'
  updateSortPreview()
}

function stepSort() {
  if (sortStepIndex.value >= sortSteps.value.length) return
  const step = sortSteps.value[sortStepIndex.value]
  sortStepIndex.value += 1
  if (step.before) sortValues.value = [...step.before]
  if (step.values) sortValues.value = [...step.values]
  sortCompare.value = step.compare || []
  sortSorted.value = step.sorted || sortSorted.value
  sortDesc.value = step.message
  statusText.value = step.type === 'done' ? '排序完成' : (step.type === 'swap' ? '交换' : '比较')
  updateSortPreview()
  recordLabAction('sort3d', '3D 排序可视化', step.type)
}

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
    activeExperiment.value = target.key
    pushLabHistory(target.name)
    recordLabAction(target.key, target.name, 'enter')
  }
  if (key === 'event-loop') {
    switchExperimentScene()
    resetEventLoop()
    return
  }
  if (key === 'sort3d') {
    switchExperimentScene()
    resetSort()
    return
  }
  statusText.value = '运行中'
  switchExperimentScene()
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

  labGroup = new THREE.Group()
  scene.add(labGroup)

  switchExperimentScene()
  statusText.value = '运行中'
  renderLoop()
}

function disposeNode(node) {
  node.geometry?.dispose?.()
  node.material?.map?.dispose?.()
  node.material?.dispose?.()
  node.children?.forEach(disposeNode)
}

function easeValue(current, target, amount) {
  return current + (target - current) * amount
}

function easeColor(color, targetHex, amount) {
  const target = new THREE.Color(targetHex)
  color.r = easeValue(color.r, target.r, amount)
  color.g = easeValue(color.g, target.g, amount)
  color.b = easeValue(color.b, target.b, amount)
}

function clearLabGroup() {
  if (!labGroup) return
  while (labGroup.children.length) {
    const child = labGroup.children.pop()
    disposeNode(child)
  }
  ring = null
  planetGroup = null
  sortBars = []
  eventOrbitNodes = []
}

function switchExperimentScene() {
  if (!THREE || !labGroup) return
  clearLabGroup()
  if (activeExperiment.value === 'event-loop') {
    buildEventLoopScene()
    updateEventPreview()
    return
  }
  if (activeExperiment.value === 'sort3d') {
    buildSortScene()
    updateSortPreview()
    return
  }
  buildPlanetScene()
}

function buildPlanetScene() {
  planetGroup = new THREE.Group()
  labGroup.add(planetGroup)

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
  labGroup.add(new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.85 })
  ))
}

function buildEventLoopScene() {
  const colors = [0x41e6ff, 0xffc14d, 0x8a5cff, 0x5de879]
  const positions = [
    [-1.35, 0.56, 0],
    [1.35, 0.56, 0],
    [-1.35, -0.66, 0],
    [1.35, -0.66, 0]
  ]
  eventOrbitNodes = positions.map((position, index) => {
    const group = new THREE.Group()
    group.position.set(...position)
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 28, 28),
      new THREE.MeshPhongMaterial({
        color: colors[index],
        emissive: colors[index],
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.7,
        shininess: 120
      })
    )
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 24),
      new THREE.MeshBasicMaterial({
        color: colors[index],
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending || THREE.NormalBlending
      })
    )
    group.add(halo)
    group.add(orb)
    group.userData = { targetScale: 1, pulse: index * 0.9 }
    halo.userData = { targetOpacity: 0.1 }
    orb.userData = { targetEmissive: 0.25 }
    labGroup.add(group)
    return { group, orb, halo }
  })

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x274b86, transparent: true, opacity: 0.6 })
  for (let i = 0; i < positions.length; i += 1) {
    const next = positions[(i + 1) % positions.length]
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...positions[i]),
      new THREE.Vector3(...next)
    ])
    labGroup.add(new THREE.Line(geometry, lineMaterial))
  }
}

function updateEventPreview() {
  if (!eventOrbitNodes.length) return
  const queueOrder = ['call', 'micro', 'render', 'macro']
  const activeQueue = eventTimeline[eventStep.value - 1]?.queue
  eventOrbitNodes.forEach((node, index) => {
    const active = queueOrder[index] === activeQueue
    node.group.userData.targetScale = active ? 1.32 : 1
    node.halo.userData.targetOpacity = active ? 0.32 : 0.1
    node.orb.userData.targetEmissive = active ? 0.9 : 0.25
  })
}

function buildSortScene() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.7),
    new THREE.MeshBasicMaterial({ color: 0x0d1830, transparent: true, opacity: 0.65 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.05
  labGroup.add(floor)

  sortBars = sortValues.value.map((value, index) => {
    const spacing = 0.56
    const offset = -((sortValues.value.length - 1) * spacing) / 2
    const height = 0.28 + value * 0.14
    const geometry = new THREE.BoxGeometry(0.34, 1, 0.34)
    const material = new THREE.MeshPhongMaterial({
      color: 0x41e6ff,
      emissive: 0x0d4f78,
      emissiveIntensity: 0.35,
      shininess: 120
    })
    const bar = new THREE.Mesh(geometry, material)
    bar.position.set(offset + index * spacing, -1.05 + height / 2, 0)
    bar.scale.set(1, height, 1)
    bar.userData = {
      index,
      targetX: offset + index * spacing,
      targetHeight: height,
      targetColor: 0x41e6ff,
      targetEmissive: 0x0d4f78,
      targetEmissiveIntensity: 0.38,
      lift: 0
    }
    labGroup.add(bar)
    return bar
  })
  updateSortPreview()
}

function updateSortPreview() {
  if (!sortBars.length) return
  const spacing = 0.56
  const offset = -((sortBars.length - 1) * spacing) / 2
  sortBars.forEach((bar, index) => {
    const value = sortValues.value[index]
    const height = 0.28 + value * 0.14
    const active = sortCompare.value.includes(index)
    const sorted = sortSorted.value.includes(index)
    bar.userData.targetX = offset + index * spacing
    bar.userData.targetHeight = height
    bar.userData.targetColor = sorted ? 0x5de879 : (active ? 0xffc14d : 0x41e6ff)
    bar.userData.targetEmissive = sorted ? 0x104918 : (active ? 0x6b3f00 : 0x0d4f78)
    bar.userData.targetEmissiveIntensity = active ? 0.75 : 0.38
    bar.userData.lift = active ? 0.18 : 0
  })
}

function renderLoop() {
  animationFrameId = canvas.requestAnimationFrame(renderLoop)
  const time = Date.now() * 0.003
  if (planetGroup) {
    planetGroup.rotation.y += 0.008 + dragVelocity
    planetGroup.rotation.x += 0.0018
  }
  if (ring) {
    ring.rotation.z += 0.005
  }
  eventOrbitNodes.forEach((node, index) => {
    const pulse = 1 + Math.sin(time * 1.8 + node.group.userData.pulse) * 0.025
    const targetScale = (node.group.userData.targetScale || 1) * pulse
    const nextScale = easeValue(node.group.scale.x, targetScale, 0.12)
    node.group.scale.setScalar(nextScale)
    node.group.rotation.z += 0.003 + index * 0.0008
    node.halo.material.opacity = easeValue(node.halo.material.opacity, node.halo.userData.targetOpacity || 0.1, 0.12)
    node.orb.material.emissiveIntensity = easeValue(node.orb.material.emissiveIntensity || 0.25, node.orb.userData.targetEmissive || 0.25, 0.12)
  })
  sortBars.forEach((bar) => {
    const targetHeight = bar.userData.targetHeight || 0.5
    bar.scale.y = easeValue(bar.scale.y, targetHeight, 0.16)
    bar.position.x = easeValue(bar.position.x, bar.userData.targetX || 0, 0.16)
    bar.position.y = easeValue(bar.position.y, -1.05 + targetHeight / 2 + (bar.userData.lift || 0), 0.16)
    bar.rotation.y += (bar.userData.lift ? 0.035 : 0.012)
    easeColor(bar.material.color, bar.userData.targetColor || 0x41e6ff, 0.16)
    easeColor(bar.material.emissive, bar.userData.targetEmissive || 0x0d4f78, 0.16)
    bar.material.emissiveIntensity = easeValue(bar.material.emissiveIntensity || 0.38, bar.userData.targetEmissiveIntensity || 0.38, 0.16)
  })
  dragVelocity *= isDragging ? 0.985 : 0.93
  renderer.render(scene, camera)
}

function stopScene() {
  if (canvas && animationFrameId) {
    canvas.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }
  if (renderer) renderer.dispose()
  clearLabGroup()
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

.experiment-item.active {
  border: 1px solid rgba(65, 230, 255, 0.45);
  background: linear-gradient(135deg, rgba(20, 50, 96, 0.96), rgba(17, 31, 57, 0.9));
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

.experiment-panel {
  background: rgba(13, 24, 46, 0.96);
}

.queue-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: fig(10);
  margin-top: fig(12);
}

.queue-card {
  min-height: fig(94);
  padding: fig(10);
  border-radius: fig(12);
  border: 1px solid rgba(49, 80, 134, 0.72);
  background: rgba(12, 24, 48, 0.86);
  box-sizing: border-box;
}

.queue-call {
  border-color: rgba(65, 230, 255, 0.32);
}

.queue-micro {
  border-color: rgba(255, 193, 77, 0.32);
}

.queue-render {
  border-color: rgba(138, 92, 255, 0.32);
}

.queue-macro {
  border-color: rgba(93, 232, 121, 0.32);
}

.queue-title,
.queue-desc,
.task-chip,
.log-title,
.log-line,
.sort-desc,
.sort-value,
.control-button text {
  display: block;
}

.queue-title {
  color: #eaf5ff;
  font-size: fig(12);
  font-weight: 800;
  line-height: fig(17);
}

.queue-desc {
  margin-top: fig(4);
  min-height: fig(30);
  color: #7f94bf;
  font-size: fig(10);
  line-height: fig(15);
}

.task-list {
  margin-top: fig(8);
  display: flex;
  flex-wrap: wrap;
  gap: fig(5);
}

.task-chip {
  padding: fig(3) fig(6);
  border-radius: fig(8);
  color: #8ea1ca;
  font-size: fig(9);
  line-height: fig(13);
  background: rgba(255, 255, 255, 0.06);
}

.task-chip.active {
  color: #07101e;
  background: #41e6ff;
  font-weight: 800;
}

.task-chip.done {
  color: #9fe8c0;
  background: rgba(93, 232, 121, 0.16);
}

.control-row {
  display: flex;
  gap: fig(10);
  margin-top: fig(12);
}

.control-button {
  flex: 1;
  height: fig(38);
  border-radius: fig(13);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #41e6ff, #4988ff);
}

.control-button.secondary {
  background: rgba(21, 36, 67, 0.96);
  border: 1px solid rgba(68, 105, 171, 0.72);
}

.control-button text {
  color: #06111f;
  font-size: fig(13);
  font-weight: 800;
}

.control-button.secondary text {
  color: #a7c9ff;
}

.log-card {
  margin-top: fig(12);
  padding: fig(10);
  border-radius: fig(12);
  background: rgba(5, 12, 27, 0.58);
}

.log-title {
  color: #d8e8ff;
  font-size: fig(11);
  font-weight: 800;
  line-height: fig(16);
}

.log-line {
  margin-top: fig(6);
  color: #92a8d0;
  font-size: fig(10);
  line-height: fig(15);
}

.sort-value-row {
  display: flex;
  gap: fig(7);
  margin-top: fig(13);
}

.sort-value {
  flex: 1;
  height: fig(34);
  border-radius: fig(11);
  color: #a8badf;
  font-size: fig(13);
  font-weight: 800;
  line-height: fig(34);
  text-align: center;
  background: rgba(255, 255, 255, 0.06);
}

.sort-value.active {
  color: #10111b;
  background: #ffc14d;
}

.sort-value.sorted {
  color: #06180e;
  background: #5de879;
}

.sort-desc {
  margin-top: fig(10);
  min-height: fig(20);
  color: #93a8cf;
  font-size: fig(11);
  line-height: fig(17);
}
</style>
