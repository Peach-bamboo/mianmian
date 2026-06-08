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
import { getFallbackQuestions, normalizeQuestions } from '../services/questionBank'

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
let planetMaterials = []
let backgroundMaterials = []

const moduleStats = computed(() => {
  return modules.map((item) => {
    const count = questions.value.filter(question => question.category === item.key).length
    return { ...item, count }
  })
})

const focusedModule = computed(() => {
  return moduleStats.value.find(item => item.key === focusedKey.value) || moduleStats.value[0]
})

function navigateTo(url) {
  Taro.navigateTo({ url })
}

function loadQuestions() {
  const storedQuestions = Taro.getStorageSync('questions')
  questions.value = Array.isArray(storedQuestions) && storedQuestions.length
    ? normalizeQuestions(storedQuestions)
    : getFallbackQuestions()
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

function colorToRgb(hexColor) {
  return {
    r: (hexColor >> 16) & 255,
    g: (hexColor >> 8) & 255,
    b: hexColor & 255
  }
}

function rgbToCss(color, alpha = 1) {
  return `rgba(${color.r},${color.g},${color.b},${alpha})`
}

function mixRgb(colorA, colorB, amount) {
  const safeAmount = Math.max(0, Math.min(1, amount))
  return {
    r: Math.round(colorA.r + (colorB.r - colorA.r) * safeAmount),
    g: Math.round(colorA.g + (colorB.g - colorA.g) * safeAmount),
    b: Math.round(colorA.b + (colorB.b - colorA.b) * safeAmount)
  }
}

function strokeScaledCircle(ctx, x, y, radiusX, radiusY, rotation = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(radiusX, radiusY)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.restore()
  ctx.stroke()
}

function createPlanetTexture(module, active = false) {
  const baseColor = colorToRgb(module.color)
  const coldLight = { r: 218, g: 252, b: 255 }
  const shadow = mixRgb(baseColor, { r: 4, g: 9, b: 20 }, 0.84)
  const mid = mixRgb(baseColor, coldLight, active ? 0.24 : 0.16)
  const highlight = mixRgb(baseColor, coldLight, active ? 0.72 : 0.58)
  const textureSize = module.key === 'js' ? 512 : 384

  return createCanvasTexture((ctx, w, h) => {
    const centerX = w / 2
    const centerY = h / 2
    const radius = Math.min(w, h) / 2

    ctx.clearRect(0, 0, w, h)

    const body = ctx.createRadialGradient(centerX - radius * 0.36, centerY - radius * 0.38, radius * 0.05, centerX, centerY, radius)
    body.addColorStop(0, rgbToCss(highlight, active ? 0.9 : 0.72))
    body.addColorStop(0.22, rgbToCss(mid, active ? 0.68 : 0.5))
    body.addColorStop(0.48, rgbToCss(baseColor, active ? 0.38 : 0.28))
    body.addColorStop(0.74, rgbToCss(shadow, 0.16))
    body.addColorStop(1, 'rgba(2,7,18,0.02)')
    ctx.fillStyle = body
    ctx.fillRect(0, 0, w, h)

    const rim = ctx.createRadialGradient(centerX + radius * 0.18, centerY + radius * 0.12, radius * 0.32, centerX, centerY, radius)
    rim.addColorStop(0, 'rgba(255,255,255,0)')
    rim.addColorStop(0.54, 'rgba(255,255,255,0)')
    rim.addColorStop(0.8, rgbToCss(highlight, active ? 0.34 : 0.2))
    rim.addColorStop(1, rgbToCss(highlight, active ? 0.18 : 0.1))
    ctx.fillStyle = rim
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.lineCap = 'round'
    for (let i = 0; i < 4; i += 1) {
      const y = centerY + Math.sin(i * 1.38 + module.key.length) * radius * 0.34
      const xOffset = Math.cos(i * 1.8) * radius * 0.1
      ctx.strokeStyle = rgbToCss(highlight, active ? 0.13 : 0.08)
      ctx.lineWidth = i === 0 ? 1.6 : 0.85
      strokeScaledCircle(ctx, centerX + xOffset, y, radius * (0.58 + i * 0.08), radius * 0.045, Math.sin(i) * 0.5)
    }

    const sparkCount = active ? 36 : 18
    for (let i = 0; i < sparkCount; i += 1) {
      const seed = Math.sin((i + 1) * 91.7 + module.key.length * 13.1) * 10000
      const seed2 = Math.sin((i + 5) * 47.3 + module.radius * 29) * 10000
      const x = centerX + (seed - Math.floor(seed) - 0.5) * radius * 1.56
      const y = centerY + (seed2 - Math.floor(seed2) - 0.5) * radius * 1.56
      const dx = x - centerX
      const dy = y - centerY
      if (dx * dx + dy * dy > radius * radius * 0.78) continue
      const size = i % 7 === 0 ? 1.7 : 0.8
      ctx.fillStyle = rgbToCss(highlight, i % 7 === 0 ? 0.66 : 0.26)
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    const glass = ctx.createRadialGradient(centerX - radius * 0.18, centerY - radius * 0.2, radius * 0.2, centerX, centerY, radius * 0.98)
    glass.addColorStop(0, 'rgba(255,255,255,0.1)')
    glass.addColorStop(0.52, 'rgba(255,255,255,0)')
    glass.addColorStop(0.84, rgbToCss(highlight, active ? 0.13 : 0.08))
    glass.addColorStop(1, 'rgba(255,255,255,0.02)')
    ctx.fillStyle = glass
    ctx.fillRect(0, 0, w, h)
  }, textureSize, textureSize)
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

    const gradient = ctx.createLinearGradient(222, 18, 312, 46)
    gradient.addColorStop(0, 'rgba(65,230,255,0)')
    gradient.addColorStop(1, '#41e6ff')
    ctx.save()
    ctx.translate(268, 30)
    ctx.rotate(20 * Math.PI / 180)
    ctx.fillStyle = gradient
    roundedRect(ctx, -44, -1, 88, 2, 1)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#f5f8ff'
    ctx.beginPath()
    ctx.arc(318, 5, 4, 0, Math.PI * 2)
    ctx.fill()
  })
  addUiPlane('header', 23, 58, 344, 96, texture, 2)
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

function createCosmosBackgroundTexture() {
  return createCanvasTexture((ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#030813')
    sky.addColorStop(0.38, '#06142a')
    sky.addColorStop(0.68, '#071a33')
    sky.addColorStop(1, '#030711')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    const blueNebula = ctx.createRadialGradient(w * 0.68, h * 0.34, 8, w * 0.68, h * 0.34, w * 0.58)
    blueNebula.addColorStop(0, 'rgba(54,146,255,0.2)')
    blueNebula.addColorStop(0.32, 'rgba(31,95,190,0.12)')
    blueNebula.addColorStop(1, 'rgba(31,95,190,0)')
    ctx.fillStyle = blueNebula
    ctx.fillRect(0, 0, w, h)

    const cyanFog = ctx.createRadialGradient(w * 0.22, h * 0.46, 10, w * 0.22, h * 0.46, w * 0.52)
    cyanFog.addColorStop(0, 'rgba(65,230,255,0.12)')
    cyanFog.addColorStop(0.4, 'rgba(65,230,255,0.055)')
    cyanFog.addColorStop(1, 'rgba(65,230,255,0)')
    ctx.fillStyle = cyanFog
    ctx.fillRect(0, 0, w, h)

    const warmNebula = ctx.createRadialGradient(w * 0.76, h * 0.58, 8, w * 0.76, h * 0.58, w * 0.38)
    warmNebula.addColorStop(0, 'rgba(255,191,92,0.1)')
    warmNebula.addColorStop(0.42, 'rgba(255,126,75,0.05)')
    warmNebula.addColorStop(1, 'rgba(255,126,75,0)')
    ctx.fillStyle = warmNebula
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.translate(w * 0.62, h * 0.4)
    ctx.rotate(-24 * Math.PI / 180)
    for (let i = 0; i < 42; i += 1) {
      const x = (Math.sin(i * 21.7) * 0.5 + 0.5) * w * 0.92 - w * 0.46
      const y = (Math.sin(i * 9.3 + 1.7) * 0.5 + 0.5) * h * 0.22 - h * 0.11
      const length = 18 + (i % 5) * 10
      const alpha = 0.018 + (i % 4) * 0.012
      const streak = ctx.createLinearGradient(x, y, x + length, y)
      streak.addColorStop(0, 'rgba(65,230,255,0)')
      streak.addColorStop(0.5, `rgba(114,181,255,${alpha})`)
      streak.addColorStop(1, 'rgba(65,230,255,0)')
      ctx.strokeStyle = streak
      ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + length, y + Math.sin(i) * 4)
      ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 220; i += 1) {
      const seed = Math.sin((i + 3) * 78.13) * 10000
      const seed2 = Math.sin((i + 11) * 36.41) * 10000
      const x = (seed - Math.floor(seed)) * w
      const y = (seed2 - Math.floor(seed2)) * h
      const bright = i % 19 === 0
      const size = bright ? 1.6 + (i % 3) * 0.7 : 0.55 + (i % 4) * 0.18
      const alpha = bright ? 0.74 : 0.18 + (i % 5) * 0.05
      ctx.fillStyle = i % 13 === 0 ? `rgba(255,198,122,${alpha})` : `rgba(190,228,255,${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()

      if (bright) {
        ctx.strokeStyle = `rgba(91,179,255,${alpha * 0.44})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(x - size * 5, y)
        ctx.lineTo(x + size * 5, y)
        ctx.moveTo(x, y - size * 5)
        ctx.lineTo(x, y + size * 5)
        ctx.stroke()
      }
    }
    ctx.restore()
  }, 768, 1400)
}

