<template>
  <view class="cosmos-page">
    <canvas
      id="knowledge-cosmos-canvas"
      type="webgl"
      class="cosmos-canvas"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    />
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import Taro from '@tarojs/taro'
import { createScopedThreejs } from 'threejs-miniprogram'
import { getDailyQuestionByCloud } from '../services/cloud'

const emit = defineEmits(['switch-profile'])

const DESIGN_WIDTH = 390
const DESIGN_HEIGHT = 844

const modules = [
  { key: 'html', name: 'HTML', label: '结构星球', title: '语义化标签与页面骨架', color: 0xff7146, emissive: 0x5a160b, position: [-1.86, 0.78, 0.08], radius: 0.27 },
  { key: 'css', name: 'CSS', label: '样式星云', title: '布局、动画与响应式样式', color: 0x5da8ff, emissive: 0x102d63, position: [1.78, 0.62, -0.04], radius: 0.28 },
  { key: 'js', name: 'JavaScript', label: '核心恒星', title: '核心恒星', color: 0x32d9ff, emissive: 0x0b5172, position: [0, -0.04, 0.3], radius: 0.48 },
  { key: 'vue', name: 'Vue', label: '响应轨道', title: '响应式原理与 diff 算法', color: 0x42f5b0, emissive: 0x0a4a34, position: [-1.55, -1.27, 0.08], radius: 0.31 },
  { key: 'react', name: 'React', label: '组件环带', title: 'Fiber 调度与组件模型', color: 0x66dcff, emissive: 0x0a3d55, position: [1.55, -1.08, 0.12], radius: 0.31 },
  { key: 'node', name: 'Node', label: '服务行星', title: '运行时、事件循环与服务端', color: 0x5de879, emissive: 0x104918, position: [-0.08, 1.44, -0.15], radius: 0.24 },
  { key: 'arithmetic', name: '算法', label: '逻辑晶体', title: '复杂度、结构与解题模型', color: 0xffc14d, emissive: 0x684000, position: [0, -1.74, 0.05], radius: 0.29 },
  { key: 'applet', name: '小程序', label: '跨端基地', title: '生命周期与跨端工程', color: 0x58ff7a, emissive: 0x0d4a1b, position: [-0.78, -0.72, 0.42], radius: 0.2 },
  { key: 'net', name: '网络', label: '协议星域', title: 'HTTP、缓存与安全边界', color: 0xff9b4b, emissive: 0x65300b, position: [0.72, 0.9, 0.18], radius: 0.18 }
]

const questions = ref([])
const focusedKey = ref('js')

let THREE
let canvas
let renderer
let scene
let uiScene
let camera
let uiCamera
let cosmosGroup
let uiGroup
let raycaster
let pointer
let animationFrameId = 0
let width = 0
let height = 0
let canvasLeft = 0
let canvasTop = 0
let dpr = 1
let uiScale = 1
let lastTouchX = 0
let lastTouchY = 0
let touchStartX = 0
let touchStartY = 0
let dragVelocityX = 0
let dragVelocityY = 0
let isDragging = false
let planetTargets = []
let orbitTargets = []
let hitZones = []
let overlayMaterials = []

const moduleStats = computed(() => {
  return modules.map((item) => {
    const count = questions.value.filter(question => question.category === item.key).length
    return { ...item, count }
  })
})

const focusedModule = computed(() => {
  return moduleStats.value.find(item => item.key === focusedKey.value) || moduleStats.value[0]
})

const dailyQuestion = computed(() => {
  const cached = getDailyQuestion()
  return cached || questions.value[0]
})

function navigateTo(url) {
  Taro.navigateTo({ url })
}

async function goDailyQuestion() {
  const question = await getCloudDailyQuestion()
  if (!question?.id) return
  navigateTo(`/pages/normalQuestionDetail/index?id=${question.id}&key=daily&daily=1&ids=${question.id}`)
}

