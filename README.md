# 模拟面试官 Interview Coach

一个强大的模拟面试官 AI Skill，支持 **Claude Code** 和 **OpenAI Codex CLI** 等主流 AI 编程助手。

## 功能特点

- 🎯 **多岗位支持**：前端、后端、全栈、数据科学、产品经理、DevOps 等
- 📊 **多面试类型**：技术面（八股/算法/框架）、行为面（STAR）、系统设计、综合
- 📄 **简历解析**：上传简历，根据真实项目经历针对性提问
- 🏢 **目标公司定制**：针对字节跳动、阿里、Google 等不同公司风格出题
- 📂 **题目分类追踪**：自动记录覆盖领域，避免重复，确保全面
- 📈 **多次面试历史**：跨 session 追踪进步，重点加强薄弱环节
- 🔄 **面试中灵活调整**：随时补充简历、切换公司、换题型
- 🌐 **中英文双语**：支持英文面试模式

## 安装使用

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
