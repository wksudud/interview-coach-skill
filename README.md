# AI Job Search Copilot · AI 求职全流程助手

一站式 AI 求职工作台，覆盖从简历创建到模拟面试的完整求职链路。

提供 **Web 应用**（可视化界面）和 **Claude Code 技能**（命令行 AI 助手）两种形态，共享核心能力。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Netlify Status](https://img.shields.io/badge/deploy-ready-brightgreen)](#)

---

## 项目简介

无论你是正在准备面试的求职者，还是希望系统化管理求职流程的职场人，这个项目都能帮你：

- **10 分钟**生成一份专业中文简历，直接导出 PDF
- 针对**具体公司和岗位**智能优化简历
- 进行**交互式模拟面试**，获得结构化评分和反馈
- 一站式追踪所有投递申请

所有 AI 调用均通过你自备的 API Key（支持 DeepSeek / 豆包 / 千问），数据仅保存在浏览器本地。

---

## 功能一览

### Web 应用

```
API 配置 → 简历内容 → 简历生成 → 岗位匹配 → 职位搜索 → 简历优化 → 模拟面试 → 申请追踪
```

| 步骤 | 功能 | 亮点 |
|------|------|------|
| **API 配置** | 选择 AI 服务商并填写 Key | 三平台预设（DeepSeek/豆包/千问），各步骤可独立指定模型 |
| **简历内容** | 5 个子步骤收集信息 | 基本信息→教育背景→工作经历→项目经历→自我评价。支持文件上传解析（PDF/DOCX）、项目文件夹导入、AI 辅助描述 |
| **简历生成** | AI 生成 + 模板切换 | 3 套内置模板（校园/社招/高密），支持上传自定义模板参考，在线编辑 Markdown，对话式修改，一键导出 PDF/DOC/MD |
| **岗位匹配** | AI 分析并推荐方向 | 基于简历背景智能匹配岗位方向，用户可确认或自定义 |
| **职位搜索** | 多平台模拟搜索 | BOSS直聘/智联招聘/拉勾/猎聘/前程无忧，可单选或多选平台 |
| **简历优化** | 公司+职位定向优化 | 预设公司面试风格（字节/阿里/腾讯/美团/Google/创业公司/自定义），快捷选取上一步的公司，对话修改，重新生成 |
| **模拟面试** | 交互式面试练习 | 面试前准备清单、题目来源选择（牛客/LeetCode/BOSS面经/知乎/自定义）、逐题评分反馈、面试总结 |
| **申请追踪** | 投递记录管理 | 公司/职位/平台/状态/链接/备注，支持增删改查和状态统计 |

### Claude Code 技能

提供 3 个可安装的 Claude Code 技能，在终端中直接使用：

| 技能 | 命令 | 核心能力 |
|------|------|----------|
| `interview-coach` | `/interview-coach [职位] [级别] [类型] [公司]` | 技术面/行为面/系统设计模拟，结构化评分 |
| `resume-builder` | `/resume-builder [创建/优化] [参数...]` | 问答式简历生成，定向简历优化 |
| `full-career` | `/full-career` | 全流程一站式求职助手 |

---

## 快速开始

### 前提条件

- 一个 AI 服务商的 API Key（[DeepSeek](https://platform.deepseek.com/)、[豆包/火山引擎](https://console.volcengine.com/)、[千问/阿里云](https://dashscope.console.aliyun.com/) 任选其一）
- 现代浏览器（Chrome / Edge / Firefox）

### Web 应用

```bash
# 克隆仓库
git clone https://github.com/wksudud/interview-coach-skill.git
cd interview-coach-skill

# 启动本地服务器
npx http-server web-app -c-1 -p 8788
```

打开 `http://localhost:8788`，在 API 管理页面选择服务商并填入 Key，即可开始使用。

> 也可以直接双击打开 `web-app/index.html`，但某些功能（如文件上传）在 `file://` 协议下可能受限。

### Claude Code 技能

```bash
# 在项目根目录下注册技能
claude skills install .claude/skills/interview-coach
claude skills install .claude/skills/resume-builder
claude skills install .claude/skills/full-career
```

安装后即可在 Claude Code 中通过 `/` 命令调用。

---

## 技术架构

```
web-app/
  index.html       ← 页面结构 + 嵌入式 CSS（约 1100 行）
  assets/
    state.js       ← 常量定义、模板配置、全局状态对象
    api.js         ← LLM 调用封装、localStorage 持久化、会话恢复
    view.js        ← 视图渲染、步骤导航、模板卡片、聊天 UI
    actions.js     ← 业务逻辑：文件处理、简历生成、PDF 导出、面试引擎
```

**技术选型**：

| 层面 | 方案 |
|------|------|
| 前端框架 | **无** — 纯 Vanilla JS，零依赖构建 |
| AI 接口 | OpenAI 兼容 API（`/v1/chat/completions`） |
| PDF 生成 | jsPDF 2.5 + 动态加载 CJK 字体（多 CDN 源 + 超时回退） |
| PDF 解析 | pdf.js 3.11 |
| DOCX 解析 | Mammoth.js 1.8 |
| 数据存储 | localStorage（按会话自动保存和恢复） |
| 部署 | 纯静态文件，任意 HTTP 服务器即可 |

**设计原则**：

- **零后端**：所有逻辑在浏览器中运行，无需服务器
- **隐私优先**：API Key 和简历数据仅存储在用户浏览器本地
- **渐进增强**：核心流程不依赖任何 CDN，字体和解析库有降级方案
- **中文优先**：从 UI 到 PDF 输出全程中文支持

---

## 项目结构

```text
.
├── AGENT.md                     ← AI 代理开发指南（给 LLM 看的项目手册）
├── README.md                    ← 本文件
├── SKILL.md                     ← interview-coach 技能定义（根级，兼容旧版）
├── prompt-standalone.md         ← 独立系统提示词（可用于 ChatGPT / 其他平台）
├── netlify.toml                 ← 静态站点部署配置
├── .claude/
│   ├── launch.json              ← 本地开发服务器启动配置
│   ├── settings.local.json      ← 权限许可列表
│   └── skills/                  ← Claude Code 技能
│       ├── interview-coach/SKILL.md
│       ├── resume-builder/SKILL.md
│       └── full-career/SKILL.md
├── .agents/
│   └── skills/                  ← OpenAI Codex 技能（与 .claude/skills 内容相同）
│       ├── interview-coach/SKILL.md
│       ├── resume-builder/SKILL.md
│       └── full-career/SKILL.md
└── web-app/                     ← Web 应用（部署目录）
    ├── index.html               ← 单文件 SPA（HTML + CSS）
    ├── assets/
    │   ├── state.js             ← 常量 · 模板配置 · 全局状态
    │   ├── api.js               ← LLM 调用 · localStorage 持久化
    │   ├── view.js              ← 渲染 · 导航 · 聊天 UI · 追踪表格
    │   └── actions.js           ← 上传解析 · 简历生成 · PDF 导出 · 面试引擎
    └── templates/               ← 自定义简历模板文件存放（预留目录）
```

---

## 技能详情

### 1. interview-coach — 模拟面试官

模拟真实技术面试场景，根据职位、级别和公司定制出题策略。

```
/interview-coach [职位] [级别] [面试类型] [公司]
```

**支持的面试类型**：
- **技术面**（9 类）：算法与数据结构、编程语言基础、框架与中间件、数据库、网络协议、操作系统、前端专精、安全、测试
- **行为面**（6 类）：项目经验、团队协作、冲突处理、失败经历、领导力、职业规划
- **系统设计**（4 类）：总体架构、组件设计、数据方案、权衡分析

**公司定制**：
对预设公司会自动调整出题策略。字节跳动偏重算法和高并发，阿里/蚂蚁偏重分布式和业务场景，腾讯偏重综合能力，Google/微软偏重算法和系统设计。

**面试流程**：
1. 收集基本信息 → 2. 分析简历 → 3. 逐题出题 → 4. 每次回答后给出评分+优点+改进建议+参考回答 → 5. 面试结束时输出综合评估报告

### 2. resume-builder — 简历创建与优化

通过结构化问答收集信息，生成或优化中文简历。支持真实职位检索和针对性优化。

```
/resume-builder [模式]
/resume-builder 创建
/resume-builder 优化
```

**简历内容覆盖**：基本信息 → 求职意向 → 教育背景 → 工作经历（STAR 量化） → 项目经历 → 技能 → 自我评价

**公司优化策略**（内置）：
- 字节跳动：突出算法能力、高并发经验、快速迭代
- 阿里巴巴：突出分布式系统、业务深度、技术选型
- 腾讯：突出产品思维、全栈能力、工程实践
- 美团：突出高并发场景、系统韧性、容灾方案
- Google/微软：突出算法基础、代码质量、系统设计
- 创业公司：突出技术广度、独立能力、ownership

### 3. full-career — 一站式求职助手

串联全流程的求职助手。一次对话完成从信息收集到模拟面试的全部环节。

```
/full-career
```

**五阶段流程**：
1. 信息收集 → 2. 简历生成 → 3. 岗位匹配 → 4. 真实职位搜索 → 5. 简历优化 → 6. 模拟面试

适合求职目标清晰、希望高效完成全部准备工作的用户。

### 技能 vs Web 应用

| 能力 | `interview-coach` | `resume-builder` | `full-career` | Web 应用 |
|------|:---:|:---:|:---:|:---:|
| 简历生成 | — | ✅ | ✅ | ✅ |
| 简历模板 | — | — | — | ✅ 3 + 自定义 |
| 简历优化 | — | ✅ | ✅ | ✅ 公司定制 |
| 岗位匹配 | — | ✅ | ✅ | ✅ |
| 职位搜索 | — | ✅ (WebSearch) | ✅ (WebSearch) | ✅ (AI 模拟) |
| 模拟面试 | ✅ | — | ✅ | ✅ |
| 公司定制 | ✅ | ✅ | ✅ | ✅ |
| PDF 导出 | — | — | — | ✅ |
| DOC/MD 导出 | — | — | — | ✅ |
| 申请追踪 | — | — | — | ✅ |
| 图形界面 | — | — | — | ✅ |
| 纯文本交互 | ✅ | ✅ | ✅ | — |

---

## 开发指南

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交改动 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

### 代码检查

```bash
# JS 语法检查
node --check web-app/assets/state.js
node --check web-app/assets/api.js
node --check web-app/assets/view.js
node --check web-app/assets/actions.js
```

### 常见调试

| 问题 | 排查路径 |
|------|----------|
| 按钮点击无反应 | 检查 `actions.js` 函数是否存在 → 浏览器控制台报错 |
| 页面中文乱码 | 检查 `index.html` 源文件编码（UTF-8） → `view.js` 的 `repairUIStrings()` |
| 模板切换不生效 | 检查 `state.resumeTemplate` → `renderResumeTemplateCards()` |
| PDF 中文不显示 | 检查 `ensureCjkFont()` → CDN 字体加载 → 网络连接 |
| 会话恢复失败 | 检查 `api.js` 的 `loadSessionData()` → localStorage 数据 |

### 架构约定

- **HTML 只负责排版**：`index.html` 中的 `onclick` 等内联事件处理器通过 `actions.js` / `view.js` 绑定
- **状态集中管理**：全局状态统一在 `state.js` 的 `state` 对象中
- **持久化按需声明**：新增状态字段需在 `api.js` 的 `saveSessionData()` / `loadSessionData()` 中注册
- **步骤 ID 统一管理**：步骤顺序由 `TOP_LEVEL_STEP_IDS` 数组控制

---

## 许可

本项目基于 MIT 协议开源。使用或二次开发时请保留原作者仓库链接。

如果本项目对你有帮助，欢迎 ⭐ Star！

GitHub: [wksudud/interview-coach-skill](https://github.com/wksudud/interview-coach-skill)
