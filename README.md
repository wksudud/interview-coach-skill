# AI 求职全流程助手

一站式求职解决方案，包含三个 AI Skill，支持 **Claude Code** 和 **OpenAI Codex CLI** 等主流 AI 编程助手，以及**独立网页版**。

## Skills 总览

| Skill | 命令 | 功能 |
|---|---|---|
| **🔥 一站式求职助手（推荐）** | `/full-career` | **完整求职全流程**：简历生成 → 岗位匹配 → 真实职位搜索 → 定向优化简历 → 模拟面试 |
| **模拟面试官** | `/interview-coach` | 独立的模拟面试练习 |
| **简历创建与优化** | `/resume-builder` | 独立的简历创建与优化 |

---

## 🔥 一、一站式求职助手 Full Career（推荐）

整合简历、求职、面试的全流程闭环。**一个命令走完所有环节。**

### 完整流程

```
/full-career 后端开发 3年
  ↓
阶段一：信息收集 → 生成基础简历
  ├─ 基本资料收集（每次 1-2 个问题）
  ├─ 补充材料上传（成绩单/证书/作品集，支持文件路径读取）
  ├─ 本地项目导入（扫描代码目录，AI 分析贡献点，勾选写入简历）
  └─ 生成结构化简历
  ↓
阶段二：职业匹配推荐（分析画像，推荐最适合的岗位）
  ↓
阶段三：真实招聘搜索（从 BOSS直聘、智联等搜索真实职位）
  ↓
阶段四：定向优化简历（基于真实 JD 逐项优化）
  ↓
阶段五：模拟面试（针对目标公司和岗位进行面试，可指定题库来源）
```

### 使用方法

```bash
# 克隆仓库
git clone https://github.com/wksudud/interview-coach-skill.git

# 复制到 Claude Code 的 skills 目录
cp -r interview-coach-skill/.claude/skills/full-career .claude/skills/
```

重启后输入：

```
/full-career
# 或带参数
/full-career 后端开发 3年
/full-career 前端开发 应届生
```

### 新特性

- ✅ **补充材料上传**：支持成绩单、证书、作品集等文件上传，AI 读取后丰富简历内容
- ✅ **本地项目导入**：引导用户提供本地项目路径，自动扫描分析代码，提炼贡献点供用户选择写入简历
- ✅ **题库来源选择**：面试阶段可指定牛客网、力扣、BOSS直聘面经等来源出题

---

## 二、模拟面试官 Interview Coach

### 功能特点

- 🎯 **多岗位支持**：前端、后端、全栈、数据科学、产品经理、DevOps 等
- 📊 **多面试类型**：技术面（八股/算法/框架）、行为面（STAR）、系统设计、综合
- 📄 **简历解析**：上传简历，根据真实项目经历针对性提问
- 🏢 **目标公司定制**：针对字节跳动、阿里、Google 等不同公司风格出题
- 📂 **题目分类追踪**：自动记录覆盖领域，避免重复，确保全面
- 📈 **多次面试历史**：跨 session 追踪进步，重点加强薄弱环节
- 🔄 **面试中灵活调整**：随时补充简历、切换公司、换题型
- 🌐 **中英文双语**：支持英文面试模式
- 📎 **补充材料支持**：可上传成绩单、证书、项目文档，丰富面试背景
- 🎯 **指定题库来源**：可从牛客网、力扣、BOSS直聘面经、知乎等来源获取真实面试题

### 安装使用

#### Claude Code

```bash
# 克隆仓库
git clone https://github.com/wksudud/interview-coach-skill.git

# 复制到 Claude Code 的 skills 目录
cp -r interview-coach-skill/.claude/skills/interview-coach .claude/skills/
# 或者直接将 SKILL.md 放到 .claude/skills/interview-coach/
```

重启 Claude Code 后，输入：

```
/interview-coach
```

带参数启动：

```
/interview-coach 前端开发 高级 技术面 字节跳动
/interview-coach 后端开发 中级 综合
/interview-coach 数据科学 初级 行为面
```

#### OpenAI Codex CLI

```bash
# 复制到 Codex 的 skills 目录
cp SKILL.md .agents/skills/interview-coach/SKILL.md
```

在 Codex 中使用 `$interview-coach` 调用。

#### 通用 AI 助手（ChatGPT、Gemini 等）

