# 宣誓爱通用组件库文档

> **版本：** 1.0.0  
> **更新日期：** 2026-07-20  
> **设计规范：** 遵循 `DESIGN.md` 的设计 Token

---

## 组件列表

### 1. XsaButton — 按钮组件

#### 使用示例

```vue
<template>
  <!-- 主按钮 -->
  <XsaButton variant="primary" @click="handleSubmit">
    申请认识
  </XsaButton>

  <!-- 次要按钮 -->
  <XsaButton variant="secondary" @click="handleCancel">
    取消
  </XsaButton>

  <!-- 文字按钮 -->
  <XsaButton variant="text" @click="handleMore">
    查看更多
  </XsaButton>

  <!-- 胶囊按钮 -->
  <XsaButton variant="pill" @click="handleFilter">
    筛选
  </XsaButton>

  <!-- 加载状态 -->
  <XsaButton variant="primary" :loading="true">
    提交中...
  </XsaButton>

  <!-- 禁用状态 -->
  <XsaButton variant="primary" :disabled="true">
    已提交
  </XsaButton>
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'text' \| 'pill'` | `'primary'` | 按钮变体 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮尺寸 |
| `icon` | `string` | — | 图标名称 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否加载中 |

#### Events

| 事件 | 说明 |
|------|------|
| `click` | 点击按钮时触发 |

---

### 2. XsaCard — 卡片组件

#### 使用示例

```vue
<template>
  <!-- 标准卡片 -->
  <XsaCard variant="standard">
    <view>卡片内容</view>
  </XsaCard>

  <!-- Hero 卡片（人物照片） -->
  <XsaCard variant="hero">
    <image src="..." mode="aspectFill"></image>
  </XsaCard>

  <!-- 功能卡片（深色背景） -->
  <XsaCard variant="feature">
    <text>线下活动</text>
  </XsaCard>

  <!-- 网格卡片（可点击） -->
  <XsaCard variant="grid" :clickable="true" @click="handleCardClick">
    <view>用户资料</view>
  </XsaCard>
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'standard' \| 'hero' \| 'feature' \| 'grid'` | `'standard'` | 卡片变体 |
| `clickable` | `boolean` | `false` | 是否可点击 |

#### Events

| 事件 | 说明 |
|------|------|
| `click` | 可点击时，点击卡片触发 |

---

### 3. XsaTag — 标签/徽章组件

#### 使用示例

```vue
<template>
  <!-- 默认标签 -->
  <XsaTag variant="default">实名认证</XsaTag>

  <!-- 强调标签 -->
  <XsaTag variant="accent">INFP</XsaTag>

  <!-- 徽章 -->
  <XsaTag variant="badge">3</XsaTag>

  <!-- 可选中标签 -->
  <XsaTag
    variant="default"
    :clickable="true"
    :selected="isSelected"
    @click="handleTagClick"
  >
    看展
  </XsaTag>
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'default' \| 'accent' \| 'badge'` | `'default'` | 标签变体 |
| `size` | `'small' \| 'medium'` | `'medium'` | 标签尺寸 |
| `selected` | `boolean` | `false` | 是否选中 |
| `clickable` | `boolean` | `false` | 是否可点击 |

#### Events

| 事件 | 说明 |
|------|------|
| `click` | 可点击时，点击标签触发 |

---

### 4. XsaSheet — 底部滑出面板

#### 使用示例

```vue
<template>
  <XsaButton @click="showSheet = true">打开面板</XsaButton>

  <XsaSheet
    :visible="showSheet"
    title="筛选条件"
    :tall="false"
    @close="showSheet = false"
  >
    <view>面板内容</view>
  </XsaSheet>
</template>

<script setup>
const showSheet = ref(false);
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示 |
| `title` | `string` | — | 面板标题 |
| `tall` | `boolean` | `false` | 是否高面板（94%） |
| `closeOnOverlay` | `boolean` | `true` | 点击遮罩是否关闭 |

#### Events

| 事件 | 说明 |
|------|------|
| `close` | 关闭面板时触发 |

---

### 5. XsaToast — 提示消息

#### 使用示例

```vue
<template>
  <XsaButton @click="showToast">显示提示</XsaButton>

  <XsaToast
    :visible="toastVisible"
    :message="toastMessage"
    :duration="1900"
    @hide="toastVisible = false"
  />
</template>

<script setup>
const toastVisible = ref(false);
const toastMessage = ref('');

const showToast = () => {
  toastMessage.value = '操作成功';
  toastVisible.value = true;
};
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `message` | `string` | — | 提示内容 |
| `visible` | `boolean` | `false` | 是否显示 |
| `duration` | `number` | `1900` | 显示时长（毫秒） |

#### Events

