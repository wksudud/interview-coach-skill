# AGENT.md — AI求职全流程助手 项目指南

## 项目概述

纯前端 SPA（HTML/CSS/JS，无框架、无构建），面向中文求职者的全流程 AI 助手：
简历创建 → 简历生成 → 岗位匹配 → 职位搜索 → 简历优化 → 模拟面试 → 申请追踪。

- **入口**: [web-app/index.html](web-app/index.html)
- **部署**: Netlify 静态站点 (`web-app/` 目录)
- **本地运行**: `npx http-server web-app -c-1 -p 8788`
- **AI 依赖**: 用户自备 API Key（DeepSeek / 豆包 / 千问，OpenAI 兼容接口）

## 文件架构

```
web-app/
  index.html           ← 页面结构 + CSS（无内联 JS 事件处理器）
  assets/
    state.js           ← 常量、模板配置、全局 state 对象
    init.js            ← 事件绑定（所有 DOM 事件统一在此注册）
    api.js             ← API 调用、localStorage 持久化、会话恢复
    view.js            ← 渲染：导航、模板卡片、聊天 UI、追踪表格
    actions.js         ← 业务逻辑：上传、解析、生成、导出、步骤流转
```

## 加载顺序

`state.js` → `init.js` → `api.js` → `view.js` → `actions.js`

`init.js` 在 `DOMContentLoaded` 时通过 `actions.js` 中的 `initEventBindings()` 调用。

## 关键设计原则

1. **HTML 只含排版**：`index.html` 不应包含任何 `onclick`/`onchange`/`on*` 内联事件处理器
2. **事件统一绑定**：所有事件通过 `init.js` 中的 `bindId()` / `delegate()` / `bindButtonsByText()` 注册
3. **数据持久化**：所有状态通过 `api.js` 的 `saveSessionData()` / `loadSessionData()` 持久化到 localStorage
4. **文本修复**：优先修复源文件中的乱码，不要依赖 `view.js` 的 `repairUIStrings()` 补丁

## 步骤流程

| 步骤 | 对应步骤ID | DOM ID | 说明 |
|------|-----------|--------|------|
| 1 | 简历内容 | `step1` | 5个子步骤：基本信息→教育背景→工作经历→项目经历→自我评价 |
| 2 | 简历生成 | `step5` | 两阶段：contentPhase（选模板+生成+编辑）→ templatePhase（确认+导出） |
| 3 | 岗位匹配 | `step6` | AI 推荐岗位方向 |
| 4 | 职位搜索 | `step7` | 多平台模拟搜索 |
| 5 | 简历优化 | `step8` | 公司+职位定向优化，支持对话修改、重新生成 |
| 6 | 模拟面试 | `step9` | 面试准备清单 + 交互式面试 |

步骤 ID 定义在 `state.js` 的 `TOP_LEVEL_STEP_IDS` 中：
`['step1', 'step5', 'step6', 'step7', 'step8', 'step9']`

## 事件绑定机制

`init.js` 提供三种绑定方式：

### 1. bindId(id, event, fn) — 按 ID 绑定
```js
bindId('btnStartOptimize', 'click', startOptimize);
```
需要元素有 `id` 属性。

### 2. delegate(parent, event, selector, fn) — 事件委托
```js
delegate(document.getElementById('step8'), 'click', '[data-action="regenerate-optimize"]', function() {
  regenerateOptimizeResume();
});
```
元素需要 `data-action` 属性。

### 3. bindButtonsByText() — 按钮文字匹配
自动匹配按钮文字并路由到对应函数。当按钮既无 ID 也无 data-action 时使用。映射表在 `init.js` 的 `textMap` 中定义。

## 新增功能检查清单

1. 新 HTML 元素需要 ID 或 `data-action` 属性
2. 新事件在 `init.js` 中注册（使用 `bindId` 或 `delegate`）
3. 新状态字段在 `state.js` 中声明
4. 需要持久化的字段在 `api.js` 的 save/load 中注册
5. 业务逻辑在 `actions.js` 中实现
6. UI 渲染逻辑在 `view.js` 中实现

## Step5 笔记（高风险区域）

- `contentPhase` — 模板选择、首次生成、重新生成、Markdown 编辑、预览切换、AI 对话修改
- `templatePhase` — 最终模板确认和导出（PDF/DOC/MD）
- PDF 导出必须使用 `downloadResumePDF()`，禁止浏览器打印回退
- PDF 布局配置在 `RESUME_TEMPLATES[].pdf` 中
- CJK 字体从 CDN 加载（多源 + 超时 + 缓存）

## Step8 笔记（简历优化）

- 公司选择：预设下拉 + 快捷选取（从上一步搜索结果提取）+ 自定义输入
- 自定义公司显示警告："效果可能不如预设选项"
- 优化结果可编辑（Markdown textarea）+ 可预览 + 可对话修改 + 可重新生成
- 公司提示词影响优化方向（`getOptimizeCompanyHint()`）
- 导航到 step8 时自动调用 `initOptimizeStep()` 初始化

## 调试笔记

- **按钮无反应**：检查 `init.js` 绑定 → `actions.js` 函数 → 浏览器控制台错误
- **文本乱码**：检查 `index.html` 源文件（UTF-8 编码）
- **模板不匹配**：检查 `state.resumeTemplate`、`state.customTemplate`、`renderResumeTemplateCards()`
- **PDF 问题**：检查 `downloadResumePDF()`、`ensureCjkFont()`、布局配置
- **会话恢复问题**：检查 `api.js` 的 localStorage 读写

## JS 语法检查

```bash
node --check web-app/assets/state.js
node --check web-app/assets/init.js
node --check web-app/assets/api.js
node --check web-app/assets/view.js
node --check web-app/assets/actions.js
```
