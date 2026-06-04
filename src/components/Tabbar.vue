<template>
  <view class="cosmos-tabbar">
    <view
      v-for="item in tabs"
      :key="item.key"
      class="tabbar-item"
      :class="{ active: isActive(item) }"
      @tap="handleClick(item)"
    >
      <text class="tabbar-text">{{ item.title }}</text>
    </view>
  </view>
</template>

<script setup>
import Taro from '@tarojs/taro'

const emit = defineEmits(['update:activeTab'])

const props = defineProps({
  activeTab: {
    type: Number,
    default: 0
  },
  activeKey: {
    type: String,
    default: ''
  }
})

const tabs = [
  { key: 'cosmos', title: '宇宙', activeValue: 0, type: 'home' },
  { key: 'questions', title: '题库', activeValue: -1, type: 'route', url: '/pages/moduleHub/index' },
  { key: 'lab', title: '实验', activeValue: -1, type: 'route', url: '/pages/threeDemo/index' },
  { key: 'growth', title: '成长', activeValue: 1, type: 'tab' }
]

function isActive(item) {
  return props.activeKey ? item.key === props.activeKey : item.activeValue === props.activeTab
}

function handleClick(item) {
  if (props.activeKey) {
    if (item.key === props.activeKey) {
      return
    }
    if (item.key === 'cosmos') {
      Taro.reLaunch({ url: '/pages/home/index' })
      return
    }
    if (item.key === 'growth') {
      Taro.navigateTo({ url: '/pages/profile/index' })
      return
    }
    if (item.type === 'route') {
      Taro.navigateTo({ url: item.url })
    }
    return
  }

  if (item.type === 'home') {
    emit('update:activeTab', item.activeValue)
    return
  }
  if (item.type === 'route') {
    Taro.navigateTo({ url: item.url })
    return
  }
  emit('update:activeTab', item.activeValue)
}
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.cosmos-tabbar {
  position: fixed;
  left: fig(15);
  right: fig(15);
  bottom: calc(29rpx + env(safe-area-inset-bottom));
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: fig(51);
  padding: fig(8) fig(12);
  border-radius: fig(22);
  background: rgba(13, 21, 41, 0.96);
  box-sizing: border-box;
  box-shadow: 0 fig(10) fig(28) rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
}

.tabbar-item {
  flex: 1;
  height: fig(35);
  margin: 0 fig(4);
  border-radius: fig(16);
  text-align: center;
}

.tabbar-item.active {
  background: #162c56;
}

.tabbar-text {
  color: #8797ba;
  font-size: fig(12);
  font-weight: 600;
  line-height: fig(35);
}

.tabbar-item.active .tabbar-text {
  color: #41e6ff;
  font-weight: 700;
}
</style>