function getDailyQuestion() {
  if (!questions.value.length) return null
  const today = new Date().toISOString().split('T')[0]
  const cachedQuestion = Taro.getStorageSync(`dailyQuestion_${today}`)
  if (cachedQuestion?.id) return cachedQuestion
  const randomIndex = Math.floor(Math.random() * questions.value.length)
  const question = questions.value[randomIndex]
  Taro.setStorageSync(`dailyQuestion_${today}`, question)
  return question
}

async function getCloudDailyQuestion() {
  if (!questions.value.length) return null

  try {
    const result = await getDailyQuestionByCloud({
      questionIds: questions.value.map(question => question.id)
    })
    const question = questions.value.find(item => item.id === Number(result?.questionId))
    if (result?.success && question) {
      Taro.setStorageSync(`dailyQuestion_${result.date}`, question)
      return question
    }
  } catch (error) {
    console.log('每日一题同步失败，使用本地题目', error)
  }

  return dailyQuestion.value
}

function loadQuestions() {
  const storedQuestions = Taro.getStorageSync('questions')
  questions.value = Array.isArray(storedQuestions) ? storedQuestions : []
}

function queryCanvasNode() {
  return new Promise((resolve, reject) => {
    Taro.createSelectorQuery()
      .select('#knowledge-cosmos-canvas')
      .fields({ node: true, size: true, rect: true })
      .exec((res) => {
        const result = res?.[0]
        if (result?.node) resolve(result)
        else reject(new Error('未获取到知识宇宙 canvas 节点'))
      })
  })
}

function createDrawingCanvas(textureWidth, textureHeight) {
  const safeWidth = Math.max(2, Math.ceil(textureWidth))
  const safeHeight = Math.max(2, Math.ceil(textureHeight))
  if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
    const offscreen = wx.createOffscreenCanvas({ type: '2d', width: safeWidth, height: safeHeight })
    return { canvas: offscreen, context: offscreen.getContext('2d') }
  }
  const offscreen = canvas.createImage ? canvas : null
  if (!offscreen) return null
  return null
}

function createCanvasTexture(draw, textureWidth, textureHeight) {
  const target = createDrawingCanvas(textureWidth, textureHeight)
  if (!target) return null
  draw(target.context, target.canvas.width, target.canvas.height)
  const texture = THREE.CanvasTexture ? new THREE.CanvasTexture(target.canvas) : new THREE.Texture(target.canvas)
  texture.needsUpdate = true
  return texture
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawText(ctx, text, x, y, size, color, weight = '500', align = 'left') {
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.font = `${weight} ${size}px sans-serif`
  ctx.fillText(text, x, y)
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let output = text
  while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1)
  }
  return `${output}...`
}

function addUiPlane(name, designX, designY, designW, designH, texture, z = 0) {
  if (!texture) return null
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(designW * uiScale, designH * uiScale), material)
  plane.position.set(
    (designX + designW / 2) * uiScale - width / 2,
    height / 2 - (designY + designH / 2) * uiScale,
    z
  )
  plane.name = name
  plane.renderOrder = 10 + z
  uiGroup.add(plane)
  overlayMaterials.push(material)
  return plane
}

function addHitZone(name, x, y, w, h, action) {
  hitZones.push({ name, x, y, w, h, action })
}

function clearUi() {
  if (!uiGroup) return
  while (uiGroup.children.length) {
    const child = uiGroup.children.pop()
    child.geometry?.dispose?.()
  }
  overlayMaterials.forEach((material) => {
    material.map?.dispose?.()
    material.dispose?.()
  })
  overlayMaterials = []
  hitZones = []
}

function renderUiTexture(designW, designH, draw) {
  const textureScale = Math.max(2, Math.round(dpr))
  return createCanvasTexture((ctx, texW, texH) => {
    ctx.scale(textureScale, textureScale)
    draw(ctx, texW / textureScale, texH / textureScale)
  }, designW * textureScale, designH * textureScale)
}

