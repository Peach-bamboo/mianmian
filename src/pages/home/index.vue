<template>
    <view class="home-page">
        <view v-if="activeTab == 0">
            <!-- 顶部的每日一题模块 -->
            <DailyQuestion />
            <!-- 底部的前端模块区域 -->
            <FrontendModules />
        </view>
        <view v-else-if="activeTab == 1" class="profile">
            <!-- 头像和昵称区域 -->
            <view class="user-info" @tap="handleLogin">
                <image :src="userInfo.isLogged ? userInfo.avatar : defaultAvatar" class="avatar" />
                <text class="nickname">
                    {{ userInfo.isLogged ? userInfo.nickname : "游客" }}
                </text>
                <text v-if="!userInfo.isLogged" class="login-text">登录</text>
            </view>
            <!-- 我的收藏 -->
            <view class="my-favorites" @tap="navigateToFavorites">
                <Star></Star>
                <text class="text">我的收藏</text>
            </view>
        </view>


        <Tabbar :activeTab="activeTab" @update:activeTab="updateActiveTab" />
    </view>
</template>
<script setup>
// import Tabbar from '@/components/Tabbar.vue';
import { ref } from 'vue';
import Taro from '@tarojs/taro';
import { Star } from '@nutui/icons-vue-taro'
import Tabbar from '../../components/Tabbar.vue';
import DailyQuestion from '../../components/DailyQuestion.vue';
import FrontendModules from '../../components/FrontendModules.vue';
import questionsData from '../../data/questions.json';

const activeTab = ref(0);
function updateActiveTab(newValue) {
    activeTab.value = newValue;
}
// 用户信息，默认未登录状态
const userInfo = ref({
    isLogged: false,
    avatar: '',
    nickname: '',
});
// 默认头像
const defaultAvatar = require('../../assets/images/default-avatar.jpg'); // 确保此路径下有默认头像

// 处理登录逻辑
const handleLogin = () => {
    if (!userInfo.value.isLogged) {
        Taro.getUserProfile({
            desc: '用于完善用户资料',
            success: (res) => {
                userInfo.value.isLogged = true
                userInfo.value.avatar = res.userInfo.avatarUrl
                userInfo.value.nickname = res.userInfo.nickName
            },
            fail: (err) => {
                console.log('登录失败', err)
            }
        })
    }
};
// 跳转到收藏页面
const navigateToFavorites = () => {
    Taro.navigateTo({ url: '/pages/favorites/index' });
};

const QUESTIONS_VERSION = "1.2"; // 更新时修改版本号

// 初始化数据存储
function initializeQuestionsData() {
    try {
        // 读取本地存储中的版本号和题库数据
        let existingData = Taro.getStorageSync('questions')
        if (!Array.isArray(existingData)) existingData = []; // 保证 existingData 是数组
        const existingVersion = Taro.getStorageSync('questions_version');
        if (existingVersion !== QUESTIONS_VERSION || !existingData.length) {
            // 合并收藏状态
            const updatedQuestions = questionsData.map(newQuestion => {
                const oldQuestion = existingData.find(item => item.id === newQuestion.id);
                let my = oldQuestion ? { ...newQuestion, isFavorited: oldQuestion.isFavorited } : newQuestion;
                return oldQuestion ? { ...newQuestion, isFavorited: oldQuestion.isFavorited } : newQuestion;
            });
            Taro.setStorageSync('questions', updatedQuestions);
            Taro.setStorageSync('questions_version', QUESTIONS_VERSION);
            console.log("题库数据已更新至版本:", QUESTIONS_VERSION);
        } else {
            console.log("题库数据已是最新版本，无需更新。");
        }
    } catch (error) {
        console.error("初始化题目数据出错:", error)
    }
}

// 在应用入口文件调用
initializeQuestionsData()

</script>
<style lang="scss">
.home-page {
    height: 100vh;
    padding: 20px;
    background-color: $secondary-my-color;
}

.profile {
    padding: 30px;

    .user-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: #fff;
        padding: 26px;
        border-radius: 28px;
        position: relative;
    }

    .avatar {
        width: 160px;
        height: 160px;
        border-radius: 50%;
    }

    .nickname {
        font-size: 38px;
        font-weight: bold;
        margin-top: 20px;
    }

    .login-text {
        font-size: 46px;
        color: #fff;
        position: absolute;
        left: 290px;
        top: 80px;
    }

    .my-favorites {
        display: flex;
        align-items: center;
        background-color: #fff;
        padding: 26px;
        margin-top: 28px;
        border-radius: 18px;

        .text {
            margin-left: 20px;
        }
    }

    .arrow-icon {
        width: 20px;
        height: 20px;
        margin-left: auto;
    }
}
</style>