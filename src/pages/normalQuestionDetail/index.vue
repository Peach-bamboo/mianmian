<template>
  <view class="detail-page">
    <CosmosHeadbar
      title="题目详情"
      :subtitle="categoryLabel"
      :meta="progressText"
      :show-back="true"
      :top-offset="16"
      @back="goBack"
    />

    <view v-if="currentQuestion" class="detail-content">
      <view class="question-card">
        <view class="question-head">
          <text class="question-no">第 {{ currentIndex + 1 }} 题</text>
          <view class="favorite-btn" @tap="toggleFavorite">
            <text>{{ currentQuestion.isFavorited ? '★' : '☆' }}</text>
          </view>
        </view>
        <text class="question-text">{{ currentQuestion.question }}</text>
      </view>

      <view class="answer-card">
        <view class="answer-head" @tap="toggleAnswer">
          <text class="answer-title">解析</text>
          <text class="answer-toggle">{{ showAnswer ? '收起' : '展开' }}</text>
        </view>
        <text v-if="showAnswer" class="answer-text">{{ currentQuestion.answer }}</text>
      </view>

      <view class="mastery-row">
        <view
          class="mastery-btn"
          :class="{ active: currentQuestion.mastery === 'retry' }"
          @tap="setMastery('retry')"
        >
          <text>待复习</text>
        </view>
        <view
          class="mastery-btn"
          :class="{ active: currentQuestion.mastery === 'mastered' }"
          @tap="setMastery('mastered')"
        >
          <text>已掌握</text>
        </view>
      </view>

      <view class="pager-row">
        <view class="pager-btn" :class="{ disabled: currentIndex <= 0 }" @tap="goPrev">
          <text>上一题</text>
        </view>
        <view class="pager-btn primary" :class="{ disabled: currentIndex >= questionPool.length - 1 }" @tap="goNext">
          <text>下一题</text>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text>未找到题目数据</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import questionsData from '../../data/questions.json'
import { toggleFavoriteByCloud, updateMasteryByCloud } from '../../services/questionState'
import { addPracticeRecordByCloud } from '../../services/cloud'

const router = useRouter()
const currentIndex = ref(0)
const showAnswer = ref(false)
const questionPool = ref([])
const allQuestions = ref([])
const viewedQuestionIds = ref(new Set())

function parseIdsParam(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map(id => Number(id))
    .filter(id => Number.isFinite(id))
}

function loadAllQuestions() {
  const stored = Taro.getStorageSync('questions')
  if (Array.isArray(stored) && stored.length) return stored
  return questionsData
}

function buildQuestionPool() {
  const idParam = Number(router.params.id)
  const keyParam = router.params.key || ''
  const indexParam = Number(router.params.index || 0)
  const idsFromRoute = parseIdsParam(router.params.ids)
  const all = loadAllQuestions()
  allQuestions.value = all

  if (idsFromRoute.length) {
    const lookup = new Map(all.map(item => [item.id, item]))
    questionPool.value = idsFromRoute
      .map(id => lookup.get(id))
      .filter(Boolean)
  } else if (keyParam === 'favorites') {
    questionPool.value = all.filter(item => item.isFavorited)
  } else if (keyParam && keyParam !== 'random') {
    questionPool.value = all.filter(item => item.category === keyParam)
  } else {
    questionPool.value = all
  }

  if (!questionPool.value.length) {
    currentIndex.value = 0
    return
  }

  const indexById = questionPool.value.findIndex(item => item.id === idParam)
  if (indexById >= 0) {
    currentIndex.value = indexById
  } else if (Number.isFinite(indexParam) && indexParam >= 0 && indexParam < questionPool.value.length) {
    currentIndex.value = indexParam
  } else {
    currentIndex.value = 0
  }
}

buildQuestionPool()

const currentQuestion = computed(() => questionPool.value[currentIndex.value] || null)

const progressText = computed(() => {
  if (!questionPool.value.length) return '0/0'
  return `${currentIndex.value + 1}/${questionPool.value.length}`
})

const categoryLabel = computed(() => {
  const map = {
    html: 'HTML 星系',
    css: 'CSS 星系',
    js: 'JavaScript 星系',
    vue: 'Vue 星系',
    react: 'React 星系',
    node: 'Node 星系',
    applet: '小程序星系',
    net: '网络星系',
    arithmetic: '算法星系'
  }
  const key = currentQuestion.value?.category
  return map[key] || '前端题库'
})

const practiceMode = computed(() => {
  const key = router.params.key || ''
  if (key === 'favorites') return 'favorites'
  if (key === 'random') return 'random'
  if (router.params.daily) return 'daily'
  return 'module'
})

async function recordPractice(action, options = {}) {
  const question = currentQuestion.value
  if (!question) return

  if (action === 'view' && options.once) {
    const questionId = question.id
    if (viewedQuestionIds.value.has(questionId)) return
    viewedQuestionIds.value = new Set([...viewedQuestionIds.value, questionId])
  }

  try {
    await addPracticeRecordByCloud({
      mode: practiceMode.value,
      questionId: question.id,
      category: question.category,
      action
    })
  } catch (error) {
    console.warn('add practice record failed', error)
  }
}

