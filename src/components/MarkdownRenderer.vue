<template>
  <view class="markdown-renderer">
    <view
      v-for="(block, index) in blocks"
      :key="`${block.type}-${index}`"
      :class="['md-block', `md-${block.type}`]"
    >
      <text v-if="block.type === 'heading1'" class="md-heading md-heading-1">
        <text
          v-for="(run, runIndex) in block.runs"
          :key="runIndex"
          :class="inlineClass(run)"
          @tap.stop="handleInlineTap(run)"
        >{{ run.text }}</text>
      </text>
      <text v-else-if="block.type === 'heading2'" class="md-heading md-heading-2">
        <text
          v-for="(run, runIndex) in block.runs"
          :key="runIndex"
          :class="inlineClass(run)"
          @tap.stop="handleInlineTap(run)"
        >{{ run.text }}</text>
      </text>
      <text v-else-if="block.type === 'heading3'" class="md-heading md-heading-3">
        <text
          v-for="(run, runIndex) in block.runs"
          :key="runIndex"
          :class="inlineClass(run)"
          @tap.stop="handleInlineTap(run)"
        >{{ run.text }}</text>
      </text>
      <text v-else-if="block.type === 'quote'" class="md-quote-text">
        <text
          v-for="(run, runIndex) in block.runs"
          :key="runIndex"
          :class="inlineClass(run)"
          @tap.stop="handleInlineTap(run)"
        >{{ run.text }}</text>
      </text>
      <text v-else-if="block.type === 'list'" class="md-list-text">
        <text
          v-for="(run, runIndex) in block.runs"
          :key="runIndex"
          :class="inlineClass(run)"
          @tap.stop="handleInlineTap(run)"
        >{{ run.text }}</text>
      </text>
      <view v-else-if="block.type === 'code'" class="md-code-wrap">
        <view class="md-code-head">
          <text>{{ block.lang || 'code' }}</text>
          <text class="md-code-copy" @tap.stop="copyCode(block.text)">复制</text>
        </view>
        <text class="md-code">{{ block.text }}</text>
      </view>
      <scroll-view v-else-if="block.type === 'table'" scroll-x class="md-table-scroll">
        <view class="md-table">
          <view
            v-for="(row, rowIndex) in block.rows"
            :key="rowIndex"
            class="md-table-row"
            :class="{ head: rowIndex === 0 }"
          >
            <text
              v-for="(cell, cellIndex) in row"
              :key="cellIndex"
              class="md-table-cell"
            >
              {{ cell }}
            </text>
          </view>
        </view>
      </scroll-view>
      <image
        v-else-if="block.type === 'image'"
        class="md-image"
        mode="widthFix"
        :src="block.src"
        @tap="previewImage(block.src)"
      />
      <text v-else class="md-paragraph">
        <text
          v-for="(run, runIndex) in block.runs"
          :key="runIndex"
          :class="inlineClass(run)"
          @tap.stop="handleInlineTap(run)"
        >{{ run.text }}</text>
      </text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import Taro from '@tarojs/taro'
import markdownCore from '../domain/markdownCore.cjs'

const { parseMarkdown } = markdownCore

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const blocks = computed(() => parseMarkdown(props.content))

function previewImage(src) {
  if (!src) return
  Taro.previewImage({ current: src, urls: [src] })
}

function inlineClass(run) {
  return {
    'md-inline-strong': run.type === 'strong',
    'md-inline-code': run.type === 'inlineCode',
    'md-inline-link': run.type === 'link'
  }
}

function handleInlineTap(run) {
  if (run.type !== 'link' || !run.href) return
  Taro.setClipboardData({
    data: run.href,
    success() {
      Taro.showToast({ title: '链接已复制', icon: 'none' })
    }
  })
}

function copyCode(content) {
  if (!content) return
  Taro.setClipboardData({
    data: content,
    success() {
      Taro.showToast({ title: '代码已复制', icon: 'none' })
    }
  })
}
</script>

<style lang="scss">
@function fig($px) {
  @return ($px * 750 / 390) * 1px;
}

.markdown-renderer {
  margin-top: fig(12);
}

.md-block {
  margin-top: fig(10);
}

.md-heading,
.md-paragraph,
.md-quote-text,
.md-list-text,
.md-code,
.md-code-head text,
.md-table-cell {
  display: block;
  word-break: break-word;
}

.md-heading {
  color: #f4f8ff;
  font-weight: 800;
}

.md-heading-1 {
  font-size: fig(20);
  line-height: fig(28);
}

.md-heading-2 {
  font-size: fig(17);
  line-height: fig(24);
}

.md-heading-3 {
  font-size: fig(15);
  line-height: fig(22);
}

.md-paragraph,
.md-list-text {
  color: #c9d8f2;
  font-size: fig(13);
  line-height: fig(22);
  white-space: pre-wrap;
}

.md-list-text {
  padding-left: fig(8);
}

.md-quote {
  padding: fig(10) fig(12);
  border-left: fig(3) solid #41e6ff;
  border-radius: fig(10);
  background: rgba(39, 72, 122, 0.35);
}

.md-quote-text {
  color: #d5e7ff;
  font-size: fig(13);
  line-height: fig(21);
}

.md-code-wrap {
  overflow: hidden;
  border: 1px solid rgba(74, 111, 172, 0.55);
  border-radius: fig(12);
  background: #07101f;
}

.md-code-head {
  height: fig(26);
  padding: 0 fig(10);
  background: rgba(33, 57, 96, 0.8);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.md-code-head text {
  color: #72e8ff;
  font-size: fig(11);
  line-height: fig(26);
}

.md-code-copy {
  color: #d6e6ff !important;
  font-size: fig(11) !important;
}

.md-code {
  padding: fig(10);
  color: #d9eaff;
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: fig(12);
  line-height: fig(19);
  white-space: pre-wrap;
  box-sizing: border-box;
}

.md-table-scroll {
  width: 100%;
}

.md-table {
  min-width: fig(310);
  border: 1px solid rgba(70, 104, 160, 0.65);
  border-radius: fig(10);
  overflow: hidden;
}

.md-table-row {
  display: flex;
  border-top: 1px solid rgba(70, 104, 160, 0.45);
}

.md-table-row:first-child {
  border-top: 0;
}

.md-table-row.head {
  background: rgba(45, 82, 137, 0.5);
}

.md-table-cell {
  min-width: fig(92);
  padding: fig(8);
  color: #d1def4;
  font-size: fig(12);
  line-height: fig(18);
  box-sizing: border-box;
}

.md-image {
  width: 100%;
  border-radius: fig(12);
  background: rgba(16, 26, 47, 0.7);
}

.md-inline-strong {
  color: #f4f8ff;
  font-weight: 800;
}

.md-inline-code {
  padding: 0 fig(4);
  border-radius: fig(4);
  color: #83efff;
  background: rgba(33, 74, 105, 0.7);
  font-family: Menlo, Monaco, Consolas, monospace;
}

.md-inline-link {
  color: #62dfff;
  text-decoration: underline;
}
</style>