function addHeader() {
  const texture = renderUiTexture(344, 96, (ctx) => {
    drawText(ctx, '前端面面', 0, 0, 28, '#f5f8ff', '800')
    drawText(ctx, '探索你的知识宇宙', 0, 34, 14, '#8393b6', '400')

    const gradient = ctx.createLinearGradient(220, 24, 305, 55)
    gradient.addColorStop(0, 'rgba(65,230,255,0)')
    gradient.addColorStop(1, '#41e6ff')
    ctx.save()
    ctx.translate(260, 38)
    ctx.rotate(20 * Math.PI / 180)
    ctx.fillStyle = gradient
    roundedRect(ctx, -44, -1, 88, 2, 1)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#f5f8ff'
    ctx.beginPath()
    ctx.arc(320, 5, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(16,28,56,0.75)'
    roundedRect(ctx, 264, 22, 76, 28, 14)
    ctx.fill()
    drawText(ctx, '每日任务', 279, 29, 12, '#41e6ff', '700')
  })
  addUiPlane('header', 23, 58, 344, 96, texture, 2)
  addHitZone('daily', 286, 58, 82, 54, goDailyQuestion)
}

function addFocusCard() {
  const module = focusedModule.value
  const texture = renderUiTexture(342, 92, (ctx) => {
    ctx.fillStyle = 'rgba(16,27,51,0.94)'
    roundedRect(ctx, 0, 0, 342, 92, 18)
    ctx.fill()
    ctx.fillStyle = '#41e6ff'
    roundedRect(ctx, 0, 18, 3, 43, 2)
    ctx.fill()
    drawText(ctx, `今日航线 / ${module.name}`, 18, 16, 12, '#41e6ff', '700')
    const title = truncateText(ctx, module.title, 190)
    drawText(ctx, title, 18, 41, 18, '#f5f8ff', '800')
    drawText(ctx, '继续探索 →', 230, 47, 12, '#a7c9ff', '600')
  })
  addUiPlane('focus-card', 23, 540, 342, 92, texture, 3)
  addHitZone('focus-card', 23, 540, 342, 92, () => navigateTo(`/pages/questionList/index?key=${module.key}`))
}

function addPortalCard() {
  const texture = renderUiTexture(342, 62, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 342, 0)
    gradient.addColorStop(0, '#151f3c')
    gradient.addColorStop(0.52, '#17104a')
    gradient.addColorStop(1, '#341164')
    ctx.fillStyle = gradient
    roundedRect(ctx, 0, 0, 342, 62, 18)
    ctx.fill()

    const glow = ctx.createRadialGradient(35, 31, 5, 35, 31, 24)
    glow.addColorStop(0, '#050711')
    glow.addColorStop(0.42, '#050711')
    glow.addColorStop(0.5, '#41e6ff')
    glow.addColorStop(0.72, '#8a4dff')
    glow.addColorStop(1, 'rgba(65,230,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(35, 31, 24, 0, Math.PI * 2)
    ctx.fill()

    drawText(ctx, '随机跃迁练习', 67, 13, 16, '#ffffff', '800')
    drawText(ctx, '黑洞抽取 10 题', 67, 38, 12, '#a8b7d8', '500')
    drawText(ctx, '进入 ›', 292, 23, 12, '#41e6ff', '800')
  })
  addUiPlane('portal-card', 23, 645, 342, 62, texture, 3)
  addHitZone('portal-card', 23, 645, 342, 62, () => navigateTo('/pages/questionList/index?key=random'))
}

function addLabStrip() {
  const texture = renderUiTexture(342, 38, (ctx) => {
    ctx.fillStyle = 'rgba(16,26,47,0.96)'
    roundedRect(ctx, 0, 0, 342, 38, 14)
    ctx.fill()
    drawText(ctx, '可视化实验室', 24, 11, 12, '#f5f8ff', '800')
    drawText(ctx, '3D 排序 / 事件循环', 128, 11, 11, '#8496b8', '600')
    drawText(ctx, 'THREE.JS ›', 270, 11, 10, '#41e6ff', '800')
  })
  addUiPlane('lab-strip', 23, 723, 342, 38, texture, 3)
  addHitZone('lab-strip', 23, 723, 342, 38, () => navigateTo('/pages/threeDemo/index'))
}