| 事件 | 说明 |
|------|------|
| `hide` | 自动隐藏时触发 |

---

## 设计规范遵循

所有组件严格遵循 `DESIGN.md` 的设计规范：

### 色彩
- 使用 CSS 变量：`var(--accent)`, `var(--brown)`, `var(--surface)` 等
- 禁止纯黑纯白
- 所有阴影使用 OKLCH 暖色

### 圆角
- 按钮：7—10px
- 卡片：10—12px（标准）/ 8px 26px 8px 8px（Hero）
- 弹窗：24px 24px 0 0
- 胶囊：999px

### 间距
- 采用 8px 基础网格
- 按钮内边距：11—18px
- 卡片内边距：13—18px

### 字体
- 标题：`var(--serif)` 衬线字体
- 正文：`var(--sans)` 无衬线字体
- 按钮：字重 800

### 过渡
- 快速反馈：0.18s
- 标准过渡：0.22s
- Sheet 滑入：0.28s cubic-bezier(0.2, 0.75, 0.25, 1)

---

## 使用建议

### 1. 全局引入

在 `App.uvue` 中全局注册组件：

```vue
<script setup lang="uts">
import XsaButton from '@/components/XsaButton.uvue';
import XsaCard from '@/components/XsaCard.uvue';
import XsaTag from '@/components/XsaTag.uvue';
import XsaSheet from '@/components/XsaSheet.uvue';
import XsaToast from '@/components/XsaToast.uvue';
</script>
```

### 2. 组件组合

```vue
<template>
  <XsaCard variant="standard">
    <view class="user-info">
      <text class="name">苏晚晴</text>
      <XsaTag variant="accent">INFP</XsaTag>
    </view>
    
    <view class="actions">
      <XsaButton variant="secondary" size="small">跳过</XsaButton>
      <XsaButton variant="primary">申请认识</XsaButton>
    </view>
  </XsaCard>
</template>
```

### 3. 响应式设计

所有组件已适配移动端，无需额外处理。

---

---

### 6. XsaInput — 输入框组件

#### 使用示例

```vue
<template>
  <!-- 基础输入框 -->
  <XsaInput
    v-model="username"
    label="用户名"
    placeholder="请输入用户名"
  />

  <!-- 带图标 -->
  <XsaInput
    v-model="phone"
    type="tel"
    label="手机号"
    placeholder="请输入手机号"
    prefix-icon="phone"
  />

  <!-- 可清除 -->
  <XsaInput
    v-model="search"
    placeholder="搜索"
    :clearable="true"
  />

  <!-- 带错误提示 -->
  <XsaInput
    v-model="email"
    type="text"
    label="邮箱"
    placeholder="请输入邮箱"
    error="邮箱格式不正确"
  />

  <!-- 带提示文字 -->
  <XsaInput
    v-model="password"
    type="password"
    label="密码"
    placeholder="请输入密码"
    hint="密码长度至少 6 位"
  />
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `string` | — | 输入值（v-model） |
| `type` | `'text' \| 'number' \| 'password' \| 'tel'` | `'text'` | 输入类型 |
| `label` | `string` | — | 标签文字 |
| `placeholder` | `string` | — | 占位符 |
| `hint` | `string` | — | 提示文字 |
| `error` | `string` | — | 错误提示 |
| `prefixIcon` | `string` | — | 前缀图标 |
| `suffixIcon` | `string` | — | 后缀图标 |
| `clearable` | `boolean` | `false` | 是否可清除 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `maxlength` | `number` | `-1` | 最大长度 |

#### Events

| 事件 | 说明 |
|------|------|
| `update:modelValue` | 输入值改变时触发 |
| `focus` | 获得焦点时触发 |
| `blur` | 失去焦点时触发 |

---

### 7. XsaAvatar — 头像组件

#### 使用示例

```vue
<template>
  <!-- 基础头像 -->
  <XsaAvatar src="/static/avatar.jpg" />

  <!-- 不同尺寸 -->
  <XsaAvatar src="/static/avatar.jpg" size="small" />
  <XsaAvatar src="/static/avatar.jpg" size="medium" />
  <XsaAvatar src="/static/avatar.jpg" size="large" />

  <!-- 圆角头像 -->
  <XsaAvatar src="/static/avatar.jpg" shape="rounded" />

  <!-- 带在线状态 -->
  <XsaAvatar
    src="/static/avatar.jpg"
    badge="1"
    badge-type="online"
  />

  <!-- 带数字徽章 -->
  <XsaAvatar
    src="/static/avatar.jpg"
    :badge="99"
    badge-type="count"
  />

  <!-- 无图片（显示首字母） -->
  <XsaAvatar name="苏晚晴" />
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | — | 头像图片地址 |
| `name` | `string` | — | 用户名（无图片时显示首字母） |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 头像尺寸 |
| `shape` | `'circle' \| 'rounded'` | `'circle'` | 头像形状 |
| `badge` | `string \| number` | — | 徽章内容 |
| `badgeType` | `'online' \| 'offline' \| 'count'` | `'count'` | 徽章类型 |
| `clickable` | `boolean` | `false` | 是否可点击 |

