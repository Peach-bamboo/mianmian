<template>
    <!-- 主要模块 -->
    <view class="modules">
        <nut-row type="flex" justify="space-between" flex-wrap="wrap" align="center" gutter="4">
            <nut-col :span="12" v-for="module in modules" :key="module.name">
                <view class="modules-item" @tap="navigateToModule(module.path)">{{ module.name }}</view>
            </nut-col>
        </nut-row>

    </view>
</template>

<script setup>
import Taro from '@tarojs/taro';
const modules = [
    { name: "HTML", path: "/pages/questionList/index?key=html" },
    { name: "CSS", path: "/pages/questionList/index?key=css" },
    { name: "JavaScript", path: "/pages/questionList/index?key=js" },
    { name: "Vue", path: "/pages/questionList/index?key=vue" },
    { name: "React", path: "/pages/questionList/index?key=react" },
    { name: "小程序", path: "/pages/questionList/index?key=applet" },
    { name: "Node", path: "/pages/questionList/index?key=node" },
    { name: "网络", path: "/pages/questionList/index?key=net" },
    { name: "算法", path: "/pages/questionList/index?key=arithmetic" },
    { name: "随机练习", path: "/pages/questionList/index?key=random" },
];

function navigateToModule(path) {
    Taro.navigateTo({ url: path });
}
</script>

<style lang="scss">
.modules {
    margin: 30px;
    .modules-item{
        width: 100%;
        height: 200px;
        background-color: $primary-my-color-end;
        color: #fff;
        text-align: center;
        line-height: 200px;
        border-radius: 10px;
        margin-bottom: 10px;
    }
}
</style>