function createBackgroundSky() {
  const texture = createCosmosBackgroundTexture()
  if (!texture) return
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: false,
    depthTest: false,
    depthWrite: false
  })
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 14.8), material)
  plane.position.set(0, 0, -4.8)
  plane.renderOrder = -20
  scene.add(plane)
  backgroundMaterials.push(material)
}

function createPlanetTextSprite(module, radius, isCore) {
  const text = isCore ? 'JS' : module.name
  const texture = renderUiTexture(104, 64, (ctx) => {
    const glow = ctx.createRadialGradient(52, 30, 4, 52, 30, 44)
    glow.addColorStop(0, isCore ? 'rgba(65,230,255,0.55)' : 'rgba(255,255,255,0.26)')
    glow.addColorStop(0.45, isCore ? 'rgba(65,230,255,0.16)' : 'rgba(65,230,255,0.1)')
    glow.addColorStop(1, 'rgba(65,230,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(52, 30, 44, 0, Math.PI * 2)
    ctx.fill()

    const panelWidth = isCore ? 58 : Math.min(88, Math.max(52, text.length * 19 + 20))
    const panelX = (104 - panelWidth) / 2
    ctx.fillStyle = isCore ? 'rgba(255,255,255,0.12)' : 'rgba(5,14,30,0.18)'
    roundedRect(ctx, panelX, isCore ? 14 : 10, panelWidth, isCore ? 36 : 44, 13)
    ctx.fill()
    ctx.strokeStyle = isCore ? 'rgba(185,249,255,0.62)' : 'rgba(218,252,255,0.3)'
    ctx.lineWidth = 1.2
    roundedRect(ctx, panelX, isCore ? 14 : 10, panelWidth, isCore ? 36 : 44, 13)
    ctx.stroke()

    const fontSize = isCore ? 32 : (text.length > 4 ? 17 : 22)
    drawText(ctx, text, 52, isCore ? 12 : 18, fontSize, '#f8fdff', '900', 'center')
  })
  if (!texture) return null
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending || THREE.NormalBlending
  })
  const sprite = new THREE.Sprite(material)
  const scaleX = isCore ? radius * 1.26 : Math.max(radius * Math.min(1.48, text.length * 0.22 + 0.82), 0.28)
  const scaleY = isCore ? radius * 0.74 : Math.max(radius * 0.72, 0.16)
  sprite.scale.set(scaleX, scaleY, 1)
  sprite.position.set(0, 0, radius * 0.04)
  sprite.renderOrder = 2
  sprite.userData = { baseScaleX: scaleX, baseScaleY: scaleY }
  planetMaterials.push(material)
  return sprite
}

