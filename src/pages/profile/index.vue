<template>
  <view class="growth-page">
    <CosmosHeadbar
      title="成长中心"
      :subtitle="profileSubtitle"
      :top-offset="16"
    />

    <view v-if="!isLoggedIn" class="guest-content">
      <canvas id="guest-core-canvas" type="2d" class="guest-core-canvas" />

      <text class="guest-title">欢迎来到 前端面面</text>
      <text class="guest-desc">登录后同步收藏、复习进度与知识星球成长数据。</text>

      <view class="login-button" @tap="handleLoginRegister">
        <text>登录 / 注册</text>
      </view>

      <view class="guest-feature-list">
        <view v-for="item in guestFeatures" :key="item.title" class="guest-feature-card">
          <view class="feature-icon" :class="`feature-${item.key}`">
            <text>{{ item.icon }}</text>
          </view>
          <view class="feature-copy">
            <text class="feature-title">{{ item.title }}</text>
            <text class="feature-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="guest-section-head">
        <text class="guest-section-title">知识宇宙</text>
        <text class="guest-section-link" @tap="goQuestionHub">查看地图</text>
      </view>

      <scroll-view class="guest-module-scroll" scroll-x :show-scrollbar="false">
        <view class="guest-module-row">
          <view v-for="module in previewModules" :key="module.key" class="guest-module-card">
            <view class="guest-module-planet" :class="`planet-${module.key}`">
              <text>{{ module.short }}</text>
            </view>
            <text class="guest-module-name">{{ module.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else class="growth-content">
      <view class="profile-card">
        <button class="profile-avatar-button" open-type="chooseAvatar" @chooseavatar="handleChooseAvatar">
          <image
            v-if="userProfile.avatarUrl"
            class="profile-avatar-image"
            :src="userProfile.avatarUrl"
            mode="aspectFill"
          />
          <view v-else class="profile-avatar-placeholder">
            <text>{{ avatarInitial }}</text>
          </view>
        </button>
        <view class="profile-copy">
          <view class="profile-name-row">
            <text class="profile-name">{{ displayName }}</text>
            <view class="edit-name-button" @tap="openNicknameEditor">
              <text>✎</text>
            </view>
          </view>
          <text class="profile-desc">学习数据已同步到云端</text>
        </view>
      </view>

      <view v-if="isNicknameEditing" class="nickname-editor">
        <input
          v-model="draftNickname"
          class="nickname-input"
          type="nickname"
          placeholder="输入昵称"
          placeholder-class="nickname-placeholder"
        />
        <view class="save-profile-button" @tap="saveNickname">
          <text>{{ isProfileSaving ? '保存中' : '保存昵称' }}</text>
        </view>
      </view>

      <view class="streak-card">
        <text class="streak-kicker">连续探索</text>
        <view class="streak-main">
          <text class="streak-value">{{ continuousDays }}</text>
          <text class="streak-unit">天</text>
        </view>
        <text class="streak-desc">本周已掌握 {{ weeklySolved }} 道新题</text>
        <view class="level-orb">
          <text>LV.{{ levelLabel }}</text>
        </view>
      </view>

      <view class="daily-card" :class="`daily-${dailyChallengeStatus}`" @tap="goDailyChallenge">
        <view class="daily-copy">
          <text class="daily-kicker">今日挑战</text>
          <text class="daily-title">{{ dailyChallengeTitle }}</text>
          <text class="daily-desc">{{ dailyChallengeDesc }}</text>
        </view>
        <view class="daily-status-orb">
          <text>{{ dailyChallengeBadge }}</text>
        </view>
      </view>

      <view class="summary-grid">
        <view class="summary-card">
          <text class="summary-value">{{ masteredCount }}</text>
          <text class="summary-label">已掌握</text>
        </view>
        <view class="summary-card">
          <text class="summary-value">{{ favoritedCount }}</text>
          <text class="summary-label">已收藏</text>
        </view>
        <view class="summary-card">
          <text class="summary-value">{{ masteryRate }}</text>
          <text class="summary-label">复习率</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">我的收藏</text>
          <text class="panel-meta link" @tap="goFavorites">查看全部</text>
        </view>

        <view v-if="favoritePreviewQuestions.length" class="favorite-preview-list">
          <view
            v-for="(question, index) in favoritePreviewQuestions"
            :key="question.id"
            class="favorite-preview-card"
            @tap="goFavoriteDetail(question.id, index)"
          >
            <view class="favorite-preview-top">
              <text class="favorite-category">{{ categoryLabelMap[question.category] || '题库' }}</text>
              <text class="favorite-star">★</text>
            </view>
            <text class="favorite-title">{{ question.question }}</text>
          </view>
        </view>

        <view v-else class="favorite-empty" @tap="goQuestionHub">
          <text class="favorite-empty-title">还没有收藏题目</text>
          <text class="favorite-empty-desc">去题库里给重要题目点亮星标</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">最近练习</text>
          <text class="panel-meta">{{ recentPracticeItems.length }} 条</text>
        </view>

        <view v-if="recentPracticeItems.length" class="recent-practice-list">
          <view
            v-for="item in recentPracticeItems"
            :key="`${item.questionId}-${item.action}-${item.createdAt}`"
            class="recent-practice-card"
            @tap="goPracticeDetail(item)"
          >
            <view class="recent-practice-top">
              <text class="recent-action">{{ item.actionLabel }}</text>
              <text class="recent-time">{{ item.timeLabel }}</text>
            </view>
            <text class="recent-title">{{ item.questionTitle }}</text>
            <text class="recent-category">{{ categoryLabelMap[item.category] || '题库' }}</text>
          </view>
        </view>

        <view v-else class="recent-empty" @tap="goQuestionHub">
          <text class="recent-empty-title">还没有练习记录</text>
          <text class="recent-empty-desc">进入题目、展开解析或标记掌握后会出现在这里</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">最近实验</text>
          <text class="panel-meta">{{ recentLabItems.length }} 条</text>
        </view>

        <view v-if="recentLabItems.length" class="recent-lab-list">
          <view v-for="item in recentLabItems" :key="`${item.labKey}-${item.action}-${item.createdAt}`" class="recent-lab-card" @tap="goLab">
            <view class="recent-lab-top">
              <text class="recent-lab-name">{{ item.labName }}</text>
              <text class="recent-lab-time">{{ item.timeLabel }}</text>
            </view>
            <text class="recent-lab-desc">{{ item.actionLabel }}{{ item.durationLabel }}</text>
          </view>
        </view>

        <view v-else class="recent-lab-empty" @tap="goLab">
          <text class="recent-lab-empty-title">还没有实验记录</text>
          <text class="recent-lab-empty-desc">进入实验室后会同步到这里</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">知识星球宽度</text>
          <text class="panel-meta link" @tap="goQuestionHub">查看全部</text>
        </view>

        <view
          v-for="item in topModules"
          :key="item.key"
          class="progress-row"
          @tap="goToModule(item.key)"
        >
          <view class="progress-top">
            <text class="module-name">{{ item.name }}</text>
            <text class="module-ratio">{{ item.percent }}%</text>
          </view>
          <view class="progress-track">
            <view
              class="progress-fill"
              :class="`tone-${item.key}`"
              :style="{ width: `${item.percent}%` }"
            ></view>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">近期成就</text>
        </view>
        <view class="badge-row">
          <view v-for="badge in badges" :key="badge.title" class="badge-card">
            <text class="badge-kicker">{{ badge.kicker }}</text>
            <text class="badge-title">{{ badge.title }}</text>
          </view>
        </view>
      </view>
    </view>

    <Tabbar active-key="growth" />
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import Tabbar from '../../components/Tabbar.vue'
import { getDailyQuestionByCloud, getGrowthSummaryByCloud, loginByCloud, updateUserProfileByCloud, uploadCloudFile } from '../../services/cloud'
import { syncCloudQuestionStates } from '../../services/questionState'
import { getFallbackQuestions, normalizeQuestions } from '../../services/questionBank'

const categoryLabelMap = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  vue: 'Vue',
  react: 'React',
  node: 'Node',
  applet: '小程序',
  net: '网络',
  arithmetic: '算法'
}

const modules = [
  { key: 'html', name: 'HTML' },
  { key: 'css', name: 'CSS' },
  { key: 'js', name: 'JavaScript' },
  { key: 'vue', name: 'Vue' },
  { key: 'react', name: 'React' },
  { key: 'node', name: 'Node' },
  { key: 'applet', name: '小程序' },
  { key: 'net', name: '网络' },
  { key: 'arithmetic', name: '算法' }
]

const guestFeatures = [
  { key: 'progress', icon: '⌁', title: '进度追踪', desc: '通过轨道进度图可视化掌握每个技术栈。' },
  { key: 'favorite', icon: '★', title: '个人收藏', desc: '保存高频面试题与复杂架构模式。' },
  { key: 'daily', icon: '⚡', title: '每日挑战', desc: '保持学习节奏并解锁成长徽章。' }
]

const previewModules = [
  { key: 'vue', name: 'Vue.js', short: 'V' },
  { key: 'react', name: 'React', short: 'JS' },
  { key: 'net', name: 'Network', short: 'N' },
  { key: 'css', name: 'CSS', short: 'C' }
]

function loadQuestions() {
  const stored = Taro.getStorageSync('questions')
  if (Array.isArray(stored) && stored.length) return normalizeQuestions(stored)
  return getFallbackQuestions()
}

const allQuestions = ref(loadQuestions())
const userProfile = ref({
  openid: '',
  nickname: '',
  avatarUrl: '',
  level: 1,
  continuousDays: 0,
  lastStudyDate: ''
})
const isProfileLoading = ref(false)
const isProfileSaving = ref(false)
const isNicknameEditing = ref(false)
const draftNickname = ref('')
const growthSummary = ref(null)

const isLoggedIn = computed(() => Boolean(userProfile.value.openid))
const displayName = computed(() => userProfile.value.nickname || '微信用户')
const avatarInitial = computed(() => displayName.value.slice(0, 1))
const profileSubtitle = computed(() => (
  isProfileLoading.value
    ? '正在同步学习数据'
    : isLoggedIn.value
      ? `探索者 ${displayName.value}`
      : '登录后开启个人学习档案'
))

const totalCount = computed(() => allQuestions.value.length)
const localFavoritedCount = computed(() => allQuestions.value.filter(item => item.isFavorited).length)
const localMasteredCount = computed(() => allQuestions.value.filter(item => item.mastery === 'mastered').length)
const localRetryCount = computed(() => allQuestions.value.filter(item => item.mastery === 'retry').length)
const favoritedCount = computed(() => growthSummary.value?.summary?.favoritedCount ?? localFavoritedCount.value)
const masteredCount = computed(() => growthSummary.value?.summary?.masteredCount ?? localMasteredCount.value)
const retryCount = computed(() => growthSummary.value?.summary?.retryCount ?? localRetryCount.value)
const learnedCount = computed(() => masteredCount.value + retryCount.value)
const weeklySolved = computed(() => growthSummary.value?.summary?.weeklySolved ?? Math.max(masteredCount.value, Math.min(14, learnedCount.value)))
const continuousDays = computed(() => Math.max(0, Math.min(99, userProfile.value.continuousDays || masteredCount.value + 1)))
const levelLabel = computed(() => Math.max(1, Math.min(9, userProfile.value.level || Math.ceil(learnedCount.value / 5))))
const favoriteQuestions = computed(() => allQuestions.value.filter(item => item.isFavorited))
const favoritePreviewQuestions = computed(() => favoriteQuestions.value.slice(0, 3))
const dailyChallenge = computed(() => growthSummary.value?.dailyChallenge || null)
const dailyChallengeStatus = computed(() => dailyChallenge.value?.status || 'unclaimed')
const dailyQuestion = computed(() => {
  const questionId = Number(dailyChallenge.value?.questionId)
  if (!Number.isFinite(questionId)) return null
  return allQuestions.value.find(item => item.id === questionId) || null
})
const dailyChallengeTitle = computed(() => {
  if (dailyChallengeStatus.value === 'completed') return '今日挑战已完成'
  if (dailyChallengeStatus.value === 'viewed') return '今日题已查看'
  if (dailyQuestion.value?.question) return dailyQuestion.value.question
  return '领取今天的面试题'
})
const dailyChallengeDesc = computed(() => {
  if (dailyChallengeStatus.value === 'completed') return '保持节奏，明天继续刷新新的航线'
  if (dailyChallengeStatus.value === 'viewed') return '展开解析或标记掌握后会记为完成'
  if (dailyQuestion.value?.category) return `${categoryLabelMap[dailyQuestion.value.category] || '题库'} · 点击继续挑战`
  return '每天固定一道题，跨设备也会保持一致'
})
const dailyChallengeBadge = computed(() => {
  const map = {
    completed: '完成',
    viewed: '查看',
    not_started: '开始',
    unclaimed: '领取'
  }
  return map[dailyChallengeStatus.value] || '领取'
})
const recentPracticeItems = computed(() => {
  const records = growthSummary.value?.recentRecords
  if (!Array.isArray(records)) return []

  const questionMap = new Map(allQuestions.value.map(question => [question.id, question]))
  return records.slice(0, 5).map((record) => {
    const question = questionMap.get(Number(record.questionId))
    return {
      ...record,
      questionId: Number(record.questionId),
      category: record.category || question?.category || '',
      questionTitle: question?.question || `题目 ID ${record.questionId}`,
      actionLabel: getPracticeActionLabel(record.action),
      timeLabel: formatPracticeTime(record.createdAt)
    }
  })
})
const recentLabItems = computed(() => {
  const records = growthSummary.value?.recentLabRecords
  if (!Array.isArray(records)) return []

  return records.map(item => ({
    ...item,
    labName: item.labName || '可视化实验室',
    actionLabel: getLabActionLabel(item.action),
    durationLabel: item.duration ? ` · ${Math.round(item.duration)} 秒` : '',
    timeLabel: formatPracticeTime(item.createdAt)
  }))
})

const masteryRate = computed(() => {
  if (growthSummary.value?.summary?.reviewRate) return growthSummary.value.summary.reviewRate
  const learned = masteredCount.value + retryCount.value
  if (!learned) return '0%'
  return `${Math.round((masteredCount.value / learned) * 100)}%`
})

const moduleProgress = computed(() => {
  const cloudProgress = growthSummary.value?.moduleProgress
  if (Array.isArray(cloudProgress) && cloudProgress.length) {
    return modules.map((module) => {
      const cloudModule = cloudProgress.find(item => item.category === module.key)
      const total = cloudModule?.total ?? allQuestions.value.filter(item => item.category === module.key).length
      return {
        ...module,
        total,
        mastered: cloudModule?.mastered || 0,
        percent: cloudModule?.percent || 0
      }
    }).filter(item => item.total > 0)
  }

  return modules.map((module) => {
    const list = allQuestions.value.filter(item => item.category === module.key)
    const mastered = list.filter(item => item.mastery === 'mastered').length
    const total = list.length || 1
    return {
      ...module,
      total: list.length,
      mastered,
      percent: Math.round((mastered / total) * 100)
    }
  }).filter(item => item.total > 0)
})

const topModules = computed(() => {
  const order = ['vue', 'js', 'css', 'net']
  const picked = order
    .map(key => moduleProgress.value.find(item => item.key === key))
    .filter(Boolean)
  if (picked.length >= 4) return picked
  const rest = moduleProgress.value.filter(item => !order.includes(item.key))
  return [...picked, ...rest].slice(0, 4)
})

const topMasteredModule = computed(() => {
  const sorted = [...moduleProgress.value].sort((a, b) => b.mastered - a.mastered)
  return sorted[0]?.name || 'JS'
})

const badges = computed(() => ([
  { kicker: `${continuousDays.value}D`, title: '连续学习' },
  { kicker: topMasteredModule.value, title: '进阶达人' },
  { kicker: '★', title: '收藏家' }
]))

function goToModule(key) {
  Taro.navigateTo({ url: `/pages/questionList/index?key=${key}` })
}

function goQuestionHub() {
  Taro.navigateTo({ url: '/pages/moduleHub/index' })
}

function goLab() {
  Taro.navigateTo({ url: '/pages/threeDemo/index' })
}

function goFavorites() {
  Taro.navigateTo({ url: '/pages/favorites/index' })
}

function goFavoriteDetail(id, index) {
  const ids = favoriteQuestions.value.map(item => item.id).join(',')
  Taro.navigateTo({
    url: `/pages/normalQuestionDetail/index?id=${id}&key=favorites&index=${index}&ids=${ids}`
  })
}

function goPracticeDetail(item) {
  if (!item.questionId) return
  Taro.navigateTo({
    url: `/pages/normalQuestionDetail/index?id=${item.questionId}&key=${item.category || ''}`
  })
}

async function goDailyChallenge() {
  let questionId = Number(dailyChallenge.value?.questionId)

  if (!Number.isFinite(questionId) || questionId <= 0) {
    try {
      const result = await getDailyQuestionByCloud({
        questionIds: allQuestions.value.map(question => question.id)
      })
      questionId = Number(result?.questionId)
      await loadGrowthSummary()
    } catch (error) {
      Taro.showToast({ title: '领取今日题失败', icon: 'none' })
      return
    }
  }

  if (!Number.isFinite(questionId) || questionId <= 0) return
  Taro.navigateTo({
    url: `/pages/normalQuestionDetail/index?id=${questionId}&key=daily&daily=1&ids=${questionId}`
  })
}

function getPracticeActionLabel(action) {
  const map = {
    view: '查看题目',
    answer: '展开解析',
    mastered: '标记掌握',
    retry: '加入复习'
  }
  return map[action] || '练习'
}

function getLabActionLabel(action) {
  const map = {
    view: '进入实验室',
    enter: '打开实验',
    leave: '停留结束'
  }
  return map[action] || '实验记录'
}

function formatPracticeTime(value) {
  if (!value) return '刚刚'
  const dateValue = value instanceof Date
    ? value
    : new Date(value?._date || value)
  const time = dateValue.getTime()
  if (!Number.isFinite(time)) return '刚刚'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function getTotalsByCategory() {
  return modules.reduce((result, module) => {
    result[module.key] = allQuestions.value.filter(item => item.category === module.key).length
    return result
  }, {})
}

async function loadGrowthSummary() {
  if (!isLoggedIn.value) return

  try {
    const result = await getGrowthSummaryByCloud({
      totalsByCategory: getTotalsByCategory()
    })
    if (result?.success) {
      growthSummary.value = result
      userProfile.value = {
        ...userProfile.value,
        ...(result.user || {})
      }
      Taro.setStorageSync('user_profile', userProfile.value)
    }
  } catch (error) {
    console.log('成长统计同步失败', error)
  }
}

async function refreshQuestionStates() {
  try {
    const questions = await syncCloudQuestionStates()
    allQuestions.value = questions
  } catch (error) {
    console.log('题目状态同步失败', error)
    allQuestions.value = loadQuestions()
  }
}

async function drawGuestCore() {
  if (isLoggedIn.value) return

  await nextTick()
  Taro.createSelectorQuery()
    .select('#guest-core-canvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      const result = res?.[0]
      const canvas = result?.node
      if (!canvas) return

      const width = result.width || 150
      const height = result.height || 150
      const dpr = Taro.getSystemInfoSync().pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) * 0.38

      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.18)
      halo.addColorStop(0, 'rgba(107, 255, 224, 0.62)')
      halo.addColorStop(0.42, 'rgba(31, 205, 217, 0.16)')
      halo.addColorStop(1, 'rgba(25, 146, 255, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2)
      ctx.fill()

      const shell = ctx.createRadialGradient(cx - 18, cy - 20, 2, cx, cy, radius)
      shell.addColorStop(0, 'rgba(183, 255, 240, 0.96)')
      shell.addColorStop(0.2, 'rgba(64, 238, 218, 0.82)')
      shell.addColorStop(0.58, 'rgba(18, 83, 101, 0.42)')
      shell.addColorStop(1, 'rgba(7, 15, 31, 0.9)')
      ctx.fillStyle = shell
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 0; i < 26; i += 1) {
        const r = radius * (0.18 + i * 0.024)
        const start = i * 0.68
        const end = start + Math.PI * (0.86 + (i % 5) * 0.12)
        ctx.strokeStyle = `rgba(${55 + i * 4}, 245, 225, ${0.09 + (i % 6) * 0.025})`
        ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.8
        ctx.beginPath()
        ctx.arc(cx, cy, r, start, end)
        ctx.stroke()
      }

      for (let i = 0; i < 58; i += 1) {
        const angle = i * 2.399
        const r = radius * (0.16 + ((i * 17) % 100) / 120)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        const size = i % 9 === 0 ? 2.1 : 1
        ctx.fillStyle = i % 7 === 0 ? 'rgba(127, 255, 224, 0.95)' : 'rgba(64, 219, 255, 0.62)'
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.23)
      core.addColorStop(0, '#ffffff')
      core.addColorStop(0.35, '#9ffff1')
      core.addColorStop(1, 'rgba(68, 239, 216, 0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 0.24, 0, Math.PI * 2)
      ctx.fill()
    })
}

