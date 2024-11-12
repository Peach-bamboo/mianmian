<template>
    <view class="question-detail">
        <!-- 顶部的题目区域 -->
        <view class="question-header">
            <text class="question-text">{{ question }}</text>
             <StarN size="24" color="#fc0" v-if="!isFavorited" @tap="toggleFavoriteFunc" />
             <StarFillN size="24" color="#fc0" v-else @tap="toggleFavoriteFunc" />
        </view>

        <!-- 分隔线 -->
        <view class="divider"></view>

        <!-- 答案区域 -->
        <view class="answer-section">
            <text class="answer-text">{{ answer }}</text>
        </view>
    </view>
</template>
<script setup>
import { ref } from 'vue';
import { StarN,StarFillN } from '@nutui/icons-vue-taro'
const props = defineProps({
  question: String,
  answer: String,
  isFavorited: {
    type: Boolean,
    default: false,
  }
});
const isFavorited = ref(props.isFavorited);
const emit = defineEmits(['toggleFavorite']);

const toggleFavoriteFunc = () => {
  isFavorited.value =!isFavorited.value;
  // 在这里可以添加收藏或取消收藏的逻辑
  emit('toggleFavorite');
 
};
</script>
<style lang="scss">
.question-detail {
    padding: 20px;
    background: #fff;
    border-radius: 30px;
}

.question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.question-text {
    font-size: 28px;
    font-weight: bold;
    color: $primary-my-color;
}

.bookmark-icon {
    width: 24px;
    height: 24px;
}

.divider {
    height: 1px;
    background-color: $primary-my-color;
    margin: 20px 0;
}

.answer-section {
    padding-top: 20px;
}

.answer-text {
    font-size: 26px;
    color: $text-primary;
}
</style>