function createRingNodes(radius, color) {
  const nodes = new THREE.Group()
  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI * 2 * i) / 4 + Math.PI * 0.12
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.038, 12, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.AdditiveBlending || THREE.NormalBlending
      })
    )
    node.position.set(Math.cos(angle) * radius * 1.62, Math.sin(angle) * radius * 0.2, Math.sin(angle) * radius * 1.02)
    nodes.add(node)
  }
  return nodes
}

function createEnergyArcs(radius, color, isCore) {
  const arcs = new THREE.Group()
  const arcCount = isCore ? 4 : 2
  for (let i = 0; i < arcCount; i += 1) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(radius * (0.82 + i * 0.12), radius * (isCore ? 0.006 : 0.004), 8, 96, Math.PI * (isCore ? 1.28 : 0.92)),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isCore ? 0.34 : 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending || THREE.NormalBlending
      })
    )
    arc.rotation.x = Math.PI * (0.22 + i * 0.18)
    arc.rotation.y = Math.PI * (0.18 + i * 0.14)
    arc.rotation.z = Math.PI * (0.14 + i * 0.26)
    arcs.add(arc)
  }
  return arcs
}

function createPlanet(module, index) {
  const radius = module.radius
  const group = new THREE.Group()
  group.name = module.key
  group.position.set(...module.position)
  const isCore = module.key === 'js'
  const texture = createPlanetTexture(module, isCore)
  const atmosphereColor = isCore ? 0x9df8ff : module.color

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (isCore ? 1.58 : 1.42), 28, 28),
    new THREE.MeshBasicMaterial({
      color: module.color,
      transparent: true,
      opacity: isCore ? 0.08 : 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending || THREE.NormalBlending
    })
  )
  group.add(glow)

  const outerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (isCore ? 1.16 : 1.12), 36, 36),
    new THREE.MeshBasicMaterial({
      color: atmosphereColor,
      transparent: true,
      opacity: isCore ? 0.18 : 0.08,
      side: THREE.BackSide || THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending || THREE.NormalBlending
    })
  )
  group.add(outerGlow)

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, isCore ? 56 : 42, isCore ? 56 : 36),
    new THREE.MeshPhongMaterial({
      color: texture ? 0xffffff : module.color,
      map: texture || null,
      emissive: module.emissive,
      emissiveIntensity: isCore ? 0.72 : 0.62,
      shininess: isCore ? 280 : 220,
      transparent: true,
      opacity: isCore ? 0.58 : 0.56,
      specular: new THREE.Color(isCore ? 0xbefaff : 0x7bcfff)
    })
  )
  group.add(planet)

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (isCore ? 0.34 : 0.22), 24, 24),
    new THREE.MeshBasicMaterial({
      color: isCore ? 0xf7fbff : module.color,
      transparent: true,
      opacity: isCore ? 0.32 : 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending || THREE.NormalBlending
    })
  )
  core.position.set(-radius * 0.16, radius * 0.12, radius * 0.28)
  group.add(core)

  const energyArcs = createEnergyArcs(radius, isCore ? 0xdffbff : atmosphereColor, isCore)
  group.add(energyArcs)

  let ring = null
  if (['react', 'arithmetic', 'js'].includes(module.key)) {
    ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * (isCore ? 1.62 : 1.45), radius * 0.025, 14, 128),
      new THREE.MeshBasicMaterial({
        color: isCore ? 0xb9f9ff : 0x41e6ff,
        transparent: true,
        opacity: isCore ? 0.78 : 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending || THREE.NormalBlending
      })
    )
    ring.rotation.x = Math.PI * 0.58
    group.add(ring)
  }

  let secondaryRing = null
  if (isCore) {
    secondaryRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.28, radius * 0.01, 10, 128),
      new THREE.MeshBasicMaterial({
        color: 0xffd75c,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending || THREE.NormalBlending
      })
    )
    secondaryRing.rotation.x = Math.PI * 0.18
    secondaryRing.rotation.y = Math.PI * 0.42
    group.add(secondaryRing)
  }

  const coreText = createPlanetTextSprite(module, radius, isCore)
  if (coreText) group.add(coreText)

  const ringNodes = isCore ? createRingNodes(radius, 0xb9f9ff) : null
  if (ringNodes) {
    ringNodes.rotation.x = Math.PI * 0.58
    group.add(ringNodes)
  }

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
    outerGlow,
    planet,
    core,
    energyArcs,
    ring,
    secondaryRing,
    coreText,
    ringNodes
  }
  planetTargets.push(group)
  cosmosGroup.add(group)
}