function syncQuestionPatch(patch) {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  let patchedQuestion = null
  const nextAll = allQuestions.value.map((item) => (
    item.id === id ? (patchedQuestion = { ...item, ...patch }) : item
  ))
  allQuestions.value = nextAll
  Taro.setStorageSync('questions', nextAll)

  questionPool.value = questionPool.value.map((item) => (
    item.id === id ? { ...item, ...patch } : item
  ))

  return patchedQuestion
}

async function toggleFavorite() {
  if (!currentQuestion.value) return
  const patchedQuestion = syncQuestionPatch({ isFavorited: !currentQuestion.value.isFavorited })
  try {
    await toggleFavoriteByCloud(patchedQuestion)
  } catch (error) {
    Taro.showToast({ title: '收藏已本地保存，云端同步失败', icon: 'none' })
  }
}

function toggleAnswer() {
  showAnswer.value = !showAnswer.value
  if (showAnswer.value) {
    recordPractice('answer')
  }
}

async function setMastery(status) {
  if (!currentQuestion.value) return
  const patchedQuestion = syncQuestionPatch({ mastery: status })
  try {
    await updateMasteryByCloud(patchedQuestion)
    await recordPractice(status)
  } catch (error) {
    Taro.showToast({ title: '进度已本地保存，云端同步失败', icon: 'none' })
  }
}

function goPrev() {
  if (currentIndex.value <= 0) return
  currentIndex.value -= 1
  showAnswer.value = false
  recordPractice('view', { once: true })
}

function goNext() {
  if (currentIndex.value >= questionPool.value.length - 1) return
  currentIndex.value += 1
  showAnswer.value = false
  recordPractice('view', { once: true })
}

function goBack() {
  Taro.navigateBack({ delta: 1 })
}

useDidShow(() => {
  recordPractice('view', { once: true })
})
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.detail-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #101a35 0%, #070b18 100%);
  color: #f5f8ff;
}

.detail-content {
  padding: 0 fig(23) calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.question-card,
.answer-card {
  border-radius: fig(18);
  border: 1px solid rgba(33, 58, 105, 0.85);
  background: #101a2f;
  box-shadow: 0 fig(8) fig(28) rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.question-card {
  margin-top: fig(10);
  padding: fig(16) fig(16) fig(18);
}

.question-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.question-no {
  color: #41e6ff;
  font-size: fig(12);
  font-weight: 700;
  line-height: fig(16);
}

.favorite-btn {
  width: fig(26);
  height: fig(26);
  border-radius: 50%;
  background: #1b2b4a;
  text-align: center;
}

.favorite-btn text {
  color: #ffd54f;
  font-size: fig(16);
  line-height: fig(26);
}

.question-text {
  display: block;
  margin-top: fig(11);
  color: #f5f8ff;
  font-size: fig(18);
  font-weight: 700;
  line-height: fig(25);
}

.answer-card {
  margin-top: fig(12);
  padding: fig(14) fig(16) fig(16);
}

.answer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.answer-title {
  color: #9db2db;
  font-size: fig(13);
  font-weight: 700;
  line-height: fig(18);
}

.answer-toggle {
  color: #41e6ff;
  font-size: fig(12);
  line-height: fig(18);
}

.answer-text {
  display: block;
  margin-top: fig(10);
  color: #c5d4ef;
  font-size: fig(13);
  line-height: fig(21);
  white-space: pre-wrap;
  word-break: break-word;
}

.mastery-row {
  display: flex;
  gap: fig(10);
  margin-top: fig(12);
}

.mastery-btn {
  flex: 1;
  height: fig(38);
  border-radius: fig(14);
  background: #121f3a;
  border: 1px solid rgba(42, 70, 125, 0.82);
  text-align: center;
}

.mastery-btn text {
  color: #94a7ce;
  font-size: fig(13);
  font-weight: 600;
  line-height: fig(38);
}

.mastery-btn.active {
  border-color: rgba(65, 230, 255, 0.75);
  background: rgba(29, 74, 109, 0.55);
}

.mastery-btn.active text {
  color: #41e6ff;
}

.pager-row {
  display: flex;
  gap: fig(10);
  margin-top: fig(12);
}

.pager-btn {
  flex: 1;
  height: fig(42);
  border-radius: fig(15);
  background: #162744;
  text-align: center;
}

.pager-btn text {
  color: #c4d5f3;
  font-size: fig(14);
  font-weight: 700;
  line-height: fig(42);
}

.pager-btn.primary {
  background: linear-gradient(135deg, #1d66c0 0%, #2b46c2 100%);
}

.pager-btn.primary text {
  color: #eef5ff;
}

.pager-btn.disabled {
  opacity: 0.45;
}

.empty-state {
  padding: fig(80) fig(23);
}

.empty-state text {
  color: #8aa1cc;
  font-size: fig(14);
}
</style>
