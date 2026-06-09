<template>
  <view class="question-list-page">
    <CosmosHeadbar
      :title="pageTitle"
      :subtitle="pageSubtitle"
      :meta="`${filteredQuestions.length} 题`"
      :show-back="true"
      :top-offset="16"
      @back="goBack"
    />

    <view class="list-content">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          v-model="searchText"
          class="search-input"
          placeholder="搜索题干关键词"
          placeholder-class="search-placeholder"
        />
      </view>

      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="item in filters"
            :key="item.key"
            class="filter-chip"
            :class="{ active: activeFilter === item.key }"
            @tap="activeFilter = item.key"
          >
            <text>{{ item.name }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="summary-row">
        <text>{{ filteredQuestions.length }} 道可练习</text>
        <text class="summary-meta">总计 {{ sourceQuestions.length }} 题</text>
      </view>

      <view v-if="filteredQuestions.length" class="question-list">
        <view
          v-for="(question, index) in filteredQuestions"
          :key="question.id"
          class="question-card"
          @tap="goToDetailPage(question.id, index)"
        >
          <view class="card-top">
            <text class="question-index">第 {{ index + 1 }} 题</text>
            <view class="question-states">
              <text v-if="question.isFavorited" class="state-fav">已收藏</text>
              <text
                v-if="question.mastery"
                class="state-mastery"
                :class="{ mastered: question.mastery === 'mastered' }"
              >
                {{ question.mastery === 'mastered' ? '已掌握' : '待复习' }}
              </text>
            </view>
          </view>
          <text class="question-text">{{ question.question }}</text>
          <view class="card-bottom">
            <text class="question-id">ID {{ question.id }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
        <view v-if="hasMore && !searchText && activeFilter === 'all'" class="load-more">
          <text>{{ isLoading ? '加载中...' : '上滑加载更多' }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-title">没有匹配到题目</text>
        <text class="empty-desc">可以切换筛选或清空搜索后再试试</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import Taro, { useDidShow, useReachBottom, useRouter } from '@tarojs/taro'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import { getQuestionList, refreshQuestionBankMeta, saveQuestionsToLegacyStorage } from '../../services/questionBank'

const router = useRouter()
const categoryKey = ref(router.params.key || '')
const searchText = ref('')
const activeFilter = ref('all')
const sourceQuestions = ref([])
const loadingText = ref('')
const page = ref(1)
const pageSize = 50
const hasMore = ref(false)
const isLoading = ref(false)

const CATEGORY_TITLE_MAP = {
  html: 'HTML 题目',
  css: 'CSS 题目',
  js: 'JavaScript 题目',
  react: 'React 题目',
  vue: 'Vue 题目',
  applet: '小程序题目',
  node: 'Node 题目',
  net: '网络题目',
  arithmetic: '算法题目',
  random: '随机练习'
}

const filters = [
  { key: 'all', name: '全部' },
  { key: 'new', name: '未标记' },
  { key: 'mastered', name: '已掌握' },
  { key: 'retry', name: '待复习' },
  { key: 'fav', name: '已收藏' }
]

const filteredQuestions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return sourceQuestions.value.filter((question) => {
    const searchTarget = `${question.question} ${question.summary || ''} ${(question.tags || []).join(' ')}`.toLowerCase()
    const byKeyword = !keyword || searchTarget.includes(keyword)
    let byState = true
    if (activeFilter.value === 'new') byState = !question.mastery
    if (activeFilter.value === 'mastered') byState = question.mastery === 'mastered'
    if (activeFilter.value === 'retry') byState = question.mastery === 'retry'
    if (activeFilter.value === 'fav') byState = !!question.isFavorited
    return byKeyword && byState
  })
})

const pageTitle = computed(() => CATEGORY_TITLE_MAP[categoryKey.value] || '题目列表')

const pageSubtitle = computed(() => {
  if (categoryKey.value === 'random') return '从全题库随机抽取 10 道题'
  return '按当前星系聚焦练习'
})

function goToDetailPage(id, index) {
  Taro.setStorageSync('question_pool', filteredQuestions.value)
  Taro.navigateTo({
    url: `/pages/normalQuestionDetail/index?id=${id}&key=${categoryKey.value || ''}&index=${index}`
  })
}

async function loadPageQuestions(options = {}) {
  if (isLoading.value) return
  isLoading.value = true
  loadingText.value = '加载题库中...'
  try {
    await refreshQuestionBankMeta()
    const nextPage = options.append ? page.value + 1 : 1
    const result = await getQuestionList({
      categoryId: categoryKey.value,
      page: nextPage,
      pageSize,
      randomCount: 10
    }, options)
    const nextList = result.list || []
    sourceQuestions.value = options.append
      ? dedupeQuestions([...sourceQuestions.value, ...nextList])
      : nextList
    page.value = result.page || nextPage
    hasMore.value = Boolean(result.hasMore)
    saveQuestionsToLegacyStorage(mergeIntoLegacyQuestions(sourceQuestions.value))
  } catch (error) {
    Taro.showToast({ title: '题库加载失败', icon: 'none' })
  } finally {
    loadingText.value = ''
    isLoading.value = false
  }
}

function dedupeQuestions(list) {
  const map = new Map()
  list.forEach(item => map.set(String(item.id), item))
  return Array.from(map.values())
}

function mergeIntoLegacyQuestions(list) {
  const stored = Taro.getStorageSync('questions')
  const existing = Array.isArray(stored) ? stored : []
  const nextMap = new Map(existing.map(item => [String(item.id), item]))
  list.forEach((item) => {
    nextMap.set(String(item.id), {
      ...(nextMap.get(String(item.id)) || {}),
      ...item
    })
  })
  return Array.from(nextMap.values())
}

function goBack() {
  Taro.navigateBack({ delta: 1 })
}

useDidShow(() => {
  loadPageQuestions({ refresh: true })
})

useReachBottom(() => {
  if (categoryKey.value === 'random') return
  if (!hasMore.value || searchText.value || activeFilter.value !== 'all') return
  loadPageQuestions({ append: true })
})
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.question-list-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #101a35 0%, #070b18 100%);
  color: #f5f8ff;
}

