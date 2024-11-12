<template>
    <view class="daily-question" @tap="goDetail">
        <view class="title">每日一题</view>
        <!-- 假设用一个简短的问题来展示 -->
        <text class="question">{{ dailyQuestion.question }}</text>
    </view>
</template>

<script setup>
import { ref } from 'vue';
import Taro from '@tarojs/taro';

const questionsData = ref(Taro.getStorageSync('questions') || []);
const getDailyQuestion = () => {
    // 获取今天的日期标识
    const today = new Date().toISOString().split('T')[0];
    const cachedQuestion = Taro.getStorageSync(`dailyQuestion_${today}`);
    if (cachedQuestion) {
        return cachedQuestion;  // 如果缓存中存在今日题目，则直接返回
    } else {
        // 随机生成一个题目
        const randomIndex = Math.floor(Math.random() * questionsData.value.length);
        const dailyQuestion = questionsData.value[randomIndex];
        
        // 缓存今日题目
        Taro.setStorageSync(`dailyQuestion_${today}`, dailyQuestion);
        return dailyQuestion;
    }
}
// 获取每日一题
const dailyQuestion = getDailyQuestion();

const goDetail = () => {
    // 跳转到每日一题详情页面
    Taro.navigateTo({
        url: `/pages/normalQuestionDetail/index?id=${dailyQuestion.id}`
    });
}
</script>

<style lang="scss">
.daily-question {
    background: $primary-my-color;
    text-align: center;
    margin: 0 30px;
    overflow: hidden;
    border-radius: 30px;
    padding: 20px;

    .title {
        font-size: 40px;
        // margin-top: 20px;
        color: #fff;
        font-weight: 700;
    }

    .question {
        font-size: 30px;
        color: #fff;
        text-align: center;
        overflow: hidden;
        display: -webkit-box;
        /* 设置为盒布局 */
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        /* 限制显示两行 */
        line-clamp: 2;
        white-space: normal;
        margin-top: 20px;
    }
}
</style>