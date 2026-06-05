# 前端面面云开发后端接口文档

## 1. 目标

第一版后端只负责“用户学习数据”，不负责题库内容。

题库题目仍然可以继续放在 `src/data/questions.json`，云端只保存每个用户自己的状态：

- 收藏了哪些题
- 哪些题已掌握
- 哪些题待复习
- 最近练习记录
- 实验记录
- 成长中心统计
- 每日一题记录

云开发环境 ID：

```txt
cloudbase-6gdlm2mh02471f6b
```

## 2. 数据库集合

### 2.1 users

保存用户基础资料。每个微信用户一条记录。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| _id | string | 是 | 数据库自动生成 |
| openid | string | 是 | 微信用户唯一 ID |
| nickname | string | 否 | 用户昵称 |
| avatarUrl | string | 否 | 用户头像 |
| level | number | 是 | 用户等级，默认 1 |
| continuousDays | number | 是 | 连续学习天数，默认 0 |
| lastStudyDate | string | 否 | 最近学习日期，格式 `YYYY-MM-DD` |
| createdAt | date | 是 | 创建时间 |
| updatedAt | date | 是 | 更新时间 |

建议索引：

```txt
openid 唯一索引
```

### 2.2 user_question_states

保存用户对每一道题的个人状态。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| _id | string | 是 | 数据库自动生成 |
| openid | string | 是 | 用户 openid |
| questionId | number | 是 | 题目 ID，对应本地题库 |
| category | string | 是 | 题目分类，如 `js`、`vue`、`css` |
| isFavorited | boolean | 是 | 是否收藏 |
| mastery | string | 否 | `mastered` 已掌握，`retry` 待复习，空表示未标记 |
| reviewCount | number | 是 | 复习次数，默认 0 |
| lastReviewedAt | date | 否 | 最近复习时间 |
| createdAt | date | 是 | 创建时间 |
| updatedAt | date | 是 | 更新时间 |

建议索引：

```txt
openid + questionId 唯一索引
openid + isFavorited
openid + mastery
```

### 2.3 practice_records

保存练习记录，用于成长中心和最近练习。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| _id | string | 是 | 数据库自动生成 |
| openid | string | 是 | 用户 openid |
| mode | string | 是 | `module` 分类练习，`random` 随机练习，`daily` 每日一题，`favorites` 收藏复习 |
| questionId | number | 是 | 题目 ID |
| category | string | 否 | 题目分类 |
| action | string | 是 | `view` 查看，`answer` 展开解析，`mastered` 标记掌握，`retry` 标记复习 |
| createdAt | date | 是 | 创建时间 |

建议索引：

```txt
openid + createdAt
openid + mode
```

### 2.4 lab_records

保存可视化实验室记录。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| _id | string | 是 | 数据库自动生成 |
| openid | string | 是 | 用户 openid |
| labKey | string | 是 | 实验标识 |
| labName | string | 是 | 实验名称 |
| duration | number | 否 | 停留时长，单位秒 |
| createdAt | date | 是 | 创建时间 |

建议索引：

```txt
openid + createdAt
openid + labKey
```

### 2.5 daily_questions

保存用户每日一题。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| _id | string | 是 | 数据库自动生成 |
| openid | string | 是 | 用户 openid |
| date | string | 是 | 日期，格式 `YYYY-MM-DD` |
| questionId | number | 是 | 当天题目 ID |
| createdAt | date | 是 | 创建时间 |

建议索引：

```txt
openid + date 唯一索引
```

## 3. 数据库权限建议

第一版建议：

```txt
所有集合：仅云函数可读写
```

也就是前端不要直接写数据库，而是统一调用云函数。这样可以保证：

- 用户只能操作自己的数据
- openid 不从前端传入，避免伪造
- 后续统计、成就、连续学习天数都可以在云函数里统一维护

## 4. 云函数接口

### 4.1 login

初始化或获取当前用户。

调用场景：

- 小程序启动
- 成长中心进入时
- 用户点击登录同步时

请求参数：

```js
{}
```

返回：

