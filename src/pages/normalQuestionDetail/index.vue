<template>
    <view class="question-detail-page">
        <QuestionDetail :question="data.question" :answer="data.answer" :isFavorited="data.isFavorited"
            @toggleFavorite="toggleFavorite"></QuestionDetail>
    </view>
</template>
<script setup>
import Taro from '@tarojs/taro'
import { ref } from 'vue';
import { useRouter } from '@tarojs/taro'
const router = useRouter()
import QuestionDetail from '../../components/QuestionDetail.vue';

const id = ref(router.params.id);
console.log("id.value", id.value);

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
const target = loadQuestions().filter(question => question.id == id.value)[0];
let data = ref({
    ...target,
});

// 收藏状态切换
const toggleFavorite = () => {
    try {
        const questions = Taro.getStorageSync('questions') || []
        const updatedQuestions = questions.map(item => {
            if (item.id == id.value) {
                item.isFavorited = !item.isFavorited
            }
            return item
        })
        console.log("更新收藏状态--updatedQuestions", updatedQuestions)
        Taro.setStorageSync('questions', updatedQuestions)

    } catch (error) {
        console.error("更新收藏状态出错:", error)
    }
    data.value.isFavorited =!data.value.isFavorited
    console.log("收藏状态切换--data", data.value)
}



</script>
<style lang="scss">
.question-detail-page {
    height: 100vh;
    padding: 20px;
    background-color: $secondary-my-color;
}
</style>