function addBottomNav() {
  const texture = renderUiTexture(358, 51, (ctx) => {
    ctx.fillStyle = 'rgba(13,21,41,0.96)'
    roundedRect(ctx, 0, 0, 358, 51, 22)
    ctx.fill()
    ctx.fillStyle = '#162c56'
    roundedRect(ctx, 12, 8, 80, 35, 16)
    ctx.fill()
    drawText(ctx, '宇宙', 52, 18, 13, '#41e6ff', '800', 'center')
    drawText(ctx, '题库', 132, 18, 13, '#8797ba', '600', 'center')
    drawText(ctx, '实验', 216, 18, 13, '#8797ba', '600', 'center')
    drawText(ctx, '成长', 300, 18, 13, '#8797ba', '600', 'center')
  })
  addUiPlane('bottom-nav', 15, 778, 358, 51, texture, 4)
  addHitZone('nav-questions', 108, 778, 80, 51, () => navigateTo('/pages/moduleHub/index'))
  addHitZone('nav-lab', 190, 778, 80, 51, () => navigateTo('/pages/threeDemo/index'))
  addHitZone('nav-growth', 276, 778, 80, 51, () => emit('switch-profile'))
}

function updateUiOverlay() {
  clearUi()
  addHeader()
  addFocusCard()
  addPortalCard()
  addLabStrip()
  addBottomNav()
}

function createOrbit(radius, opacity = 0.7) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.78, 0, Math.PI * 2)
  const points = curve.getPoints(160)
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(point.x, point.y, -0.04)))
  const orbit = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x24345c, transparent: true, opacity })
  )
  orbit.rotation.x = Math.PI * 0.04
  orbit.userData = { baseOpacity: opacity }
  orbitTargets.push(orbit)
  cosmosGroup.add(orbit)
}

function createPlanetLabel(text, radius, key) {
  const texture = renderUiTexture(72, 24, (ctx) => {
    drawText(ctx, text, 36, 6, 11, '#d6e4ff', '600', 'center')
  })
  if (!texture) return null
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.52, 0.17, 1)
  sprite.position.set(0, -radius - 0.18, 0.1)
  sprite.userData = { key, baseScale: 0.52 }
  overlayMaterials.push(material)
  return sprite
}

function createPlanet(module, index) {
  const radius = module.radius
  const group = new THREE.Group()
  group.name = module.key
  group.position.set(...module.position)

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.95, 24, 24),
    new THREE.MeshBasicMaterial({ color: module.color, transparent: true, opacity: module.key === 'js' ? 0.2 : 0.14 })
  )
  group.add(glow)

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 36, 36),
    new THREE.MeshPhongMaterial({
      color: module.color,
      emissive: module.emissive,
      shininess: 120
    })
  )
  group.add(planet)

  const grid = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.01, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, wireframe: true })
  )
  group.add(grid)

  let ring = null
  if (['react', 'arithmetic', 'js'].includes(module.key)) {
    ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.45, 0.009, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x41e6ff, transparent: true, opacity: 0.75 })
    )
    ring.rotation.x = Math.PI * 0.58
    group.add(ring)
  }

  const label = createPlanetLabel(module.name, radius, module.key)
  if (label) group.add(label)

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.95, 16, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  )
  group.add(hitArea)

  group.userData = {
    type: 'module',
    key: module.key,
    spin: 0.004 + index * 0.0007,
    baseScale: 1,
    baseY: module.position[1],
    radius,
    glow,
    planet,
    grid,
    ring,
    label
  }
  planetTargets.push(group)
  cosmosGroup.add(group)
}

function createStars() {
  const starGeometry = new THREE.Geometry()
  for (let i = 0; i < 260; i += 1) {
    starGeometry.vertices.push(new THREE.Vector3(
      (Math.random() - 0.5) * 6.8,
      (Math.random() - 0.5) * 4.7,
      (Math.random() - 0.5) * 3.4
    ))
  }
  scene.add(new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.013, transparent: true, opacity: 0.68 })
  ))
}

