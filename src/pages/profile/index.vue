<template>
    <view class="profile-page">
        <text>这是“我的”页面</text>
    </view>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('我的页面');
</script>

<style scoped>
.profile-page {
    padding: 20px;
    font-size: 18px;
}
</style>