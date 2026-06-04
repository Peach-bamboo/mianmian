<template>
  <view class="cosmos-headbar" :style="headbarStyle">
    <view v-if="showBack" class="headbar-back" @tap="handleBack">
      <text>‹</text>
    </view>
    <view class="headbar-copy">
      <text class="headbar-title">{{ title }}</text>
      <text v-if="subtitle" class="headbar-subtitle">{{ subtitle }}</text>
    </view>
    <view v-if="meta" class="headbar-meta">
      <text>{{ meta }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Taro from '@tarojs/taro'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  meta: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: false
  },
  topOffset: {
    type: Number,
    default: 20
  }
})

const emit = defineEmits(['back'])
const topPadding = ref(58)
const rightPadding = ref(23)

const headbarStyle = computed(() => ({
  paddingTop: `${topPadding.value}px`,
  paddingRight: `${rightPadding.value}px`
}))

onMounted(() => {
  const systemInfo = Taro.getSystemInfoSync()
  topPadding.value = (systemInfo.statusBarHeight || 24) + props.topOffset

  // Reserve right-side space for WeChat capsule to avoid overlap with `meta`.
  const menuRect = Taro.getMenuButtonBoundingClientRect?.()
  const baseRightPadding = (systemInfo.windowWidth * 23) / 390
  if (menuRect && menuRect.left) {
    const capsuleReserve = systemInfo.windowWidth - menuRect.left + 8
    rightPadding.value = Math.max(baseRightPadding, capsuleReserve)
  } else {
    rightPadding.value = baseRightPadding
  }
})

function handleBack() {
  emit('back')
}
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.cosmos-headbar {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-height: fig(110);
  padding-left: fig(23);
  padding-right: fig(23);
  box-sizing: border-box;
}

.headbar-back {
  width: fig(32);
  height: fig(44);
  margin-right: fig(6);
}

.headbar-back text {
  display: block;
  color: #f5f8ff;
  font-size: fig(30);
  line-height: fig(42);
}

.headbar-copy {
  min-width: 0;
  flex: 1;
}

.headbar-title,
.headbar-subtitle,
.headbar-meta text {
  display: block;
}

.headbar-title {
  color: #f5f8ff;
  font-size: fig(22);
  font-weight: 800;
  line-height: fig(26);
}

.headbar-subtitle {
  margin-top: fig(3);
  color: #8393b6;
  font-size: fig(13);
  line-height: fig(17);
}

.headbar-meta {
  flex-shrink: 0;
  min-width: fig(80);
  height: fig(30);
  margin-top: fig(4);
  padding: 0 fig(12);
  border-radius: fig(15);
  background: #132a35;
  text-align: center;
  box-sizing: border-box;
}

.headbar-meta text {
  color: #45d39d;
  font-size: fig(10);
  line-height: fig(30);
}
</style>
