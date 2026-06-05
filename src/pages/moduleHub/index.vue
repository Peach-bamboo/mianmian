<template>
  <view class="module-hub-page">
    <CosmosHeadbar
      title="题库星系"
      subtitle="选择一个知识星球开始练习"
      :top-offset="16"
      meta="20 道题"
    />

    <view class="hub-content">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          v-model="searchText"
          class="search-input"
          placeholder="搜索题目或知识星系"
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

      <view class="recommend-card" @tap="goModule(recommendedModule.key)">
        <text class="recommend-kicker">今日推荐</text>
        <text class="recommend-title">{{ recommendedModule.name }} {{ recommendedModule.level }}</text>
        <text class="recommend-desc">{{ recommendedModule.count }} 道题 · {{ recommendedModule.desc }}</text>
        <view class="recommend-button"><text>继续练习</text></view>
        <view class="recommend-planet" :style="{ background: recommendedModule.gradient }">
          <text>{{ recommendedModule.shortName }}</text>
        </view>
      </view>

      <view class="summary-row">
        <text>{{ visibleModules.length }} 个星系</text>
        <text class="summary-total">{{ totalCount }} 道题</text>
      </view>

      <view class="module-grid">
        <view
          v-for="module in visibleModules"
          :key="module.key"
          class="module-card"
          @tap="goModule(module.key)"
        >
          <view class="module-planet" :style="{ background: module.gradient }">
            <text>{{ module.shortName }}</text>
          </view>
          <text class="module-count">{{ module.count }} 题</text>
          <text class="module-name">{{ module.name }}</text>
          <text class="module-tag">{{ module.level }}</text>
          <text class="module-arrow">›</text>
        </view>
      </view>
    </view>

    <Tabbar active-key="questions" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import Taro from '@tarojs/taro'
import CosmosHeadbar from '../../components/CosmosHeadbar.vue'
import Tabbar from '../../components/Tabbar.vue'
import questionsData from '../../data/questions.json'

const searchText = ref('')
const activeFilter = ref('all')

const filters = [
  { key: 'all', name: '全部' },
  { key: 'base', name: '基础' },
  { key: 'framework', name: '框架' },
  { key: 'runtime', name: '运行时' },
  { key: 'advanced', name: '进阶' }
]

const modules = [
  { key: 'html', name: 'HTML', shortName: 'H', group: 'base', desc: '语义化、结构与浏览器基础', level: '结构与语义', gradient: 'radial-gradient(circle at 35% 30%, #ffd0b8 0%, #ff7146 48%, #7a1d12 100%)' },
  { key: 'css', name: 'CSS', shortName: 'C', group: 'base', desc: '布局、动画、响应式与视觉样式', level: '布局与动画', gradient: 'radial-gradient(circle at 35% 30%, #c7dcff 0%, #5da8ff 48%, #163672 100%)' },
  { key: 'js', name: 'JavaScript', shortName: 'JS', group: 'runtime', desc: '闭包、原型、异步与语言机制', level: '核心恒星', gradient: 'radial-gradient(circle at 35% 30%, #d8fbff 0%, #32d9ff 48%, #0b5172 100%)' },
  { key: 'vue', name: 'Vue', shortName: 'V', group: 'framework', desc: '响应式、组件、diff 与生态工程', level: '响应式生态', gradient: 'radial-gradient(circle at 35% 30%, #c9ffe4 0%, #42f5b0 48%, #0b6a4a 100%)' },
  { key: 'react', name: 'React', shortName: 'R', group: 'framework', desc: 'Fiber、Hooks、状态与渲染模型', level: '组件模型', gradient: 'radial-gradient(circle at 35% 30%, #d5f7ff 0%, #66dcff 48%, #0a3d55 100%)' },
  { key: 'node', name: 'Node', shortName: 'N', group: 'runtime', desc: '事件循环、模块系统与服务端基础', level: '运行时服务', gradient: 'radial-gradient(circle at 35% 30%, #d3ffc7 0%, #5de879 48%, #104918 100%)' },
  { key: 'applet', name: '小程序', shortName: '微', group: 'advanced', desc: '生命周期、跨端能力与工程限制', level: '跨端基地', gradient: 'radial-gradient(circle at 35% 30%, #d6ffd4 0%, #58ff7a 48%, #0d4a1b 100%)' },
  { key: 'net', name: '网络', shortName: '网', group: 'advanced', desc: 'HTTP、缓存、安全与性能边界', level: '协议星域', gradient: 'radial-gradient(circle at 35% 30%, #ffd4ac 0%, #ff9b4b 48%, #65300b 100%)' },
  { key: 'arithmetic', name: '算法', shortName: '算', group: 'advanced', desc: '复杂度、数据结构与解题模型', level: '逻辑晶体', gradient: 'radial-gradient(circle at 35% 30%, #ffe7a8 0%, #ffc14d 48%, #684000 100%)' }
]

