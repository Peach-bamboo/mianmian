<template>
  <view class="favorites-page">
    <CosmosHeadbar
      title="我的收藏"
      subtitle="沉淀你的高频考点与难点"
      :meta="`${filteredQuestions.length} 题`"
      :show-back="true"
      :top-offset="16"
      @back="goBack"
    />

    <view class="favorites-content">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          v-model="searchText"
          class="search-input"
          placeholder="搜索题干或关键词"
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

      <view v-if="filteredQuestions.length" class="favorite-list">
        <view
          v-for="(question, index) in filteredQuestions"
          :key="question.id"
          class="favorite-card"
          @tap="goToDetail(question.id, index)"
        >
          <view class="card-head">
            <text class="category-tag">{{ categoryLabelMap[question.category] || '题库' }}</text>
            <view class="star-btn" @tap.stop="toggleFavorite(question.id)">
              <text>★</text>
            </view>
          </view>
          <text class="question-text">{{ question.question }}</text>
          <view class="card-foot">
            <text class="order-text">第 {{ index + 1 }} 题</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-title">还没有收藏题目</text>
        <text class="empty-desc">在题目详情点击星标后，会在这里沉淀下来</text>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import { syncCloudQuestionStates, toggleFavoriteByCloud } from '../../services/questionState'
import { getFallbackQuestions, normalizeQuestions, saveQuestionsToLegacyStorage } from '../../services/questionBank'

const searchText = ref('')
const activeFilter = ref('all')

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

const filters = [
  { key: 'all', name: '全部' },
  { key: 'js', name: 'JavaScript' },
  { key: 'framework', name: '框架' },
  { key: 'base', name: '基础' },
  { key: 'runtime', name: '运行时' }
]

const groupMap = {
  html: 'base',
  css: 'base',
  js: 'runtime',
  vue: 'framework',
  react: 'framework',
  node: 'runtime',
  applet: 'runtime',
  net: 'base',
  arithmetic: 'base'
}

const allQuestions = ref(loadQuestions())

const favoriteQuestions = computed(() => (
  allQuestions.value.filter(question => question.isFavorited)
))

const filteredQuestions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return favoriteQuestions.value.filter((question) => {
    const category = question.category
    const group = groupMap[category]
    const matchFilter =
      activeFilter.value === 'all' ||
      category === activeFilter.value ||
      group === activeFilter.value
    const matchSearch = !keyword || question.question.toLowerCase().includes(keyword)
    return matchFilter && matchSearch
  })
})

function loadQuestions() {
  const stored = Taro.getStorageSync('questions')
  if (Array.isArray(stored) && stored.length) return normalizeQuestions(stored)
  return getFallbackQuestions()
}

function syncQuestions(next) {
  allQuestions.value = next
  saveQuestionsToLegacyStorage(next)
}

async function toggleFavorite(id) {
  let patchedQuestion = null
  const next = allQuestions.value.map((item) => (
    item.id === id ? (patchedQuestion = { ...item, isFavorited: !item.isFavorited }) : item
  ))
  syncQuestions(next)
  try {
    await toggleFavoriteByCloud(patchedQuestion)
  } catch (error) {
    Taro.showToast({ title: '收藏已本地保存，云端同步失败', icon: 'none' })
  }
}

function goToDetail(id, index) {
  const ids = filteredQuestions.value.map(item => item.id).join(',')
  Taro.navigateTo({
    url: `/pages/normalQuestionDetail/index?id=${id}&key=favorites&index=${index}&ids=${ids}`
  })
}

function goBack() {
  Taro.navigateBack({ delta: 1 })
}

useDidShow(() => {
  allQuestions.value = loadQuestions()
  syncCloudQuestionStates()
    .then((questions) => {
      allQuestions.value = questions
    })
    .catch((error) => {
      console.log('收藏状态同步失败', error)
    })
})
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.favorites-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #101a35 0%, #070b18 100%);
  color: #f5f8ff;
}

.favorites-content {
  padding: 0 fig(23) calc(40rpx + env(safe-area-inset-bottom));
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

.favorite-list {
  margin-top: fig(12);
}

.favorite-card {
  margin-bottom: fig(12);
  padding: fig(14) fig(14) fig(12);
  border-radius: fig(16);
  border: 1px solid rgba(30, 53, 98, 0.8);
  background: #101a2f;
  box-shadow: 0 fig(6) fig(18) rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-tag {
  color: #41e6ff;
  font-size: fig(11);
  font-weight: 700;
  line-height: fig(16);
}

.star-btn {
  width: fig(26);
  height: fig(26);
  border-radius: 50%;
  background: #1a2b4a;
  text-align: center;
}

.star-btn text {
  color: #ffd54f;
  font-size: fig(16);
  line-height: fig(26);
}

.question-text {
  display: block;
  margin-top: fig(8);
  color: #e8efff;
  font-size: fig(14);
  font-weight: 600;
  line-height: fig(21);
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: fig(10);
}

.order-text {
  color: #8da0c7;
  font-size: fig(12);
  line-height: fig(16);
}

.arrow {
  color: #6478a3;
  font-size: fig(18);
  line-height: fig(18);
}

.empty-state {
  margin-top: fig(28);
  padding: fig(24) fig(16);
  border-radius: fig(16);
  border: 1px solid rgba(33, 58, 105, 0.7);
  background: rgba(16, 26, 47, 0.7);
  text-align: center;
}

.empty-title {
  display: block;
  color: #dce8ff;
  font-size: fig(15);
  font-weight: 700;
  line-height: fig(22);
}

.empty-desc {
  display: block;
  margin-top: fig(8);
  color: #8ea1ca;
  font-size: fig(12);
  line-height: fig(18);
}
</style>