function easeTowards(current, target, amount) {
  return current + (target - current) * amount
}

function updatePlanetFocusState() {
  const time = Date.now() * 0.003
  const activeKey = focusedKey.value

  orbitTargets.forEach((orbit, index) => {
    const baseOpacity = orbit.userData.baseOpacity || 0.6
    orbit.material.opacity = easeTowards(orbit.material.opacity, baseOpacity + 0.08 * Math.sin(time + index), 0.04)
    orbit.rotation.z += index % 2 === 0 ? 0.0008 : -0.0006
  })

  planetTargets.forEach((group, index) => {
    const active = group.userData.key === activeKey
    const pulse = active ? 1 + Math.sin(time * 2.2) * 0.035 : 1
    const targetScale = (active ? 1.2 : 1) * pulse
    const targetOpacity = active ? 0.34 : 0.13
    const targetGridOpacity = active ? 0.34 : 0.16
    const targetLabelOpacity = active ? 1 : 0.72

    group.scale.x = easeTowards(group.scale.x, targetScale, 0.1)
    group.scale.y = easeTowards(group.scale.y, targetScale, 0.1)
    group.scale.z = easeTowards(group.scale.z, targetScale, 0.1)
    group.position.y = easeTowards(
      group.position.y,
      group.userData.baseY + Math.sin(time + index * 0.8) * (active ? 0.035 : 0.018),
      0.08
    )

    group.userData.glow.material.opacity = easeTowards(group.userData.glow.material.opacity, targetOpacity, 0.12)
    group.userData.grid.material.opacity = easeTowards(group.userData.grid.material.opacity, targetGridOpacity, 0.12)
    group.userData.planet.material.emissiveIntensity = easeTowards(group.userData.planet.material.emissiveIntensity || 1, active ? 1.75 : 1, 0.1)

    if (group.userData.ring) {
      group.userData.ring.material.opacity = easeTowards(group.userData.ring.material.opacity, active ? 0.95 : 0.56, 0.12)
      group.userData.ring.rotation.z += active ? 0.018 : 0.006
    }

    if (group.userData.label) {
      group.userData.label.material.opacity = easeTowards(group.userData.label.material.opacity, targetLabelOpacity, 0.12)
      const labelScale = active ? 0.62 : 0.52
      group.userData.label.scale.x = easeTowards(group.userData.label.scale.x, labelScale, 0.1)
      group.userData.label.scale.y = easeTowards(group.userData.label.scale.y, active ? 0.2 : 0.17, 0.1)
    }
  })
}

function createScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050711)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0.12, 5.8)

  scene.add(new THREE.AmbientLight(0x86a6ff, 0.58))
  const light = new THREE.PointLight(0xa8f2ff, 1.5, 20)
  light.position.set(2.4, 3.2, 4.8)
  scene.add(light)

  cosmosGroup = new THREE.Group()
  cosmosGroup.position.set(0, 0.18, 0)
  cosmosGroup.scale.set(0.9, 0.9, 0.9)
  scene.add(cosmosGroup)

  createStars()
  createOrbit(2.18, 0.58)
  createOrbit(1.55, 0.5)
  modules.forEach(createPlanet)
}

function createUiScene() {
  uiScene = new THREE.Scene()
  uiCamera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -100, 100)
  uiCamera.position.z = 10
  uiGroup = new THREE.Group()
  uiScene.add(uiGroup)
  updateUiOverlay()
}

function initScene() {
  THREE = createScopedThreejs(canvas)
  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()

  const systemInfo = Taro.getSystemInfoSync()
  dpr = systemInfo.pixelRatio || 1
  width = width || systemInfo.windowWidth
  height = height || systemInfo.windowHeight
  uiScale = width / DESIGN_WIDTH

  canvas.width = width * dpr
  canvas.height = height * dpr

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height)
  renderer.autoClear = false

  createScene()
  createUiScene()
  renderLoop()
}