const questions = computed(() => {
  const stored = Taro.getStorageSync('questions')
  return Array.isArray(stored) && stored.length ? stored : questionsData
})

const totalCount = computed(() => questions.value.length)

const moduleStats = computed(() => modules.map((module) => ({
  ...module,
  count: questions.value.filter((question) => question.category === module.key).length
})))

const visibleModules = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return moduleStats.value.filter((module) => {
    const matchFilter = activeFilter.value === 'all' || module.group === activeFilter.value
    const matchSearch = !keyword ||
      module.name.toLowerCase().includes(keyword) ||
      module.desc.toLowerCase().includes(keyword) ||
      module.level.toLowerCase().includes(keyword)
    return matchFilter && matchSearch
  })
})

const recommendedModule = computed(() => (
  moduleStats.value.find((module) => module.key === 'js') || moduleStats.value[0]
))

function goModule(key) {
  Taro.navigateTo({ url: `/pages/questionList/index?key=${key}` })
}
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.module-hub-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #101a35 0%, #070b18 100%);
  color: #f5f8ff;
  box-sizing: border-box;
}

.hub-content {
  padding: 0 fig(23) calc(180rpx + env(safe-area-inset-bottom));
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
  margin-top: fig(15);
  white-space: nowrap;
}

.filter-row {
  display: inline-flex;
}

.filter-chip {
  height: fig(34);
  min-width: fig(56);
  margin-right: fig(8);
  padding: 0 fig(16);
  border-radius: fig(17);
  background: #10182c;
  text-align: center;
  box-sizing: border-box;
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

.recommend-card {
  position: relative;
  height: fig(116);
  margin-top: fig(18);
  padding: fig(16) fig(94) fig(14) fig(18);
  border: 1px solid rgba(42, 134, 184, 0.64);
  border-radius: fig(20);
  background: linear-gradient(135deg, #162c56 0%, #151f3c 46%, #2a145f 100%);
  box-sizing: border-box;
}

.recommend-kicker,
.recommend-title,
.recommend-desc,
.recommend-button text,
.summary-row text,
.module-count,
.module-name,
.module-tag,
.module-arrow {
  display: block;
}

.recommend-kicker {
  color: #41e6ff;
  font-size: fig(12);
  font-weight: 700;
  line-height: fig(16);
}

.recommend-title {
  margin-top: fig(6);
  color: #f5f8ff;
  font-size: fig(20);
  font-weight: 800;
  line-height: fig(25);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recommend-desc {
  margin-top: fig(4);
  color: #a8b7d8;
  font-size: fig(12);
  line-height: fig(16);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recommend-button {
  width: fig(92);
  height: fig(22);
  margin-top: fig(8);
  border-radius: fig(11);
  background: #41e6ff;
  text-align: center;
}

.recommend-button text {
  color: #06132c;
  font-size: fig(10);
  font-weight: 800;
  line-height: fig(22);
}

.recommend-planet {
  position: absolute;
  right: fig(20);
  top: fig(28);
  width: fig(50);
  height: fig(50);
  border-radius: 50%;
  text-align: center;
  box-shadow: 0 0 32px rgba(65, 230, 255, 0.26);
}

.recommend-planet text {
  color: #06132c;
  font-size: fig(12);
  font-weight: 900;
  line-height: fig(50);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-top: fig(18);
}

.summary-row text {
  color: #7e90b6;
  font-size: fig(12);
  line-height: fig(18);
}

.summary-total {
  color: #41e6ff !important;
}

.module-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: fig(10);
}

.module-card {
  position: relative;
  width: 48.25%;
  height: fig(116);
  margin-bottom: fig(12);
  border: 1px solid rgba(27, 47, 85, 0.72);
  border-radius: fig(18);
  background: #101a2f;
  overflow: hidden;
}

.module-planet {
  position: absolute;
  left: fig(14);
  top: fig(14);
  width: fig(46);
  height: fig(46);
  border-radius: 50%;
  text-align: center;
  box-shadow: 0 0 24px rgba(65, 230, 255, 0.16);
}

.module-planet text {
  color: #06132c;
  font-size: fig(12);
  font-weight: 900;
  line-height: fig(46);
}

.module-count {
  position: absolute;
  left: fig(72);
  right: fig(18);
  top: fig(43);
  color: #45d39d;
  font-size: fig(12);
  font-weight: 700;
  line-height: fig(16);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.module-name {
  position: absolute;
  left: fig(72);
  right: fig(18);
  top: fig(19);
  color: #f5f8ff;
  font-size: fig(16);
  font-weight: 800;
  line-height: fig(20);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.module-tag {
  position: absolute;
  left: fig(14);
  right: fig(30);
  bottom: fig(22);
  color: #8fa0c3;
  font-size: fig(12);
  line-height: fig(16);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.module-arrow {
  position: absolute;
  right: fig(15);
  bottom: fig(22);
  color: #61749b;
  font-size: fig(18);
  line-height: fig(18);
}
</style>
