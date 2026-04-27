# AI 面试与简历助手 Skills

包含两个强大的 AI Skill，支持 **Claude Code** 和 **OpenAI Codex CLI** 等主流 AI 编程助手。

## Skills 总览

| Skill | 命令 | 功能 |
|---|---|---|
| **模拟面试官** | `/interview-coach` | 模拟面试练习，支持多岗位、多类型、简历关联提问 |
| **简历创建与优化** | `/resume-builder` | 通过问答收集信息生成简历，或优化现有简历 |

---

## 一、模拟面试官 Interview Coach

### 功能特点

- 🎯 **多岗位支持**：前端、后端、全栈、数据科学、产品经理、DevOps 等
- 📊 **多面试类型**：技术面（八股/算法/框架）、行为面（STAR）、系统设计、综合
- 📄 **简历解析**：上传简历，根据真实项目经历针对性提问
- 🏢 **目标公司定制**：针对字节跳动、阿里、Google 等不同公司风格出题
- 📂 **题目分类追踪**：自动记录覆盖领域，避免重复，确保全面
- 📈 **多次面试历史**：跨 session 追踪进步，重点加强薄弱环节
- 🔄 **面试中灵活调整**：随时补充简历、切换公司、换题型
- 🌐 **中英文双语**：支持英文面试模式

### 安装使用

### Claude Code

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

### OpenAI Codex CLI

```bash
# 复制到 Codex 的 skills 目录
cp SKILL.md .agents/skills/interview-coach/SKILL.md
```

在 Codex 中使用 `$interview-coach` 调用。

### 通用 AI 助手（ChatGPT、Gemini 等）

将 `prompt-standalone.md` 的全部内容复制到 system prompt / 自定义指令中即可使用。

## 使用示例

```
/interview-coach 后端开发 高级 系统设计 字节跳动
```

Skill 会：
1. 询问是否有简历（提供文件路径或粘贴内容）
2. 分析简历中的技术栈和项目经验
3. 结合字节跳动常见的面试风格（算法+项目深度）出题
4. 一问一答，每题给出结构化反馈
5. 结束时生成完整总结，包含题目覆盖分析和简历建议

---

## 二、简历创建与优化 Resume Builder

### 功能特点

- 📝 **创建新简历**：通过引导式问答，逐步收集信息生成专业简历
- 🔍 **优化现有简历**：粘贴简历内容，获取诊断报告和逐项优化建议
- 📊 **STAR 法则**：引导用户用量化数据和 STAR 法则描述经历
- 🎯 **岗位匹配**：针对目标岗位优化关键词和内容侧重
- 🤖 **ATS 优化**：确保简历格式利于机器筛选
- 📄 **Markdown 输出**：生成可直接使用的结构化简历

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

1. **创建新简历模式**：按模块收集基本信息 → 教育背景 → 工作经历 → 项目经历 → 实习经历 → 获奖 → 技能
2. **优化现有简历模式**：粘贴简历 → 诊断分析 → 逐项优化 → 生成最终版
3. 每个模块逐项问答，引导用户用量化数据和 STAR 法则
4. 最终输出完整的 Markdown 格式简历