.list-content {
  padding: 0 fig(23) fig(40);
  box-sizing: border-box;
}

.search-box {
  position: relative;
  height: fig(42);
  margin-top: fig(10);
  border-radius: fig(14);
  background: #101a2f;
}

.search-icon {
  position: absolute;
  left: fig(18);
  top: fig(8);
  color: #7e90b6;
  font-size: fig(17);
  line-height: fig(28);
}

.search-input {
  height: fig(42);
  padding: 0 fig(18) 0 fig(54);
  color: #f5f8ff;
  font-size: fig(13);
  box-sizing: border-box;
}

.search-placeholder {
  color: #67799f;
}

.filter-scroll {
  margin-top: fig(14);
  white-space: nowrap;
}

.filter-row {
  display: inline-flex;
}

.filter-chip {
  height: fig(34);
  margin-right: fig(8);
  padding: 0 fig(16);
  border-radius: fig(17);
  background: #10182c;
  text-align: center;
}

.filter-chip text {
  color: #8092b7;
  font-size: fig(12);
  line-height: fig(34);
}

.filter-chip.active {
  background: #22438c;
}

.filter-chip.active text {
  color: #73e9ff;
  font-weight: 700;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-top: fig(14);
}

.summary-row text {
  color: #7e90b6;
  font-size: fig(12);
  line-height: fig(18);
}

.summary-meta {
  color: #41e6ff !important;
}

.question-list {
  margin-top: fig(8);
}

.load-more {
  height: fig(38);
  text-align: center;
}

.load-more text {
  color: #7e90b6;
  font-size: fig(12);
  line-height: fig(38);
}

.question-card {
  margin-bottom: fig(10);
  padding: fig(12);
  border-radius: fig(14);
  border: 1px solid rgba(32, 55, 98, 0.8);
  background: #101a2f;
  box-shadow: 0 fig(6) fig(18) rgba(0, 0, 0, 0.2);
}

.card-top,
.question-states,
.card-bottom {
  display: flex;
  align-items: center;
}

.card-top,
.card-bottom {
  justify-content: space-between;
}

.question-index,
.state-fav,
.state-mastery,
.question-text,
.question-id,
.arrow,
.empty-title,
.empty-desc {
  display: block;
}

.question-index {
  color: #41e6ff;
  font-size: fig(11);
  font-weight: 700;
  line-height: fig(16);
}

.question-states text {
  margin-left: fig(6);
  padding: 0 fig(8);
  border-radius: fig(10);
  font-size: fig(10);
  line-height: fig(18);
}

.state-fav {
  color: #ffd972;
  background: rgba(107, 78, 17, 0.45);
}

.state-mastery {
  color: #a7b8da;
  background: rgba(41, 57, 90, 0.6);
}

.state-mastery.mastered {
  color: #3ce4a2;
  background: rgba(17, 88, 68, 0.45);
}

.question-text {
  margin-top: fig(8);
  color: #e7efff;
  font-size: fig(14);
  font-weight: 600;
  line-height: fig(21);
}

.card-bottom {
  margin-top: fig(10);
}

.question-id {
  color: #8ea1ca;
  font-size: fig(11);
  line-height: fig(16);
}

.arrow {
  color: #6379a5;
  font-size: fig(17);
  line-height: fig(18);
}

.empty-state {
  margin-top: fig(20);
  padding: fig(20) fig(16);
  border-radius: fig(16);
  border: 1px solid rgba(33, 58, 105, 0.72);
  background: rgba(16, 26, 47, 0.68);
  text-align: center;
}

.empty-title {
  color: #dce8ff;
  font-size: fig(15);
  font-weight: 700;
  line-height: fig(22);
}

.empty-desc {
  margin-top: fig(8);
  color: #8ea1ca;
  font-size: fig(12);
  line-height: fig(18);
}
</style>