```js
{
  openid: 'xxx',
  user: {
    nickname: '',
    avatarUrl: '',
    level: 1,
    continuousDays: 0,
    lastStudyDate: ''
  }
}
```

逻辑：

1. 云函数通过 `cloud.getWXContext()` 获取 `OPENID`。
2. 查询 `users` 是否已有用户。
3. 没有则创建默认用户。
4. 返回用户资料。

### 4.2 updateUserProfile

更新用户头像和昵称。

请求参数：

```js
{
  nickname: 'Chen',
  avatarUrl: 'https://...'
}
```

返回：

```js
{
  success: true,
  user: {
    nickname: 'Chen',
    avatarUrl: 'https://...',
    level: 1,
    continuousDays: 0
  }
}
```

### 4.3 getQuestionStates

获取当前用户所有题目状态。

请求参数：

```js
{}
```

返回：

```js
{
  states: [
    {
      questionId: 1,
      category: 'js',
      isFavorited: true,
      mastery: 'mastered',
      reviewCount: 3,
      lastReviewedAt: '2026-06-02T10:00:00.000Z'
    }
  ]
}
```

前端用途：

- 进入应用后，把云端状态合并到本地题库 JSON。
- 收藏页、成长页、题目列表都基于合并后的状态展示。

### 4.4 syncQuestionState

同步单道题状态。

请求参数：

```js
{
  questionId: 1,
  category: 'js',
  isFavorited: true,
  mastery: 'retry'
}
```

返回：

```js
{
  success: true,
  state: {
    questionId: 1,
    category: 'js',
    isFavorited: true,
    mastery: 'retry',
    reviewCount: 2
  }
}
```

逻辑：

1. 根据 `openid + questionId` 查询状态。
2. 有记录则更新。
3. 没有记录则创建。
4. 如果 mastery 发生变化，可以写入一条 `practice_records`。
5. 更新 `users.lastStudyDate` 和连续学习天数。

### 4.5 toggleFavorite

切换收藏状态。

请求参数：

```js
{
  questionId: 1,
  category: 'vue',
  isFavorited: true
}
```

返回：

```js
{
  success: true,
  isFavorited: true
}
```

说明：

- `isFavorited: true` 表示收藏。
- `isFavorited: false` 表示取消收藏。

### 4.6 updateMastery

更新掌握状态。

请求参数：

```js
{
  questionId: 1,
  category: 'vue',
  mastery: 'mastered'
}
```

返回：

```js
{
  success: true,
  mastery: 'mastered'
}
```

`mastery` 可选值：

```txt
mastered 已掌握
retry 待复习
null 清除状态
```

### 4.7 getFavorites

获取收藏题目 ID 列表。

请求参数：

```js
{}
```

返回：

```js
{
  questionIds: [1, 8, 12],
  states: [
    {
      questionId: 1,
      category: 'vue',
      isFavorited: true,
      mastery: 'retry'
    }
  ]
}
```

说明：

题目正文仍然从本地 `questions.json` 读取。云端只返回用户收藏了哪些题。

### 4.8 addPracticeRecord

写入练习记录。

请求参数：

```js
{
  mode: 'module',
  questionId: 1,
  category: 'js',
  action: 'view'
}
```

返回：

```js
{
  success: true
}
```

建议触发时机：

- 进入题目详情：`view`
- 展开解析：`answer`
- 标记已掌握：`mastered`
- 标记待复习：`retry`

### 4.9 getGrowthSummary

获取成长中心统计数据。

请求参数：

```js
{}
```

返回：

```js
{
  user: {
    nickname: 'Chen',
    avatarUrl: '',
    level: 4,
    continuousDays: 7
  },
  summary: {
    masteredCount: 38,
    favoritedCount: 12,
    retryCount: 8,
    reviewRate: '82%',
    weeklySolved: 14
  },
  moduleProgress: [
    {
      category: 'vue',
      name: 'Vue',
      mastered: 12,
      total: 20,
      percent: 60
    }
  ],
  recentRecords: [
    {
      mode: 'module',
      questionId: 1,
      category: 'js',
      action: 'view',
      createdAt: '2026-06-02T10:00:00.000Z'
    }
  ],
  labRecords: [
    {
      labKey: 'event-loop',
      labName: '事件循环实验',
      createdAt: '2026-06-02T10:00:00.000Z'
    }
  ]
}
```

