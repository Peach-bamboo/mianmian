# Bug 根因分析：旧缓存覆盖新版 Markdown

## 1. 现象

题目详情页已经接入 `MarkdownRenderer`，小程序构建成功，页面也可以正常打开，但展开解析后仍显示旧纯文本，没有出现预期的 Markdown 标题、列表和代码块。

这类问题容易被误判为：

- Markdown 组件不兼容小程序。
- Vue 模板没有更新。
- 微信开发者工具缓存异常。

## 2. 建立可验证现象

我没有停留在“页面看起来不对”，而是扩展页面检查脚本：

```text
打开详情页
-> 点击 .answer-head
-> 等待 .md-heading-2
-> 断言文本包含“核心结论”
-> 截图
```

自动断言失败，证明问题不是主观视觉差异，而是 Markdown 内容确实没有进入渲染结果。

对应脚本：

- `scripts/mp-page-check.cjs`

## 3. 假设排查

| 假设 | 验证 | 结果 |
|---|---|---|
| 页面未打开 | 非白屏截图和页面路径 | 排除 |
| 点击没有命中 | 点击后页面状态截图 | 排除 |
| Markdown 组件未挂载 | 检查详情模板 | 排除 |
| 新题目没有 `answerMarkdown` | 检查内置题库和云端 seed | 排除 |
| 运行时读取了旧数据 | 检查页面题目池和本地缓存 | 命中 |

## 4. 根因

旧实现将题目正文与用户状态一起保存在 `questions` 缓存。加载详情时，旧缓存优先于新版内置/云端题库，因此旧的 `answer` 覆盖了新的 `answerMarkdown`。

本质问题不是 Markdown，而是错误的数据所有权：

```text
旧缓存既被当作用户状态，又被当作题库内容源
```

## 5. 修复策略

修复原则：

- 题干、答案、Markdown、标签等正文以新版题库为准。
- 旧缓存只继承收藏和掌握状态。

核心逻辑位于：

- `src/domain/questionBankCore.cjs`
- `src/services/questionBank.js`

```js
function mergeStoredQuestionState(question, storedQuestion = {}) {
  return {
    ...question,
    isFavorited: Boolean(storedQuestion.isFavorited),
    mastery: storedQuestion.mastery || ''
  }
}
```

这不是删除缓存绕过问题，而是修正缓存模型。

## 6. 回归保护

单元测试明确保护该行为：

```text
keeps new content while inheriting only user state from stale cache
```

断言内容包括：

- 新题干保持不变。
- 新 `answerMarkdown` 保持不变。
- 旧收藏状态被继承。
- 旧掌握状态被继承。

运行：

```bash
pnpm test
```

## 7. 最终验证

- Taro 构建通过。
- 自动点击解析成功。
- 页面出现 `.md-heading-2`。
- 文本断言命中“核心结论”。
- 截图显示标题、列表、代码块和复制按钮。
- 云端稳定 ID 详情页同样通过。

## 8. 能力总结

这个案例证明的不是“我会修 Markdown”，而是：

1. 将模糊视觉问题转化为可自动断言的失败。
2. 用假设列表逐层缩小问题范围。
3. 识别数据所有权错误，而不是只处理表面症状。
4. 将修复行为写成单元测试，防止再次回归。
