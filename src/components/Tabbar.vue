<template>
    <nut-tabbar v-model="localActiveTab" bottom safe-area-inset-bottom placeholder @tab-switch="handleClick" unactive-color="#7d7e80" active-color="#1989fa">
        <nut-tabbar-item v-for="(item, index) in List" :key="index" :tab-title="item.title" :icon="item.icon">
        </nut-tabbar-item>
    </nut-tabbar>
</template>
<script setup>
import { ref,h,defineProps, defineEmits } from 'vue';
import { Home, My } from '@nutui/icons-vue-taro'
// import { Tabbar, TabbarItem } from '@nutui/nutui-taro';

const props = defineProps({
  activeTab: {
    type: Number,
    default: 0
  }
});
const localActiveTab = ref(props.activeTab);
const emit = defineEmits();


const List = [
  {
    title: 'Home',
    icon: h(Home)
  },
  {
    title: 'My',
    icon: h(My)
  }
]
const handleClick = (data,index) => {
    localActiveTab.value = index;
    emit('update:activeTab', index);
    // if (index === 0) {
    //     // 导航到首页
    //     wx.navigateTo({ url: '/pages/home/index' });
    // } else if (index === 1) {
    //     // 导航到我的页面
    //     wx.navigateTo({ url: '/pages/profile/index' });
    // }

};


</script>
<style scoped></style>