### 4.10 addLabRecord

写入实验室记录。

请求参数：

```js
{
  labKey: 'event-loop',
  labName: '事件循环实验',
  duration: 120
}
```

返回：

```js
{
  success: true
}
```

### 4.11 getDailyQuestion

获取当前用户今天的每日一题。

请求参数：

```js
{
  questionIds: [1, 2, 3, 4, 5]
}
```

返回：

```js
{
  success: true,
  date: '2026-06-03',
  questionId: 3,
  isNew: true
}
```

逻辑：

1. 查询 `daily_questions` 是否已有今天记录。
2. 有则直接返回。
3. 没有则根据 `openid + date` 从前端传入的 `questionIds` 中稳定选择一个。
4. 写入 `daily_questions`。
5. 返回 `questionId`。

## 5. 前端接入顺序

建议按这个顺序做，不要一次全接：

### 第一步：云开发初始化

当前项目已完成：

```js
cloud.init({
  env: 'cloudbase-6gdlm2mh02471f6b',
  traceUser: true
})
```

### 第二步：接 login

目标：

- 成长中心不再写死 `Chen`
- 未登录显示游客态
- 登录后保存用户头像和昵称

### 第三步：接 getQuestionStates

目标：

- 应用启动时读取云端题目状态
- 合并到本地 `questions.json`

### 第四步：接 toggleFavorite / updateMastery

目标：

- 收藏状态同步到云端
- 已掌握/待复习同步到云端

### 第五步：接 getGrowthSummary

目标：

- 成长中心数据从云端统计
- 我的收藏、待复习、已掌握都有真实数据

### 第六步：接 practice_records / lab_records / daily_questions

目标：

- 最近练习
- 每日一题
- 连续学习天数

当前项目已接入：

- `addPracticeRecord`
- `getDailyQuestion`

后续待接入：

- 实验记录 `lab_records`

## 6. 云函数目录建议

建议后续在项目根目录添加：

```txt
cloudfunctions/
  login/
    index.js
    package.json
  updateUserProfile/
    index.js
    package.json
  getQuestionStates/
    index.js
    package.json
  syncQuestionState/
    index.js
    package.json
  toggleFavorite/
    index.js
    package.json
  updateMastery/
    index.js
    package.json
  getFavorites/
    index.js
    package.json
  addPracticeRecord/
    index.js
    package.json
  getGrowthSummary/
    index.js
    package.json
  addLabRecord/
    index.js
    package.json
  getDailyQuestion/
    index.js
    package.json
```

第一版也可以先合并成少量云函数：

```txt
user
questionState
growth
lab
daily
```

为了新手更好理解，建议先按独立云函数拆开，后面再合并优化。

## 7. 前端调用示例

```js
import Taro from '@tarojs/taro'

export function callCloudFunction(name, data = {}) {
  return Taro.cloud.callFunction({
    name,
    data
  }).then(res => res.result)
}
```

收藏示例：

```js
await callCloudFunction('toggleFavorite', {
  questionId: question.id,
  category: question.category,
  isFavorited: true
})
```

更新掌握状态示例：

```js
await callCloudFunction('updateMastery', {
  questionId: question.id,
  category: question.category,
  mastery: 'mastered'
})
```

每日一题示例：

```js
await callCloudFunction('getDailyQuestion', {
  questionIds: questions.map(question => question.id)
})
```

## 8. 第一版验收标准

做到下面这些，就说明后端第一版成功：

- 用户打开小程序后，云端能识别 openid。
- 成长中心不再显示写死的 `Chen`。
- 收藏一道题后，退出再进入仍然是收藏状态。
- 标记已掌握/待复习后，退出再进入仍然保留状态。
- 成长中心能显示真实收藏数、已掌握数、待复习数。
- 首页“每日任务”同一天多次进入返回同一道题。
- 换一台设备登录同一个微信，能看到同一份学习数据。
