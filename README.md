# AI Job Search Copilot · AI 求职全流程助手

一站式 AI 求职工具集：从简历创建、岗位匹配、职位搜索、简历优化到模拟面试，覆盖求职全流程。

提供两种使用方式：**Claude Code 技能** 和 **Web 应用**。

## 目录

- [Web 应用（网页版）](#web-应用网页版)
- [Claude Code 技能](#claude-code-技能)
- [本地运行](#本地运行)
- [部署到 Netlify](#部署到-netlify)
- [项目结构](#项目结构)
- [开源协议](#开源协议)

---

## Web 应用（网页版）

纯前端 SPA，无需后端服务器，直接在浏览器中运行。

### 功能流程

| 步骤 | 说明 |
|------|------|
| API 配置 | 选择 AI 服务商（DeepSeek / 豆包 / 千问），填写 API Key |
| 简历内容 | 5 个子步骤：基本信息 → 教育背景 → 工作经历 → 项目经历 → 自我评价 |
| 简历生成 | 选择模板 → AI 生成 → 在线编辑/对话修改 → 导出 PDF/DOC/MD |
| 岗位匹配 | AI 分析简历背景，推荐适合的岗位方向 |
| 职位搜索 | 多平台模拟搜索（BOSS直聘/智联/拉勾/猎聘/前程无忧） |
| 简历优化 | 针对目标公司和职位定向优化，支持对话修改和重新生成 |
| 模拟面试 | 面试准备清单 → 交互式面试 → 评分反馈（支持公司定制） |
| 申请追踪 | 投递记录管理、状态跟踪 |

### 快速开始

```bash
# 方式一：直接打开
start web-app/index.html

# 方式二：本地服务器（推荐）
npx http-server web-app -c-1 -p 8788
```

打开浏览器访问 `http://localhost:8788`，配置 API Key 即可使用。

### 技术栈

- 纯 HTML/CSS/JS，无框架，无构建步骤
- AI 调用：OpenAI 兼容 API（DeepSeek / 豆包 / 千问）
- PDF 导出：jsPDF + CJK 字体 CDN 加载
- 文档解析：pdf.js + Mammoth.js
- 数据持久化：localStorage

---

## Claude Code 技能

本项目包含 **3 个 Claude Code 技能**，可在 Claude Code CLI 中直接调用。

### 安装

技能文件位于 `.claude/skills/` 目录。在 Claude Code 中安装：

```bash
# 注册技能（在项目根目录执行）
claude skills install .claude/skills/interview-coach
claude skills install .claude/skills/resume-builder
claude skills install .claude/skills/full-career
```

### 1. 模拟面试官 (`interview-coach`)

```
/interview-coach [职位] [级别] [面试类型] [公司]
```

**功能**：模拟面试官进行一对一面试练习，涵盖技术面、行为面、系统设计面。给出结构化反馈和评分。

**参数**：
- 职位：前端/后端/全栈/数据/产品等
- 级别：初级/中级/高级/资深/架构师
- 面试类型：技术面/行为面/系统设计/综合
- 公司：字节跳动/阿里/腾讯/Google 等（可选，会针对性出题）

**示例**：
```
/interview-coach 后端开发 高级 技术面 字节跳动
```

### 2. 简历创建与优化 (`resume-builder`)

```
/resume-builder [模式]
```

**功能**：通过问答收集信息生成简历，或对现有简历进行定向优化。支持从招聘网站搜索真实职位并针对具体岗位优化。

**模式**：
- `创建` — 从零开始收集信息并生成简历
- `优化` — 粘贴现有简历，根据目标岗位优化

**示例**：
```
/resume-builder 创建
/resume-builder 优化 字节跳动 后端开发
```

### 3. 一站式求职助手 (`full-career`)

```
/full-career
```

**功能**：信息收集 → 简历生成 → 岗位匹配 → 真实职位搜索 → 简历优化 → 模拟面试，覆盖求职全流程。

### 技能 vs 网页版对比

| 特性 | Claude Code 技能 | Web 应用 |
|------|:---:|:---:|
| 简历生成 | ✅ | ✅ |
| 简历优化 | ✅ | ✅ |
| 岗位匹配 | ✅ | ✅ |
| 职位搜索 | ✅ (WebSearch) | ✅ (AI 模拟) |
| 模拟面试 | ✅ | ✅ |
| PDF 导出 | ❌ | ✅ |
| 简历模板选择 | ❌ | ✅ |
| 申请追踪 | ❌ | ✅ |
| 图形界面 | ❌ | ✅ |
| 无需浏览器 | ✅ | ❌ |

---

## 本地运行

```bash
# 克隆仓库
git clone https://github.com/wksudud/interview-coach-skill.git
cd interview-coach-skill

# 启动 Web 应用
npx http-server web-app -c-1 -p 8788

# 注册 Claude Code 技能
claude skills install .claude/skills/interview-coach
claude skills install .claude/skills/resume-builder
claude skills install .claude/skills/full-career
```

---

## 部署到 Netlify

本项目已配置 `netlify.toml`，支持一键部署。

### 自动部署（推荐）

1. Fork 本仓库到你的 GitHub 账号
2. 登录 [Netlify](https://app.netlify.com)
3. 点击 "Add new site" → "Import an existing project" → 选择 GitHub
4. 选择仓库 `interview-coach-skill`
5. Netlify 自动检测 `netlify.toml`，无需手动配置
6. 点击 "Deploy site"

每次推送代码到 GitHub，Netlify 会自动重新部署。

### 手动配置

如果自动检测失败，手动设置：
- **Build command**：（留空）
- **Publish directory**：`web-app`

### 同步网站

部署完成后，Netlify 会分配一个 URL（如 `xxxx.netlify.app`）。你可以在 Netlify 设置中：
- 绑定自定义域名
- 配置自动部署分支
- 查看部署日志

当前部署的分支推送到 GitHub 后，Netlify 将自动同步更新网站内容。

---

## 项目结构

```text
.
├── AGENT.md                  ← AI 代理开发指南
├── README.md                 ← 本文件
├── SKILL.md                  ← interview-coach 技能定义
├── prompt-standalone.md      ← 独立 prompt（可用于其他 AI 平台）
├── netlify.toml              ← Netlify 部署配置
├── .claude/
│   ├── launch.json           ← 本地开发服务器配置
│   └── skills/               ← Claude Code 技能定义
│       ├── interview-coach/SKILL.md
│       ├── resume-builder/SKILL.md
│       └── full-career/SKILL.md
├── .agents/
│   └── skills/               ← OpenAI Codex 技能定义（同上）
└── web-app/                  ← Web 应用
    ├── index.html            ← 页面结构与 CSS
    ├── assets/
    │   ├── state.js          ← 常量、模板、全局状态
    │   ├── api.js            ← API 调用、持久化
    │   ├── view.js           ← 渲染、导航、UI
    │   └── actions.js        ← 业务逻辑
    └── templates/            ← 简历模板文件（预留）
```

## 开源协议

本项目开源。使用或二次开发时请保留仓库链接。

- GitHub: [wksudud/interview-coach-skill](https://github.com/wksudud/interview-coach-skill)
