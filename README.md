# AI Job Search Copilot · AI 求职全流程助手

一个把简历准备、岗位匹配、职位搜索、定向优化、模拟面试和申请跟踪串起来的 AI 求职工作台。

项目同时提供两种形态：

- Web 应用：适合可视化地完成完整求职流程
- Skill 套件：适合在 Claude Code / Codex 里用命令式方式调用

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Site](https://img.shields.io/badge/site-netlify-00C7B7.svg)](https://interview-coach-skill.netlify.app)

在线体验：[interview-coach-skill.netlify.app](https://interview-coach-skill.netlify.app)

## 项目亮点

- 一站式流程：从准备简历到面试演练和投递记录，尽量在一个工具里完成
- 双使用方式：既能在浏览器里操作，也能作为 AI skill 在终端中复用
- 零后端部署：Web 版是纯静态站点，部署简单，适合个人快速使用
- 隐私优先：API Key 和会话数据保存在浏览器本地，不依赖项目自带后端
- 中文优先：交互、简历生成、公司定向优化和面试反馈都围绕中文求职场景设计

## Web 应用能做什么

Web 端围绕一条完整用户路径组织：

`API 管理 → 简历内容收集 → 简历生成 → 岗位匹配 → 职位搜索 → 简历优化 → 模拟面试 → 申请跟踪`

核心能力包括：

- API 管理：内置 DeepSeek、豆包、千问三类 OpenAI 兼容接口配置
- 创建或导入简历：支持从零填写，也支持粘贴现有简历直接继续后续流程
- 多格式材料解析：可读取 `txt`、`md`、`pdf`、`docx`、`rtf`、`html`
- AI 简历生成：基于结构化信息生成中文 Markdown 简历
- 模板切换：内置参考简历版、现代专业版、紧凑高密版 3 套模板
- 多格式导出：支持导出 PDF、DOC、Markdown
- 岗位匹配：根据简历背景生成更适合的求职方向建议
- 职位搜索：按平台组合模拟搜索 BOSS 直聘、智联、拉勾、猎聘、前程无忧
- 定向优化：可针对目标公司和岗位优化简历
- 模拟面试：支持面试准备、题目来源选择、逐题评分与总结反馈
- 申请跟踪：记录公司、岗位、平台、状态、链接和备注

## 3 个 Skill 的定位

仓库里同时维护了 3 个可安装 skill，分别位于 `.claude/skills/` 和 `.agents/skills/` 下，方便在不同 AI 编程环境中复用。

### `interview-coach`

适合单独做模拟面试训练。

- 输入岗位、级别、面试类型、公司等信息
- 围绕技术面、行为面、系统设计等场景持续提问
- 对每题给出结构化评分、优点和改进建议

### `resume-builder`

适合单独做简历创建或简历优化。

- 通过问答收集简历素材
- 生成中文简历内容
- 针对目标公司和岗位做定向优化

### `full-career`

适合把多个环节串起来一次完成。

- 信息收集
- 简历生成
- 岗位匹配
- 职位搜索
- 简历优化
- 模拟面试

如果你更偏好图形界面，优先用 Web 应用；如果你更习惯在 AI coding assistant 里直接对话，优先用 skill。

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/wksudud/interview-coach-skill.git
cd interview-coach-skill
```

### 2. 启动 Web 应用

这是一个纯静态项目，直接起一个本地文件服务器即可：

```bash
npx http-server web-app -c-1 -p 8788
```

然后访问 [http://localhost:8788](http://localhost:8788)。

也可以直接打开 `web-app/index.html`，但上传和解析等能力在 `file://` 场景下可能受限，仍建议走本地 HTTP 服务。

### 3. 配置 AI 服务

首次进入后，在页面的 API 管理区域填写你自己的 API Key。当前预置了：

- DeepSeek
- 豆包（火山引擎）
- 千问（阿里云）

项目本身不提供后端代管 Key，调用全部通过你填写的兼容接口完成。

## Skill 安装

如果你想把它作为 skill 使用，可以按对应环境安装：

```bash
claude skills install .claude/skills/interview-coach
claude skills install .claude/skills/resume-builder
claude skills install .claude/skills/full-career
```

仓库中也保留了 `.agents/skills/` 版本，方便在支持该目录约定的其他 agent 环境中直接使用。

## 技术实现

项目当前的 Web 端实现特点：

- 前端形态：单页静态应用，核心代码位于 `web-app/`
- 技术栈：Vanilla JS + HTML + 内嵌 CSS，无构建步骤
- LLM 接口：OpenAI 兼容 `/chat/completions` 风格 API
- 文档解析：`pdf.js` 解析 PDF，`mammoth.js` 解析 DOCX
- PDF 导出：基于 `jsPDF`，并针对中文字体做了兼容处理
- 数据存储：浏览器 `localStorage` 持久化会话与配置
- 部署方式：Netlify 静态托管，`netlify.toml` 发布目录为 `web-app`

## 隐私与数据说明

- API Key 只保存在当前浏览器本地
- 简历内容、面试记录、申请跟踪等数据默认只保存在本地会话中
- 由于会调用你配置的第三方模型接口，请在使用前确认所选模型服务商的数据策略

如果你打算把它用于真实求职材料，建议避免上传不必要的敏感附件，并优先使用你信任的模型服务。

## 项目结构

```text
.
├── README.md
├── SKILL.md
├── prompt-standalone.md
├── netlify.toml
├── .claude/skills/
├── .agents/skills/
└── web-app/
    ├── index.html
    ├── assets/
    └── templates/
```

## 适合谁使用

- 想快速准备中文技术岗简历的同学
- 想围绕特定公司风格做简历和面试训练的求职者
- 想把求职流程做成一个可复用 AI 工具链的开发者
- 想研究“纯前端 + AI 接口”产品形态的独立开发者

## 开发与检查

如果你要继续修改前端脚本，至少可以先做语法检查：

```bash
node --check web-app/assets/state.js
node --check web-app/assets/api.js
node --check web-app/assets/view.js
node --check web-app/assets/actions.js
```

## License

本项目基于 MIT License 开源。

如果这个项目对你有帮助，欢迎给仓库点一个 Star：

[wksudud/interview-coach-skill](https://github.com/wksudud/interview-coach-skill)