async function handleLoginRegister() {
  await loadUserProfile({ showSuccess: true })
}

async function handleChooseAvatar(event) {
  const avatarUrl = event.detail?.avatarUrl || ''
  if (!avatarUrl) return

  await saveProfilePatch({ avatarUrl }, '头像已更新')
}

function getAvatarExtension(filePath) {
  const match = String(filePath).match(/\.(png|jpg|jpeg|webp)$/i)
  return match?.[1]?.toLowerCase() || 'png'
}

async function saveProfilePatch(patch, successTitle = '资料已更新') {
  if (isProfileSaving.value) return

  isProfileSaving.value = true
  try {
    let avatarUrl = patch.avatarUrl ?? userProfile.value.avatarUrl
    if (avatarUrl && !avatarUrl.startsWith('cloud://') && !avatarUrl.startsWith('http')) {
      const ext = getAvatarExtension(avatarUrl)
      avatarUrl = await uploadCloudFile(`avatars/${Date.now()}.${ext}`, avatarUrl)
    }

    const nextProfile = {
      nickname: patch.nickname ?? userProfile.value.nickname,
      avatarUrl
    }
    const result = await updateUserProfileByCloud(nextProfile)
    userProfile.value = {
      ...userProfile.value,
      ...(result?.user || nextProfile)
    }
    Taro.setStorageSync('user_profile', userProfile.value)
    Taro.showToast({ title: successTitle, icon: 'success' })
  } catch (error) {
    Taro.showToast({ title: '资料保存失败', icon: 'none' })
  } finally {
    isProfileSaving.value = false
  }
}