#### Events

| 事件 | 说明 |
|------|------|
| `click` | 可点击时，点击头像触发 |

---

### 9. XsaTabs — Tab 切换组件

#### 使用示例

```vue
<template>
  <!-- 默认变体（底部线条） -->
  <XsaTabs
    :tabs="['喜欢', '同城', '发现']"
    v-model="currentTab"
    @change="handleTabChange"
  >
    <view v-if="currentTab === 0">喜欢内容</view>
    <view v-if="currentTab === 1">同城内容</view>
    <view v-if="currentTab === 2">发现内容</view>
  </XsaTabs>

  <!-- 胶囊变体 -->
  <XsaTabs
    :tabs="['推荐', '广场']"
    v-model="mode"
    variant="pill"
  >
    <!-- 内容 -->
  </XsaTabs>
</template>

<script setup>
const currentTab = ref(0);
const mode = ref(0);

const handleTabChange = (index) => {
  console.log('切换到', index);
};
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tabs` | `string[]` | — | Tab 标签数组 |
| `modelValue` | `number` | — | 当前选中的索引（v-model） |
| `variant` | `'default' \| 'pill'` | `'default'` | Tab 变体 |

#### Events

| 事件 | 说明 |
|------|------|
| `update:modelValue` | 选中索引改变时触发 |
| `change` | 切换 Tab 时触发 |

---

### 10. XsaModal — 模态弹窗组件

#### 使用示例

```vue
<template>
  <XsaButton @click="showModal = true">打开弹窗</XsaButton>

  <!-- 基础弹窗 -->
  <XsaModal
    :visible="showModal"
    title="确认操作"
    @close="showModal = false"
    @confirm="handleConfirm"
  >
    <text>确定要执行此操作吗？</text>
  </XsaModal>

  <!-- 带图标弹窗 -->
  <XsaModal
    :visible="showModal"
    title="操作成功"
    :icon="true"
    icon-type="success"
    :show-cancel="false"
    @close="showModal = false"
  >
    <text>您的申请已成功提交</text>
  </XsaModal>

  <!-- 自定义按钮文字 -->
  <XsaModal
    :visible="showModal"
    title="删除确认"
    cancel-text="取消"
    confirm-text="删除"
    @confirm="handleDelete"
  >
    <text>确定要删除这条记录吗？</text>
  </XsaModal>
</template>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示 |
| `title` | `string` | — | 弹窗标题 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 弹窗尺寸 |
| `icon` | `boolean` | `false` | 是否显示图标 |
| `iconType` | `'success' \| 'warning' \| 'error' \| 'info'` | `'info'` | 图标类型 |
| `showActions` | `boolean` | `true` | 是否显示操作按钮 |
| `showCancel` | `boolean` | `true` | 是否显示取消按钮 |
| `cancelText` | `string` | `'取消'` | 取消按钮文字 |
| `confirmText` | `string` | `'确定'` | 确认按钮文字 |
| `confirmLoading` | `boolean` | `false` | 确认按钮加载状态 |
| `closeOnOverlay` | `boolean` | `true` | 点击遮罩是否关闭 |

#### Events

| 事件 | 说明 |
|------|------|
| `close` | 关闭弹窗时触发 |
| `cancel` | 点击取消按钮时触发 |
| `confirm` | 点击确认按钮时触发 |

---

## 组件总览

| 组件 | 说明 | 变体 | 状态 |
|------|------|------|------|
| **XsaButton** | 按钮 | Primary / Secondary / Text / Pill | ✅ |
| **XsaCard** | 卡片 | Standard / Hero / Feature / Grid | ✅ |
| **XsaTag** | 标签/徽章 | Default / Accent / Badge | ✅ |
| **XsaSheet** | 底部面板 | 标准 / 高面板 | ✅ |
| **XsaToast** | 提示消息 | 自动消失 | ✅ |
| **XsaInput** | 输入框 | Text / Number / Password / Tel | ✅ |
| **XsaAvatar** | 头像 | Circle / Rounded + 徽章 | ✅ |
| **XsaTabs** | Tab 切换 | Default / Pill | ✅ |
| **XsaModal** | 模态弹窗 | Small / Medium / Large | ✅ |

---

**文档维护者：** 宣誓爱前端团队  
**最后更新：** 2026-07-20 23:12  
**组件总数：** 10 个