function renderLoop() {
  animationFrameId = canvas.requestAnimationFrame(renderLoop)

  if (cosmosGroup) {
    cosmosGroup.rotation.y += 0.0028 + dragVelocityX
    cosmosGroup.rotation.x += dragVelocityY
  }

  planetTargets.forEach((group) => {
    group.rotation.y += group.userData.spin
    group.rotation.x += group.userData.spin * 0.35
  })

  updatePlanetFocusState()

  dragVelocityX *= isDragging ? 0.98 : 0.9
  dragVelocityY *= isDragging ? 0.98 : 0.9

  renderer.clear()
  renderer.render(scene, camera)
  renderer.clearDepth()
  renderer.render(uiScene, uiCamera)
}

function stopScene() {
  if (canvas && animationFrameId) {
    canvas.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }
  clearUi()
  renderer?.dispose?.()
  THREE = null
  canvas = null
  renderer = null
  scene = null
  uiScene = null
  camera = null
  uiCamera = null
  cosmosGroup = null
  uiGroup = null
  raycaster = null
  pointer = null
  planetTargets = []
  orbitTargets = []
}

function getTouchPoint(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0]
  return {
    x: touch?.clientX ?? touch?.pageX ?? touch?.x ?? 0,
    y: touch?.clientY ?? touch?.pageY ?? touch?.y ?? 0
  }
}

function toLocalPoint(point) {
  return {
    x: Math.max(0, Math.min(width, point.x - canvasLeft)),
    y: Math.max(0, Math.min(height, point.y - canvasTop))
  }
}

function handleTouchStart(event) {
  const point = getTouchPoint(event)
  isDragging = true
  touchStartX = point.x
  touchStartY = point.y
  lastTouchX = point.x
  lastTouchY = point.y
}

function handleTouchMove(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  const point = getTouchPoint(event)
  dragVelocityX = Math.max(-0.045, Math.min(0.045, (point.x - lastTouchX) * 0.0021))
  dragVelocityY = Math.max(-0.025, Math.min(0.025, (point.y - lastTouchY) * 0.001))
  lastTouchX = point.x
  lastTouchY = point.y
}

function handleTouchEnd(event) {
  isDragging = false
  const point = getTouchPoint(event)
  const moved = Math.abs(point.x - touchStartX) + Math.abs(point.y - touchStartY)
  if (moved < 18) handleTap(point)
}

function handleUiTap(localPoint) {
  const designX = localPoint.x / uiScale
  const designY = localPoint.y / uiScale
  const zone = hitZones.find(item => (
    designX >= item.x &&
    designX <= item.x + item.w &&
    designY >= item.y &&
    designY <= item.y + item.h
  ))
  if (!zone) return false
  zone.action()
  return true
}

function handlePlanetTap(localPoint) {
  if (!raycaster || !camera || !pointer) return false

  pointer.x = (localPoint.x / width) * 2 - 1
  pointer.y = -(localPoint.y / height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const intersects = raycaster.intersectObjects(planetTargets, true)
  if (!intersects.length) return false

  let target = intersects[0].object
  while (target && !target.userData?.type) {
    target = target.parent
  }
  if (!target?.userData?.key) return false

  focusedKey.value = target.userData.key
  updateUiOverlay()
  return true
}

function handleTap(point) {
  const localPoint = toLocalPoint(point)
  if (handleUiTap(localPoint)) return
  handlePlanetTap(localPoint)
}

onMounted(async () => {
  loadQuestions()
  if (process.env.TARO_ENV !== 'weapp') return

  try {
    await nextTick()
    const canvasInfo = await queryCanvasNode()
    canvas = canvasInfo.node
    width = canvasInfo.width
    height = canvasInfo.height
    canvasLeft = canvasInfo.left || 0
    canvasTop = canvasInfo.top || 0
    initScene()
  } catch (error) {
    console.error('知识宇宙初始化失败:', error)
    Taro.showToast({ title: '宇宙初始化失败', icon: 'none' })
  }
})

onUnmounted(() => {
  stopScene()
})
</script>

<style lang="scss">
.cosmos-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #050711;
}

.cosmos-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