function openNicknameEditor() {
  draftNickname.value = userProfile.value.nickname || ''
  isNicknameEditing.value = true
}

async function saveNickname() {
  const nickname = draftNickname.value.trim()
  if (!nickname) {
    Taro.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  await saveProfilePatch({ nickname }, '昵称已更新')
  isNicknameEditing.value = false
}

async function loadUserProfile(options = {}) {
  if (isProfileLoading.value) return

  isProfileLoading.value = true
  try {
    const result = await loginByCloud()
    if (result?.user) {
      userProfile.value = {
        openid: result.openid || userProfile.value.openid || '',
        nickname: result.user.nickname || userProfile.value.nickname || '',
        avatarUrl: result.user.avatarUrl || userProfile.value.avatarUrl || '',
        level: result.user.level || 1,
        continuousDays: result.user.continuousDays || 0,
        lastStudyDate: result.user.lastStudyDate || ''
      }
      Taro.setStorageSync('user_profile', userProfile.value)
      if (options.showSuccess) {
        Taro.showToast({ title: '登录成功', icon: 'success' })
      }
      loadGrowthSummary()
    }
  } catch (error) {
    const cachedProfile = Taro.getStorageSync('user_profile')
    if (cachedProfile && typeof cachedProfile === 'object') {
      userProfile.value = {
        ...userProfile.value,
        ...cachedProfile
      }
    }
    if (options.showSuccess) {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  } finally {
    isProfileLoading.value = false
  }
}

useDidShow(() => {
  allQuestions.value = loadQuestions()
  refreshQuestionStates()
  loadUserProfile()
  loadGrowthSummary()
  drawGuestCore()
})

onMounted(() => {
  drawGuestCore()
})
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.growth-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #101a35 0%, #070b18 100%);
  color: #f5f8ff;
}

.growth-content {
  padding: 0 fig(23) calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.guest-content {
  padding: fig(4) fig(23) calc(150rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.guest-core-canvas {
  display: block;
  width: fig(152);
  height: fig(152);
  margin: fig(12) auto 0;
}

.guest-title,
.guest-desc,
.login-button text,
.feature-title,
.feature-desc,
.guest-section-title,
.guest-section-link,
.guest-module-name,
.guest-module-planet text {
  display: block;
}

.guest-title {
  margin-top: fig(8);
  color: #f4f8ff;
  font-size: fig(25);
  font-weight: 900;
  line-height: fig(32);
  text-align: center;
}

.guest-desc {
  width: fig(292);
  margin: fig(9) auto 0;
  color: #aebdd4;
  font-size: fig(13);
  line-height: fig(20);
  text-align: center;
}

.login-button {
  height: fig(48);
  margin-top: fig(25);
  border-radius: fig(10);
  background: linear-gradient(90deg, #7acdf2 0%, #17c7f2 100%);
  box-shadow: 0 fig(10) fig(24) rgba(24, 197, 242, 0.22);
  text-align: center;
}

.login-button text {
  color: #071d2d;
  font-size: fig(14);
  font-weight: 800;
  line-height: fig(48);
}

.guest-feature-list {
  margin-top: fig(24);
}

.guest-feature-card {
  display: flex;
  align-items: center;
  min-height: fig(80);
  margin-bottom: fig(14);
  padding: fig(16);
  border-radius: fig(10);
  border: 1px solid rgba(70, 107, 133, 0.42);
  background: rgba(20, 34, 43, 0.92);
  box-sizing: border-box;
}

.feature-icon {
  flex-shrink: 0;
  width: fig(44);
  height: fig(44);
  border-radius: fig(8);
  text-align: center;
}

.feature-icon text {
  color: #b8f5ff;
  font-size: fig(20);
  font-weight: 900;
  line-height: fig(44);
}

.feature-progress {
  background: #1f657c;
}

.feature-favorite {
  background: #1e7446;
}

.feature-daily {
  background: #74532a;
}

.feature-copy {
  min-width: 0;
  margin-left: fig(14);
}

.feature-title {
  color: #edf5ff;
  font-size: fig(17);
  font-weight: 800;
  line-height: fig(22);
}

.feature-desc {
  margin-top: fig(5);
  color: #9dacbd;
  font-size: fig(12);
  font-weight: 600;
  line-height: fig(18);
}

.guest-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: fig(22);
}

.guest-section-title {
  color: #f4f8ff;
  font-size: fig(19);
  font-weight: 900;
  line-height: fig(25);
}

.guest-section-link {
  color: #75e9ff;
  font-size: fig(12);
  font-weight: 800;
  line-height: fig(18);
}

.guest-module-scroll {
  margin-top: fig(12);
  white-space: nowrap;
}

.guest-module-row {
  display: inline-flex;
  padding-right: fig(23);
}

.guest-module-card {
  width: fig(124);
  height: fig(118);
  margin-right: fig(14);
  padding-top: fig(16);
  border-radius: fig(10);
  border: 1px solid rgba(70, 107, 133, 0.42);
  background: rgba(20, 34, 43, 0.92);
  text-align: center;
  box-sizing: border-box;
}

.guest-module-planet {
  width: fig(48);
  height: fig(48);
  margin: 0 auto;
  border-radius: 50%;
  text-align: center;
}

.guest-module-planet text {
  color: #102034;
  font-size: fig(11);
  font-weight: 900;
  line-height: fig(48);
}

.planet-vue {
  background: radial-gradient(circle at 35% 30%, #b8ffd4 0%, #53f58e 58%, #0c7b42 100%);
  box-shadow: 0 0 fig(18) rgba(83, 245, 142, 0.3);
}

.planet-react {
  background: radial-gradient(circle at 35% 30%, #ffe1b7 0%, #ffc073 58%, #9c5c21 100%);
  box-shadow: 0 0 fig(18) rgba(255, 192, 115, 0.28);
}

.planet-net {
  background: radial-gradient(circle at 35% 30%, #c6efff 0%, #82d9ff 58%, #235f8a 100%);
  box-shadow: 0 0 fig(18) rgba(130, 217, 255, 0.28);
}

.planet-css {
  background: radial-gradient(circle at 35% 30%, #d3e5ff 0%, #64aaff 58%, #194f9a 100%);
  box-shadow: 0 0 fig(18) rgba(100, 170, 255, 0.28);
}

.guest-module-name {
  margin-top: fig(13);
  color: #cdd7e6;
  font-size: fig(12);
  font-weight: 800;
  line-height: fig(16);
}

.profile-card {
  display: flex;
  align-items: center;
  margin-top: fig(4);
  padding: fig(14);
  border-radius: fig(16);
  border: 1px solid rgba(33, 58, 105, 0.74);
  background: #101a2f;
  box-sizing: border-box;
}

.profile-avatar-button {
  flex-shrink: 0;
  width: fig(54);
  height: fig(54);
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: rgba(20, 49, 97, 0.88);
  box-shadow: 0 0 fig(16) rgba(65, 230, 255, 0.22);
}

.profile-avatar-button::after {
  border: 0;
}

.profile-avatar-image,
.profile-avatar-placeholder {
  width: fig(54);
  height: fig(54);
  border-radius: 50%;
}

.profile-avatar-placeholder {
  background: radial-gradient(circle at 35% 30%, #b5f6ff 0%, #4dddfb 54%, #1c6da7 100%);
  text-align: center;
}

.profile-avatar-placeholder text {
  color: #062141;
  font-size: fig(20);
  font-weight: 900;
  line-height: fig(54);
}

.profile-copy {
  min-width: 0;
  flex: 1;
  margin-left: fig(14);
}

.profile-name-row {
  display: flex;
  align-items: center;
}

.profile-name,
.profile-desc,
.edit-name-button text,
.nickname-input,
.save-profile-button text {
  display: block;
}

.profile-name {
  max-width: fig(190);
  color: #f5f8ff;
  font-size: fig(18);
  font-weight: 800;
  line-height: fig(24);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-name-button {
  width: fig(28);
  height: fig(28);
  margin-left: fig(8);
  border-radius: 50%;
  background: #173a56;
  text-align: center;
}

.edit-name-button text {
  color: #75e9ff;
  font-size: fig(13);
  line-height: fig(28);
}

.profile-desc {
  margin-top: fig(4);
  color: #8ea3ce;
  font-size: fig(12);
  line-height: fig(17);
}

.nickname-editor {
  margin-top: fig(10);
  padding: fig(12);
  border-radius: fig(14);
  border: 1px solid rgba(33, 58, 105, 0.74);
  background: #101a2f;
  box-sizing: border-box;
}

.nickname-input {
  height: fig(42);
  padding: 0 fig(14);
  border-radius: fig(10);
  background: #0f1b25;
  color: #f4f8ff;
  font-size: fig(13);
  box-sizing: border-box;
}

.nickname-placeholder {
  color: #73849c;
}

.save-profile-button {
  height: fig(42);
  margin-top: fig(10);
  border-radius: fig(10);
  background: #173a56;
  text-align: center;
}

.save-profile-button text {
  color: #75e9ff;
  font-size: fig(13);
  font-weight: 800;
  line-height: fig(42);
}

.streak-card {
  margin-top: fig(10);
  padding: fig(14) fig(14) fig(12);
  border-radius: fig(18);
  border: 1px solid rgba(51, 142, 186, 0.58);
  background: linear-gradient(135deg, #172f5e 0%, #1a2a51 46%, #2b1758 100%);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.streak-kicker,
.streak-value,
.streak-unit,
.streak-desc,
.level-orb text,
.badge-kicker,
.badge-title {
  display: block;
}

.streak-kicker {
  color: #42e7ff;
  font-size: fig(12);
  font-weight: 700;
  line-height: fig(17);
}

.streak-main {
  display: flex;
  align-items: baseline;
  margin-top: fig(6);
}

.streak-value {
  color: #f5f8ff;
  font-size: fig(30);
  font-weight: 800;
  line-height: fig(34);
}

.streak-unit {
  margin-left: fig(5);
  color: #e1edff;
  font-size: fig(18);
  font-weight: 700;
  line-height: fig(24);
}

.streak-desc {
  margin-top: fig(3);
  color: #a8b8d9;
  font-size: fig(12);
  line-height: fig(17);
}

.level-orb {
  position: absolute;
  right: fig(16);
  top: fig(18);
  width: fig(58);
  height: fig(58);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #b5f6ff 0%, #4dddfb 54%, #1c6da7 100%);
  text-align: center;
}

.level-orb text {
  color: #062141;
  font-size: fig(12);
  font-weight: 800;
  line-height: fig(58);
}

.daily-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: fig(10);
  padding: fig(14);
  border-radius: fig(16);
  border: 1px solid rgba(51, 142, 186, 0.5);
  background: #101a2f;
  box-sizing: border-box;
}

.daily-copy {
  min-width: 0;
  flex: 1;
  padding-right: fig(12);
}

.daily-kicker,
.daily-title,
.daily-desc,
.daily-status-orb text {
  display: block;
}

.daily-kicker {
  color: #45e4ff;
  font-size: fig(11);
  font-weight: 800;
  line-height: fig(16);
}

.daily-title {
  margin-top: fig(5);
  color: #f5f8ff;
  font-size: fig(15);
  font-weight: 800;
  line-height: fig(20);
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.daily-desc {
  margin-top: fig(5);
  color: #8fa4ca;
  font-size: fig(11);
  line-height: fig(16);
}

.daily-status-orb {
  flex-shrink: 0;
  width: fig(54);
  height: fig(54);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #d3e5ff 0%, #64aaff 58%, #194f9a 100%);
  text-align: center;
}

.daily-status-orb text {
  color: #071d2d;
  font-size: fig(12);
  font-weight: 900;
  line-height: fig(54);
}

.daily-completed {
  border-color: rgba(69, 211, 157, 0.58);
}

.daily-completed .daily-status-orb {
  background: radial-gradient(circle at 35% 30%, #b8ffd4 0%, #53f58e 58%, #0c7b42 100%);
}

.daily-viewed {
  border-color: rgba(255, 213, 109, 0.5);
}

.daily-viewed .daily-status-orb {
  background: radial-gradient(circle at 35% 30%, #fff3bd 0%, #ffd56d 58%, #9d6a1f 100%);
}

.summary-grid {
  margin-top: fig(12);
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.summary-card {
  width: 31.6%;
  margin-bottom: 0;
  padding: fig(12) fig(10);
  border-radius: fig(14);
  border: 1px solid rgba(33, 58, 105, 0.74);
  background: #101a2f;
  box-sizing: border-box;
}

.summary-label,
.summary-value,
.panel-title,
.panel-meta,
.module-name,
.module-ratio {
  display: block;
}

.summary-label {
  color: #8ea3ce;
  font-size: fig(11);
  line-height: fig(15);
  margin-top: fig(4);
}

.summary-value {
  margin-top: 0;
  color: #41e6ff;
  font-size: fig(20);
  font-weight: 800;
  line-height: fig(24);
}

.panel {
  margin-top: fig(12);
  padding: fig(14);
  border-radius: fig(16);
  border: 1px solid rgba(33, 58, 105, 0.74);
  background: #101a2f;
  box-sizing: border-box;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  color: #e7f1ff;
  font-size: fig(14);
  font-weight: 700;
  line-height: fig(20);
  position: relative;
  padding-left: fig(8);
}

.panel-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: fig(3);
  height: fig(14);
  border-radius: fig(2);
  background: #41e6ff;
  transform: translateY(-50%);
}

.panel-meta {
  color: #7e93be;
  font-size: fig(11);
  line-height: fig(16);
}

.panel-meta.link {
  color: #45e4ff;
  text-decoration: underline;
}

.progress-row {
  margin-top: fig(10);
}

.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.module-name {
  color: #cfe0ff;
  font-size: fig(12);
  line-height: fig(17);
}

.module-ratio {
  color: #45d39d;
  font-size: fig(12);
  line-height: fig(17);
}

.progress-row {
  position: relative;
  padding-right: fig(12);
}

.progress-row::after {
  content: '›';
  position: absolute;
  right: 0;
  top: fig(1);
  color: #667da8;
  font-size: fig(14);
  line-height: fig(16);
}

.progress-track {
  height: fig(7);
  margin-top: fig(6);
  border-radius: fig(999);
  background: #1a2744;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  min-width: fig(4);
  border-radius: fig(999);
}

.progress-fill.tone-vue {
  background: linear-gradient(90deg, #49d9b1 0%, #58e3b4 100%);
}

.progress-fill.tone-js {
  background: linear-gradient(90deg, #f6c14f 0%, #ffd56d 100%);
}

.progress-fill.tone-css {
  background: linear-gradient(90deg, #56a9ff 0%, #75b9ff 100%);
}

.progress-fill.tone-net {
  background: linear-gradient(90deg, #41d9ff 0%, #57e3ff 100%);
}

.progress-fill:not(.tone-vue):not(.tone-js):not(.tone-css):not(.tone-net) {
  background: linear-gradient(90deg, #35d5ff 0%, #45d39d 100%);
}

.favorite-preview-list {
  margin-top: fig(10);
}

.favorite-preview-card {
  margin-top: fig(8);
  padding: fig(11) fig(12);
  border-radius: fig(12);
  background: #111f39;
  box-sizing: border-box;
}

.favorite-preview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.favorite-category,
.favorite-star,
.favorite-title,
.favorite-empty-title,
.favorite-empty-desc {
  display: block;
}

.favorite-category {
  color: #41e6ff;
  font-size: fig(11);
  font-weight: 800;
  line-height: fig(16);
}

.favorite-star {
  color: #ffd54f;
  font-size: fig(15);
  line-height: fig(16);
}

.favorite-title {
  margin-top: fig(6);
  color: #dce8ff;
  font-size: fig(12);
  font-weight: 600;
  line-height: fig(18);
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.favorite-empty {
  margin-top: fig(10);
  padding: fig(16) fig(12);
  border-radius: fig(12);
  border: 1px dashed rgba(65, 230, 255, 0.28);
  background: rgba(17, 31, 57, 0.68);
  text-align: center;
}

.favorite-empty-title {
  color: #dce8ff;
  font-size: fig(13);
  font-weight: 800;
  line-height: fig(18);
}

.favorite-empty-desc {
  margin-top: fig(5);
  color: #8ea3ce;
  font-size: fig(11);
  line-height: fig(16);
}

.recent-practice-list {
  margin-top: fig(10);
}

.recent-practice-card {
  margin-top: fig(8);
  padding: fig(11) fig(12);
  border-radius: fig(12);
  border: 1px solid rgba(39, 73, 125, 0.68);
  background: #111f39;
  box-sizing: border-box;
}

.recent-practice-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recent-action,
.recent-time,
.recent-title,
.recent-category,
.recent-empty-title,
.recent-empty-desc {
  display: block;
}

.recent-action {
  color: #45e4ff;
  font-size: fig(11);
  font-weight: 800;
  line-height: fig(16);
}

.recent-time {
  color: #7f91b7;
  font-size: fig(10);
  line-height: fig(16);
}

.recent-title {
  margin-top: fig(6);
  color: #dce8ff;
  font-size: fig(12);
  font-weight: 600;
  line-height: fig(18);
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recent-category {
  margin-top: fig(6);
  color: #8ea3ce;
  font-size: fig(10);
  line-height: fig(14);
}

.recent-empty {
  margin-top: fig(10);
  padding: fig(16) fig(12);
  border-radius: fig(12);
  border: 1px dashed rgba(69, 211, 157, 0.32);
  background: rgba(17, 31, 57, 0.68);
  text-align: center;
}

.recent-empty-title {
  color: #dce8ff;
  font-size: fig(13);
  font-weight: 800;
  line-height: fig(18);
}

.recent-empty-desc {
  margin-top: fig(5);
  color: #8ea3ce;
  font-size: fig(11);
  line-height: fig(16);
}

.recent-lab-list {
  margin-top: fig(10);
}

.recent-lab-card {
  margin-top: fig(8);
  padding: fig(11) fig(12);
  border-radius: fig(12);
  border: 1px solid rgba(65, 230, 255, 0.18);
  background: #111f39;
  box-sizing: border-box;
}

.recent-lab-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recent-lab-name,
.recent-lab-time,
.recent-lab-desc,
.recent-lab-empty-title,
.recent-lab-empty-desc {
  display: block;
}

.recent-lab-name {
  color: #dce8ff;
  font-size: fig(12);
  font-weight: 800;
  line-height: fig(18);
}

.recent-lab-time {
  color: #7f91b7;
  font-size: fig(10);
  line-height: fig(16);
}

.recent-lab-desc {
  margin-top: fig(5);
  color: #45e4ff;
  font-size: fig(11);
  line-height: fig(16);
}

.recent-lab-empty {
  margin-top: fig(10);
  padding: fig(16) fig(12);
  border-radius: fig(12);
  border: 1px dashed rgba(65, 230, 255, 0.28);
  background: rgba(17, 31, 57, 0.68);
  text-align: center;
}

.recent-lab-empty-title {
  color: #dce8ff;
  font-size: fig(13);
  font-weight: 800;
  line-height: fig(18);
}

.recent-lab-empty-desc {
  margin-top: fig(5);
  color: #8ea3ce;
  font-size: fig(11);
  line-height: fig(16);
}

.badge-row {
  display: flex;
  justify-content: space-between;
  margin-top: fig(10);
}

.badge-card {
  width: 31.6%;
  padding: fig(12) fig(8);
  border-radius: fig(14);
  background: #111f39;
  text-align: center;
  box-sizing: border-box;
}

.badge-kicker {
  color: #45e4ff;
  font-size: fig(18);
  font-weight: 800;
  line-height: fig(22);
}

.badge-title {
  margin-top: fig(6);
  color: #cfe0ff;
  font-size: fig(12);
  line-height: fig(18);
}
</style>
