# 宣誓爱业务组件库文档

> **版本：** 1.1.1
> **更新日期：** 2026-07-26
> **组件目录：** 29 个 `.uvue`；本文重点记录 12 个业务组件

---

## 组件列表

### 1. XsaEmpty — 空状态

**使用场景**：所有列表页面的空状态展示

#### 使用示例

```vue
<template>
  <!-- 默认空状态 -->
  <XsaEmpty />

  <!-- 自定义文字 -->
  <XsaEmpty
    text="暂无消息"
    description="还没有人给你发消息哦"
  />

  <!-- 带操作按钮 -->
  <XsaEmpty
    type="noData"
    :show-action="true"
    action-text="刷新"
    @action="handleRefresh"
  />

  <!-- 预设类型 -->
  <XsaEmpty type="noNetwork" size="large" />
  <XsaEmpty type="noPermission" />

  <!-- 自定义图标 -->
  <XsaEmpty
    icon="💔"
    text="还没有人喜欢你"
    description="完善资料可以获得更多曝光"
    :show-action="true"
    action-text="完善资料"
  />
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `string` | — | 空状态图标（emoji） |
| `text` | `string` | — | 提示文字 |
| `description` | `string` | — | 描述文字 |
| `showAction` | `boolean` | `false` | 是否显示操作按钮 |
| `actionText` | `string` | `'刷新'` | 操作按钮文字 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `type` | `'default' \| 'noData' \| 'noNetwork' \| 'noPermission'` | `'default'` | 预设类型 |

#### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `action` | — | 点击操作按钮时触发 |

---

### 2. XsaMessageItem — 消息列表项

**使用场景**：消息列表页面

#### 使用示例

```vue
<template>
  <view class="message-list">
    <XsaMessageItem
      v-for="msg in messageList"
      :key="msg.id"
      :message="msg"
      @click="handleMessageClick"
    />
  </view>
</template>

<script setup>
const messageList = ref([
  {
    id: 1,
    avatar: '/static/avatar1.jpg',
    name: '张小美',
    lastMessage: '你好，很高兴认识你',
    time: Date.now() - 5 * 60 * 1000, // 5分钟前
    unreadCount: 3,
    online: true,
    messageType: 'text'
  },
  {
    id: 2,
    avatar: '/static/avatar2.jpg',
    name: '李明',
    lastMessage: '[图片]',
    time: '昨天',
    unreadCount: 0,
    online: false,
    messageType: 'image'
  }
]);

const handleMessageClick = (message) => {
  uni.navigateTo({
    url: `/pagesSub/chat/detail?userId=${message.id}`
  });
};
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `message` | `Message` | — | 消息数据对象（必填） |

**Message 类型定义**：
```typescript
interface Message {
  id: number;
  avatar: string;
  name: string;
  lastMessage: string;
  time: string | number; // 时间戳或字符串
  unreadCount?: number;
  online?: boolean;
  messageType?: 'text' | 'image' | 'voice';
}
```

#### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `click` | `message: Message` | 点击消息项时触发 |

---

### 3. XsaDynamicCard — 动态卡片

**使用场景**：社区动态列表

#### 使用示例

```vue
<template>
  <view class="dynamic-list">
    <XsaDynamicCard
      v-for="item in dynamicList"
      :key="item.id"
      :dynamic="item"
      @user-click="handleUserClick"
      @like="handleLike"
      @comment="handleComment"
      @share="handleShare"
      @more="handleMore"
    />
  </view>
</template>

<script setup>
const dynamicList = ref([
  {
    id: 1,
    user: {
      id: 1,
      avatar: '/static/avatar.jpg',
      name: '张小美'
    },
    content: '今天天气真好，出门逛街啦～',
    photos: [
      '/static/photo1.jpg',
      '/static/photo2.jpg',
      '/static/photo3.jpg'
    ],
    location: '北京·朝阳区',
    time: '2小时前',
    likeCount: 25,
    commentCount: 8,
    liked: false
  }
]);

const handleLike = (dynamicId) => {
  // 调用点赞接口
};

const handleComment = (dynamicId) => {
  // 跳转到评论页
};
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dynamic` | `Dynamic` | — | 动态数据对象（必填） |

**Dynamic 类型定义**：
```typescript
interface Dynamic {
  id: number;
  user: {
    id: number;
    avatar: string;
    name: string;
  };
  content?: string;
  photos?: string[];
  location?: string;
  time: string;
  likeCount: number;
  commentCount: number;
  liked?: boolean;
}
```

#### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `userClick` | `userId: number` | 点击用户信息时触发 |
| `photoClick` | `index: number` | 点击图片时触发 |
| `like` | `dynamicId: number` | 点击点赞时触发 |
| `comment` | `dynamicId: number` | 点击评论时触发 |
| `share` | `dynamicId: number` | 点击分享时触发 |
| `more` | `dynamicId: number` | 点击更多操作时触发 |

---

### 4. XsaMessageCenter — 统一消息中心

**使用场景**：普通用户消息 Tab、父母端消息面板。