将 `prompt-standalone.md` 的全部内容复制到 system prompt / 自定义指令中即可使用。

### 使用示例

```
/interview-coach 后端开发 高级 系统设计 字节跳动
```

Skill 会：
1. 询问是否有简历（提供文件路径或粘贴内容）或补充材料
2. 分析简历中的技术栈和项目经验
3. 结合字节跳动常见的面试风格（算法+项目深度）出题
4. 支持指定题库来源（如牛客网面经风格）
5. 一问一答，每题给出结构化反馈
6. 结束时生成完整总结，包含题目覆盖分析和简历建议

---

## 三、简历创建与优化 Resume Builder

### 功能特点

- 📝 **创建新简历**：通过引导式问答，逐步收集信息生成专业简历
- 🔍 **优化现有简历**：粘贴简历内容，获取诊断报告和逐项优化建议
- 📊 **STAR 法则**：引导用户用量化数据和 STAR 法则描述经历
- 🎯 **岗位匹配**：推荐最适合的岗位方向，支持多维度分析
- 🤖 **ATS 优化**：确保简历格式利于机器筛选
- 📄 **Markdown 输出**：生成可直接使用的结构化简历
- 📎 **补充材料上传**：支持成绩单、证书、作品集文件读取，丰富简历内容
- 📂 **本地项目导入**：自动扫描项目代码，AI 分析技术贡献，供用户选择写入简历

### 使用方法

```bash
# 克隆仓库（如果已克隆可跳过）
git clone https://github.com/wksudud/interview-coach-skill.git

# 复制到 Claude Code 的 skills 目录
cp -r interview-coach-skill/.claude/skills/resume-builder .claude/skills/
```

重启 Claude Code 后，输入：

```
/resume-builder
```

带参数启动：

```
/resume-builder 后端开发 3年
/resume-builder 前端开发 应届生
```

### 使用流程

1. **创建新简历模式**：基本信息 → 教育背景 → 补充材料（可选）→ 工作经历 → 项目经历（支持本地代码导入）→ 实习经历 → 获奖 → 技能 → 其他
2. **优化现有简历模式**：粘贴简历 → 诊断分析 → 逐项优化 → 生成最终版
3. 每个模块逐项问答，引导用户用量化数据和 STAR 法则
4. 生成基础简历后进入**职业匹配推荐**环节
5. 支持**搜索真实招聘信息**并基于真实 JD 定向优化
6. 最终输出完整的 Markdown 格式简历

---

## 💻 网页版 Web App

除了 Claude Code 命令行版本，还提供了一个**独立的网页版**，可直接在浏览器中运行完整的求职全流程。

### 使用方式

```bash
# 使用 http-server 启动（推荐）
npx http-server interview-coach-skill/web-app -c-1

# 或直接用浏览器打开
open interview-coach-skill/web-app/index.html
# 或
start interview-coach-skill/web-app/index.html
```

### 功能特点

- 🎨 美观的步骤式向导界面（共 9 步，覆盖求职全流程）
- 📝 表单化信息收集（无需命令行交互）
- 🤖 **多 API 服务商支持**：支持 Anthropic Claude、OpenAI 兼容（DeepSeek、豆包、GPT 等）
- 🔀 **角色路由**：不同任务可分配不同模型（如 DeepSeek 生成简历、豆包搜索职位、GPT 面试）
- 📎 **补充材料上传**：拖拽或点击上传 PDF/TXT/MD/DOCX 文件
- 📂 **本地项目导入**：选择项目文件夹，自动扫描代码 → AI 分析 → 勾选贡献点写入简历
- 🎯 **题库来源选择**：可指定牛客网、力扣、BOSS直聘面经、知乎等面试题来源
- 📄 在线简历生成与优化
- 🔍 真实职位搜索展示（BOSS直聘、智联等）
- 🎤 内置模拟面试聊天界面，带评分和参考回答
- 💾 配置持久化（API key 仅保存在浏览器内存）

### 注意事项

- 首次使用需在页面顶部配置 AI 服务商（支持 Anthropic 和 OpenAI 兼容格式）
- 可为不同任务角色分配不同的 AI 模型
- 密钥仅存储在浏览器内存中，不持久化到磁盘
- 推荐使用 Chrome/Edge 浏览器以获得完整功能体验（文件夹选择功能需要 Chromium 内核）