function createStars() {
  const starGeometry = new THREE.Geometry()
  for (let i = 0; i < 420; i += 1) {
    starGeometry.vertices.push(new THREE.Vector3(
      (Math.random() - 0.5) * 6.8,
      (Math.random() - 0.5) * 4.7,
      (Math.random() - 0.5) * 3.4
    ))
  }
  scene.add(new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xd9f4ff,
      size: 0.017,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending || THREE.NormalBlending
    })
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
    const isCore = group.userData.key === 'js'
    const pulse = active ? 1 + Math.sin(time * 2.2) * 0.035 : 1
    const targetScale = (active ? 1.2 : 1) * pulse
    const targetOpacity = active ? 0.13 : (isCore ? 0.04 : 0.065)
    const targetAtmosphereOpacity = active ? 0.22 : (isCore ? 0.07 : 0.1)
    const targetCoreOpacity = active ? 0.42 : (isCore ? 0.14 : 0.24)
    const targetArcOpacity = active ? 0.3 : (isCore ? 0.11 : 0.16)
    const targetPlanetOpacity = active ? 0.6 : (isCore ? 0.42 : 0.54)

    group.scale.x = easeTowards(group.scale.x, targetScale, 0.1)
    group.scale.y = easeTowards(group.scale.y, targetScale, 0.1)
    group.scale.z = easeTowards(group.scale.z, targetScale, 0.1)
    group.position.y = easeTowards(
      group.position.y,
      group.userData.baseY + Math.sin(time + index * 0.8) * (active ? 0.035 : 0.018),
      0.08
    )

    group.userData.glow.material.opacity = easeTowards(group.userData.glow.material.opacity, targetOpacity, 0.12)
    group.userData.outerGlow.material.opacity = easeTowards(group.userData.outerGlow.material.opacity, targetAtmosphereOpacity, 0.12)
    group.userData.outerGlow.scale.setScalar(1 + Math.sin(time * 1.8 + index) * (active ? 0.035 : 0.018))
    group.userData.core.material.opacity = easeTowards(group.userData.core.material.opacity, targetCoreOpacity, 0.12)
    group.userData.core.scale.setScalar(1 + Math.sin(time * 2.8 + index * 0.7) * (active ? 0.16 : 0.07))
    group.userData.planet.material.opacity = easeTowards(group.userData.planet.material.opacity || 0.58, targetPlanetOpacity, 0.1)
    group.userData.planet.material.emissiveIntensity = easeTowards(group.userData.planet.material.emissiveIntensity || 0.58, active ? 0.95 : (isCore ? 0.42 : 0.62), 0.1)
    group.userData.energyArcs.rotation.y += active ? 0.007 : 0.0025
    group.userData.energyArcs.rotation.x += active ? 0.003 : 0.001
    group.userData.energyArcs.children.forEach((arc, arcIndex) => {
      arc.material.opacity = easeTowards(arc.material.opacity, targetArcOpacity * (arcIndex === 0 ? 1 : 0.72), 0.12)
    })
    group.userData.outerGlow.rotation.y -= active ? 0.0025 : 0.0012

    if (group.userData.ring) {
      group.userData.ring.material.opacity = easeTowards(group.userData.ring.material.opacity, active ? 0.95 : 0.56, 0.12)
      group.userData.ring.rotation.z += active ? 0.018 : 0.006
    }

    if (group.userData.secondaryRing) {
      group.userData.secondaryRing.material.opacity = easeTowards(group.userData.secondaryRing.material.opacity, active ? 0.72 : 0.38, 0.12)
      group.userData.secondaryRing.rotation.z -= active ? 0.014 : 0.004
      group.userData.secondaryRing.rotation.y += active ? 0.006 : 0.002
    }

    if (group.userData.coreText) {
      group.userData.coreText.material.opacity = easeTowards(group.userData.coreText.material.opacity ?? 1, active ? 1 : 0.78, 0.12)
      group.userData.coreText.scale.x = easeTowards(group.userData.coreText.scale.x, group.userData.coreText.userData.baseScaleX, 0.1)
      group.userData.coreText.scale.y = easeTowards(group.userData.coreText.scale.y, group.userData.coreText.userData.baseScaleY, 0.1)
    }

    if (group.userData.ringNodes) {
      group.userData.ringNodes.rotation.z += active ? 0.018 : 0.006
      group.userData.ringNodes.children.forEach((node, nodeIndex) => {
        node.material.opacity = easeTowards(node.material.opacity, active ? 0.92 : 0.48, 0.12)
        node.scale.setScalar(1 + Math.sin(time * 2.4 + nodeIndex) * (active ? 0.22 : 0.08))
      })
    }

  })
}

function createScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x030711)

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

  createBackgroundSky()
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
  planetMaterials.forEach((material) => {
    material.map?.dispose?.()
    material.dispose?.()
  })
  backgroundMaterials.forEach((material) => {
    material.map?.dispose?.()
    material.dispose?.()
  })
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
  planetMaterials = []
  backgroundMaterials = []
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