- `mode="standard"` 展示认识申请、纸飞机、Ta 的动态、情感实验室四个入口；`mode="parent"` 只展示申请与聊天。
- 内部统一管理会话分页、收到/发出申请、待处理计数、全部已读、失败重试和聊天权限复查。
- 父母模式在加载与业务动作前重新获取父母上下文并校验访问门禁，同时向外发出 `parent-context-change`；全部消息调用都使用关联子女的 `MessageSubject`，不能落回父母账号或普通用户默认主体。
- 接受 / 拒绝使用稳定 `clientCommandId`。业务响应不明确时保留原状态，并重新拉取收到列表回补服务端最终状态。
- 401 或父母授权失效时立即清除组件内已加载的会话和申请数据。
- Props：`mode?: 'standard' | 'parent'`、`parentContext?: ParentContext`。

### 5. XsaApplicationTabs — 申请双 Tab

**使用场景**：认识申请 Sheet。

- Props：`visible`、`activeTab`、`tabs`、`applications`、`loading`、`error`、`actionId`、`hasMore`、`largeText?`、`protectPhotos?`。
- Events：`close`、`change`、`retry`、`load-more`、`accept`、`reject`。
- “收到的 / 发出的”数据由调用方分开分页；仅收到且 `pending` 的记录计入待处理数量。
- 业务失败时保留原状态，并通过错误态或 Toast 提供重试；组件不得本地伪造接受或拒绝成功。

### 6. XsaConversationList — 会话列表

**使用场景**：统一消息中心的最近聊天列表。

- Props：`conversations`、`loading`、`loadingMore`、`error`、`hasMore`、`largeText?`、`protectPhotos?`、`retryReset?`。
- Events：`open`、`retry`、`retry-more`、`load-more`。
- `protectPhotos` 用于父母端头像保护；真正的清晰照片授权必须由数据层决定，不能只依赖 CSS 模糊。

### 7. ParentBottomNav — 父母端四面板导航

**使用场景**：父母角色单页壳层。

- `active` 为 `home | matchmaker | message | profile`，切换时发出 `change`。
- 固定底部并预留安全区，四个触控目标均不小于 48px。
- 该组件不修改普通用户原生五 Tab。

### 8. ParentCandidateCard — 父母端候选卡

**使用场景**：父母端推荐与我的喜欢。

- Props：`candidate`；Events：`open`、`like`、`apply`。
- 列表头像始终按保护态展示；卡片使用父母端 16px 正文、20px 以上姓名层级和 48px 操作按钮。
- 对外文案统一为“喜欢 / 申请认识”；“牵线”只用于红娘服务。

### 9. ParentGateNotice — 双主体门禁提示

**使用场景**：父母端首页和申请动作前的认证说明。

- Props：`gate`；未通过时发出 `action`。
- 分别展示父母实名认证与子女授权，不能把两者合并成一个模糊的“已认证”状态。
- 授权过期、撤销或上下文获取失败时按无权限处理，不允许沿用缓存成功状态。

### 10. ParentApplySheet — 父母端申请确认

**使用场景**：父母端候选列表和候选详情的“申请认识”确认。

- Props：`visible`、`candidateId`、`parentContext`；剩余次数和双主体门禁均从同一 `ParentContext` 读取。
- Events：`close`、`success`；组件内部收集附言并经统一 API 提交，只有业务成功后才发出 `success` 并关闭。
- Sheet 同时展示安全说明与剩余申请次数，不直接交换微信、电话或照片。
- 申请动作仍由 API 层执行父母实名与子女授权双门禁；Sheet 只负责收集明确确认，不替代权限校验。
- 剩余次数为 0 时确认按钮禁用；成功响应中的剩余次数同步到当前上下文和父母模块 Mock 上下文，刷新后不得回跳。

---

## 组件总览

| 组件 | 说明 | 使用场景 | 状态 |
|------|------|----------|------|
| **XsaEmpty** | 空状态 | 所有列表页面 | ✅ |
| **XsaMessageItem** | 消息列表项 | 消息列表 | ✅ |
| **XsaDynamicCard** | 动态卡片 | 社区动态列表 | ✅ |
| **XsaMessageCenter** | 统一消息中心 | 普通用户消息、父母端消息 | ✅ Mock 契约 |
| **XsaApplicationTabs** | 收到/发出申请 | 认识申请 Sheet | ✅ Mock 契约 |
| **XsaConversationList** | 会话分页列表 | 消息中心 | ✅ Mock 契约 |
| **ParentBottomNav** | 四面板导航 | 父母端 | ✅ 前端 |
| **ParentCandidateCard** | 隐私候选卡 | 父母端推荐/喜欢 | ✅ Mock 契约 |
| **ParentGateNotice** | 双主体门禁提示 | 父母端认证/授权 | ✅ Mock 契约 |
| **ParentApplySheet** | 申请附言与明确确认 | 父母端推荐/详情 | ✅ Mock 契约 |

---

## 设计规范

所有业务组件严格遵循基础组件库的设计规范：

- 使用 CSS 变量（`var(--accent)`, `var(--surface)` 等）
- 统一的圆角、间距、字体
- 流畅的过渡动画（0.18s ~ 0.22s）
- 移动端触摸优化

---

**文档维护者：** 宣誓爱前端团队  
**最后更新：** 2026-07-26
**本文重点业务组件：** 12 个
