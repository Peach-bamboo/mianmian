# 云函数目录

当前云开发环境：

```txt
cloudbase-6gdlm2mh02471f6b
```

## 已创建云函数

### login

作用：

- 获取当前微信用户的 `openid`
- 如果 `users` 集合里没有该用户，则创建默认用户
- 如果已经存在，则返回用户资料

返回示例：

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

### updateUserProfile

作用：

- 保存用户昵称和头像
- 如果 `users` 集合里还没有该用户，则创建默认用户资料

请求参数：

```js
{
  nickname: 'Chen',
  avatarUrl: 'https://...'
}
```

### getQuestionStates

作用：

- 获取当前用户所有题目状态
- 用于小程序启动时把云端收藏/掌握状态合并到本地题库

返回示例：

```js
{
  success: true,
  states: [
    {
      questionId: 1,
      category: 'js',
      isFavorited: true,
      mastery: 'mastered',
      reviewCount: 2,
      lastReviewedAt: null
    }
  ]
}
```

### toggleFavorite

作用：

- 收藏或取消收藏一道题

请求参数：

```js
{
  questionId: 1,
  category: 'vue',
  isFavorited: true
}
```

### updateMastery

作用：

- 标记一道题为已掌握或待复习

请求参数：

```js
{
  questionId: 1,
  category: 'vue',
  mastery: 'mastered'
}
```

### getGrowthSummary

作用：

- 从云端统计成长中心数据
- 返回已掌握、待复习、已收藏、复习率和各分类进度
- 读取最近练习记录，统计最近 7 天练习过的题目数

请求参数：

```js
{
  totalsByCategory: {
    js: 20,
    vue: 18
  }
}
```

返回示例：

```js
{
  success: true,
  user: {
    nickname: '微信用户',
    avatarUrl: '',
    level: 1,
    continuousDays: 0
  },
  summary: {
    masteredCount: 3,
    retryCount: 2,
    favoritedCount: 5,
    reviewRate: '60%',
    weeklySolved: 5
  },
  dailyChallenge: {
    date: '2026-06-03',
    questionId: 12,
    status: 'completed',
    recordCount: 2
  },
  recentRecords: [
    {
      mode: 'module',
      questionId: 1,
      category: 'js',
      action: 'view',
      createdAt: '2026-06-03T03:00:00.000Z'
    }
  ],
  moduleProgress: [
    {
      category: 'js',
      mastered: 2,
      retry: 1,
      favorited: 3,
      total: 20,
      percent: 10
    }
  ]
}
```

### addPracticeRecord

作用：

- 写入用户练习轨迹
- 用户进入题目详情、展开解析、标记掌握/复习时都会记录
- 同步更新 `users.continuousDays` 和 `users.lastStudyDate`

请求参数：

```js
{
  mode: 'module',
  questionId: 1,
  category: 'js',
  action: 'view'
}
```

返回示例：

```js
{
  success: true
}
```

### getDailyQuestion

作用：

- 为当前用户获取每日一题
- 同一天重复进入会返回同一道题
- 没有当天记录时，从前端传入的题目 ID 里选择一道并写入 `daily_questions`

请求参数：

```js
{
  questionIds: [1, 2, 3, 4, 5]
}
```

### getQuestionBank

作用：

- 为小程序提供云端题库读取能力
- 支持分类、列表、详情和题库元信息

上线前需要先创建并导入题库集合：

```txt
.private/question-bank-seed/question_categories.import.json -> question_categories
.private/question-bank-seed/questions.import.json -> questions
```

本地生成和校验命令：

```sh
pnpm question-bank:seed
pnpm question-bank:validate
```

部署 `getQuestionBank` 后，也要同步部署已经兼容字符串题目 ID 的用户状态相关云函数：

```txt
toggleFavorite
updateMastery
addPracticeRecord
getDailyQuestion
getGrowthSummary
```
- 只返回 `published` 状态的数据
- 小程序端云函数失败时会自动回退到本地题库

请求参数：

```js
{
  action: 'list',
  categoryId: 'js',
  page: 1,
  pageSize: 20
}
```

支持的 action：

- `categories`：获取已发布分类
- `list`：获取题目列表，不返回完整答案
- `detail`：获取题目详情和 Markdown 答案
- `meta`：获取题库版本、题目数和更新时间

云端集合：

- `question_categories`
- `questions`
- `question_assets`
- `question_versions`（预留给后台版本历史）

本地题库迁移到云端前，可以先生成导入种子数据：

```sh
pnpm question-bank:seed
```

脚本会输出：

```txt
.private/question-bank-seed/question_categories.import.json
.private/question-bank-seed/questions.import.json
```

这两个文件后缀是 `.json`，内容是 JSON Lines，可分别导入微信云开发数据库的 `question_categories` 和 `questions` 集合。

返回示例：

```js
{
  success: true,
  date: '2026-06-03',
  questionId: 12,
  isNew: true
}
```

### addLabRecord

作用：

- 写入用户实验室行为
- 记录进入实验室、打开实验、离开实验室和停留时长

请求参数：

```js
{
  labKey: 'planet',
  labName: '旋转星球',
  action: 'enter',
  duration: 0
}
```

返回示例：

```js
{
  success: true
}
```

## 在微信开发者工具里要做的事

1. 打开“云开发”面板。
2. 确认当前环境是 `cloudbase-6gdlm2mh02471f6b`。
3. 在数据库里创建集合 `users`、`user_question_states`、`practice_records`、`daily_questions` 和 `lab_records`。
4. 右键 `cloudfunctions/login`，选择“上传并部署：云端安装依赖”。
5. 右键 `cloudfunctions/updateUserProfile`，选择“上传并部署：云端安装依赖”。
6. 右键 `cloudfunctions/getQuestionStates`，选择“上传并部署：云端安装依赖”。
7. 右键 `cloudfunctions/toggleFavorite`，选择“上传并部署：云端安装依赖”。
8. 右键 `cloudfunctions/updateMastery`，选择“上传并部署：云端安装依赖”。
9. 右键 `cloudfunctions/getGrowthSummary`，选择“上传并部署：云端安装依赖”。
10. 右键 `cloudfunctions/addPracticeRecord`，选择“上传并部署：云端安装依赖”。
11. 右键 `cloudfunctions/getDailyQuestion`，选择“上传并部署：云端安装依赖”。
12. 右键 `cloudfunctions/addLabRecord`，选择“上传并部署：云端安装依赖”。
13. 部署完成后，从小程序成长中心点击“登录 / 注册”，再去首页点击“每日任务”测试每日一题，进入实验页测试实验记录。
