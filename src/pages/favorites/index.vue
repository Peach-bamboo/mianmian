<template>
    <!-- 题目列表页-->
    <view class="module-page">
        <!-- 模块标题 -->
        <!-- <view class="module-title">{{ title }} 题目</view> -->

        <!-- 题目列表 -->
        <view class="question-list">
            <view v-for="(question, index) in questions" :key="index" class="question-item"
                @tap="goToDetailPage(question.id)">
                <view class="question-index">第{{ index + 1 }}题</view>
                <view class="question-description">{{ question.question }}</view>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref } from 'vue';
import Taro from '@tarojs/taro'


// 加载题目数据
const loadQuestions = () => {
  try {
    const data = Taro.getStorageSync('questions')
    return data || []
  } catch (error) {
    console.error("加载题目数据出错:", error)
    return []
  }
}

const questions = loadQuestions().filter(question => question.isFavorited === true);

console.log("questions",questions);



// 设置导航栏标题
Taro.setNavigationBarTitle({
    title: '我的收藏'
})

const goToDetailPage = (id) => {
    // 跳转到题目详情页，传递题目 ID
    Taro.navigateTo({ url: `/pages/normalQuestionDetail/index?id=${id}` })
}
</script>

<style lang="scss">
.module-page {
    padding: 20px;
    min-height: 100vh;
    background-color: $secondary-my-color;
}

.module-title {
    font-size: 34px;
    font-weight: bold;
    margin-bottom: 20px;
    color: $primary-my-color-end;
}

.question-list {
    display: flex;
    flex-direction: column;
}

.question-item {
    height: 160px;
    margin-bottom: 20px;
    // padding: 15px;
    border-radius: 20px;
    background-color: #f9f9f9;
    box-shadow: 0px 0px 20px 4px rgba(0, 0, 0, 0.1);
}

.question-item:hover {
    background-color: #f0f0f0;
}

.question-index {
    width: 100px;
    height: 40px;
    font-size: 30px;
    color: #fff;
    background: $primary-my-color-end;
    border-top-left-radius: 20px;
    border-bottom-right-radius: 20px;
    text-align: center;
    line-height: 40px;
}

.question-description {
    font-size: 32px;
    font-weight: bold;
    color: #3f3e3e;
    margin-top: 20px;
    // background: pink;
    line-height: 36px;
    padding: 0 20px;

    overflow: hidden;
    display: -webkit-box;
    /* 设置为盒布局 */
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    /* 限制显示两行 */
    line-clamp: 2;
    white-space: normal;
}
</style>