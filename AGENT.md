# AGENT.md

本文件用于帮助下次接手这个仓库的人快速建立上下文，优先覆盖 `web-app` 的真实结构、关键状态、当前生效逻辑和常见修改入口。

## Agent Quickstart

1. 这是一个纯前端单页求职助手，主入口是 [web-app/index.html](/E:/Documents/interview-coach-skill/web-app/index.html)。
2. 真实核心文件只有 4 个：`state.js`、`view.js`、`actions.js`、`api.js`。
3. `state.js` 管常量和全局状态，不做 DOM 操作。
4. `view.js` 管页面渲染、步骤切换、模板卡片、运行时文案修复。
5. `actions.js` 管业务动作：上传、生成、重生成、预览、导出。
6. `api.js` 管 Provider 配置、模型调用、本地持久化。
7. 顶层步骤顺序由 `TOP_LEVEL_STEP_IDS` 控制。
8. 简历内容子步骤由 `RESUME_SUBSTEP_IDS` 控制。
9. `step5` 是最高风险区，最近改动最多。
10. `step5` 内部分两阶段：`contentPhase` 和 `templatePhase`。
11. 首次生成看 `generateResume()`。
12. 切模板后重新生成看 `regenerateResume()`。
13. 导出入口统一走 `exportResume(kind)`。
14. PDF 主路径应走 `downloadResumePDF()`，不要回退到浏览器打印。
15. PDF 排版参数来自 `RESUME_TEMPLATES[*].pdf`。
16. 模板唯一来源应是 `RESUME_TEMPLATES`。
17. 当前模板状态看 `state.resumeTemplate`。
18. 是否已生成过看 `state.resumeGeneratedOnce`。
19. 单页压缩级别看 `state.resumeLayoutCompressionIndex`。
20. 页面乱码优先查 `view.js` 里的 `repairUIStrings()`。
21. 页面能打开但文案乱，先看 `repairUIStrings()` 和动态渲染函数。
22. 按钮没反应，先看 `actions.js`，再看 `api.js`。
23. PDF 不好看或分页异常，先看 `renderResumePdf()` 和模板 `pdf` 配置。
24. 改 UI 文案优先动 `view.js`，不要先大改 `index.html`。
25. 改模板优先动 `state.js`。
26. 改流程优先动 `actions.js`。
27. 验证至少跑：`node --check web-app\\assets\\view.js`
28. 再跑：`node --check web-app\\assets\\state.js`
29. 再跑：`node --check web-app\\assets\\actions.js`
30. 如果时间不够，先保住 `step5`、`repairUIStrings()`、`RESUME_TEMPLATES`。

## 1. 仓库概览

根目录主要内容：

- [web-app/index.html](/E:/Documents/interview-coach-skill/web-app/index.html)
  单页应用的唯一 HTML 入口，包含页面骨架、样式、所有步骤区块、脚本引入。
- [web-app/assets/state.js](/E:/Documents/interview-coach-skill/web-app/assets/state.js)
  全局常量与纯状态层。
- [web-app/assets/view.js](/E:/Documents/interview-coach-skill/web-app/assets/view.js)
  纯视图渲染、导航切换、模板卡片、步骤 UI、运行时文案修复。
- [web-app/assets/actions.js](/E:/Documents/interview-coach-skill/web-app/assets/actions.js)
  核心业务动作层，负责上传、解析、生成、导出、模板流程、PDF 输出。
- [web-app/assets/api.js](/E:/Documents/interview-coach-skill/web-app/assets/api.js)
  与模型 API 通信、Provider 配置持久化、会话持久化。
- [web-app/templates/.gitkeep](/E:/Documents/interview-coach-skill/web-app/templates/.gitkeep)
  目前只是占位目录，没有真实模板文件。

## 2. 当前页面结构

应用是纯前端静态页面，没有后端服务。

顶层流程：

1. `setupSection`
   API 管理
2. `entrySection`
   简历入口选择
3. `step1`
   简历内容采集
4. `step5`
   简历生成与模板导出
5. `step6`
   岗位匹配
6. `step7`
   职位搜索
7. `step8`
   简历优化
8. `step9`
   模拟面试
9. `trackerSection`
   求职追踪

注意：

- 顶层步骤顺序由 `TOP_LEVEL_STEP_IDS` 控制。
- 简历内容采集的子步骤由 `RESUME_SUBSTEP_IDS` 控制。
- 代码里步骤编号不是连续的：`step1 -> step5 -> step6...`，这是历史遗留，不要随便重命名，先查依赖。

## 3. 代码职责分层

### state.js

这里是“数据定义层”，不要放 DOM 操作。

主要内容：

- `TOP_LEVEL_STEP_IDS`
- `RESUME_SUBSTEP_IDS`
- `RESUME_TEMPLATES`
- `JOB_PLATFORMS`
- 全局 `state`

当前重要状态：

- `state.resumeTemplate`
  当前选中的简历模板
- `state.resumeGeneratedOnce`
  是否已经生成过一次简历
- `state.resumeLayoutCompressionIndex`
  PDF 单页压缩级别
- `state.templateConfirmed`
  是否已进入导出阶段
- `state.customTemplate`
  用户上传模板的原始文本
- `state.stepModelMap`
  每个业务步骤对应的 Provider

### view.js

这里是“页面表现层”，负责：

- 步骤切换
- 子步骤切换
- API 管理卡片渲染
- 模板卡片渲染
- 平台列表渲染
- 文件树渲染
- 运行时文案修复 `repairUIStrings()`

如果页面“能打开但文案乱码”，优先检查这里。

### actions.js

这里是“业务动作层”，负责：

- 文件上传与解析
- 简历内容收集
- 模板切换
- 开始生成 / 重新生成
- 简历预览
- PDF / DOC / MD 导出
- 求职流程各步骤动作

如果“按钮点了没反应”或“业务逻辑不对”，优先看这里。

### api.js

这里是“模型通信与本地存储层”，负责：

- Provider 配置读写
- 当前会话持久化
- 调用大模型
- 恢复用户状态

如果“刷新后丢状态”或“API 配置恢复异常”，优先看这里。

## 4. 简历模块的真实生效逻辑

### 4.1 简历生成是两阶段流程

`step5` 内部不是单块，而是两个 phase：

- `contentPhase`
  先选模板，再开始生成，生成后允许编辑和重新生成
- `templatePhase`
  确认内容后，再导出 PDF / DOC / MD

相关函数主要在 [actions.js](/E:/Documents/interview-coach-skill/web-app/assets/actions.js)：

- `generateResume()`
  首次生成
- `regenerateResume()`
  切换模板后的重新生成
- `goToTemplatePhase()`
  从编辑阶段进入导出阶段
- `backToContentPhase()`
  从导出阶段返回内容编辑
- `exportResume(kind)`
  统一导出入口

### 4.2 PDF 已改为前端直出

当前目标逻辑：

- 不再使用浏览器 `window.print()`
- 直接生成文本型 PDF 文件
- 优先压缩为单页
- 放不下时才分页

关键函数：

- `downloadResumePDF()`
- `renderResumePdf()`

PDF 依赖来自 [index.html](/E:/Documents/interview-coach-skill/web-app/index.html) 中的 `jsPDF` CDN。

### 4.3 模板来源

唯一模板源应当是 `RESUME_TEMPLATES`。

每个模板包含：

- `name`
- `desc`
- `for`
- `generationHint`
- `preview`
- `pdf`

其中 `pdf` 下包含：

- 页边距
- 字号
- 行高
- 间距
- 压缩梯度 `compression`

如果要新增模板，优先在 [state.js](/E:/Documents/interview-coach-skill/web-app/assets/state.js) 扩展，不要只改 HTML。

## 5. 当前需要特别注意的坑

### 5.1 中文乱码问题

这个仓库最近出现过两种乱码：

1. `index.html` 静态中文损坏
2. `view.js` / `actions.js` / `state.js` 里的运行时文案损坏

目前修复策略：

- 静态结构继续保留在 `index.html`
- 关键可见文案通过 `repairUIStrings()` 运行时强制覆盖

所以如果用户反馈“某一块还是乱码”，优先别全文件大改，先检查：

- `repairUIStrings()` 是否覆盖到该区域
- 那块文字是不是由 JS 动态生成

### 5.2 step5 是高风险区域

`step5` 最近改动最多，涉及：

- 模板选择
- 开始生成 / 重新生成
- 预览
- 直出 PDF
- 导出区 UI

如果要改简历导出体验，先搜这些关键字：

- `generateResume`
- `regenerateResume`
- `updateResumePreview`
- `renderResumePdf`
- `downloadResumePDF`
- `goToTemplatePhase`
- `exportResume`

### 5.3 不要轻易回退旧导出逻辑

之前浏览器打印导出已经被替换过，旧逻辑可能以 `legacy...` 名称残留在 [actions.js](/E:/Documents/interview-coach-skill/web-app/assets/actions.js)。

原则：

- 旧逻辑仅作参考
- 主路径必须保持前端直接下载 PDF

## 6. 推荐的排查顺序

### 页面打不开

先查：

- [index.html](/E:/Documents/interview-coach-skill/web-app/index.html)
  是否有未闭合标签、损坏属性、坏掉的 `placeholder`

### 页面能打开但内容乱码

先查：

- [view.js](/E:/Documents/interview-coach-skill/web-app/assets/view.js)
  `repairUIStrings()`
- 再看动态渲染函数：
  - `renderTemplateCards()`
  - `renderApiConfig()`
  - `updateStepModelSelectors()`

### 点击生成/导出没反应

先查：

- [actions.js](/E:/Documents/interview-coach-skill/web-app/assets/actions.js)
- 再查 [api.js](/E:/Documents/interview-coach-skill/web-app/assets/api.js)
  是否恢复了错误状态或 Provider 配置为空

### PDF 样式不好看或分页异常

先查：

- [state.js](/E:/Documents/interview-coach-skill/web-app/assets/state.js)
  `RESUME_TEMPLATES[*].pdf`
- [actions.js](/E:/Documents/interview-coach-skill/web-app/assets/actions.js)
  `renderResumePdf()`

## 7. 下次修改时的建议

### 改 UI 文案

优先修改：

- `view.js` 的运行时修复逻辑

再视情况补：

- `index.html` 的静态文本

### 改简历模板

优先修改：

- `state.js` 里的 `RESUME_TEMPLATES`

### 改生成流程

优先修改：

- `actions.js`

### 改页面布局或新增区块

通常需要同时看：

- `index.html`
- `view.js`
- `actions.js`

## 8. 最小验证清单

修改后至少做这几项：

1. `node --check web-app\\assets\\view.js`
2. `node --check web-app\\assets\\state.js`
3. `node --check web-app\\assets\\actions.js`
4. 打开本地 [index.html](/E:/Documents/interview-coach-skill/web-app/index.html)
5. 检查：
   - 页面能否正常加载
   - 侧边栏和步骤标题是否正常中文
   - 模板卡片是否正常
   - “开始生成简历 / 重新生成 / 导出 PDF”是否能点击

## 9. 一句话总结

这个项目本质上是一个纯前端单页求职助手，核心维护重点不在“文件多”，而在：

- `state.js` 定义数据
- `view.js` 保证页面显示正常
- `actions.js` 保证简历生成与 PDF 导出主流程稳定

如果时间有限，先保住 `step5`、`repairUIStrings()`、`RESUME_TEMPLATES` 这三块。

## 10. 中文乱码问题：根因分析与预防指南

### 10.1 乱码是如何产生的

这个仓库曾出现过两次大规模中文乱码，根因是 **UTF-8 字节序列被错误解释为其他编码**：

1. **文件级编码损坏**：`index.html` 的中文 UTF-8 文本被当作 Latin-1/Windows-1252 处理，导致：
   - 中文字符变成乱码字节序列（如 `简历内容` → `绠€鍘嗗唴瀹?`）
   - **关键破坏**：部分 `<` 字节 (0x3C) 被替换为 `?` (0x3F)，使 `</h2>` 变成 `?/h2>`，HTML 闭合标签失效，导致浏览器解析 DOM 时整个区块丢失
   
2. **NCR 格式幸存**：`&#XXXX;` 格式的数字字符引用（如 `&#27714;&#32844;`）因为只使用 ASCII 字符，不受编码转换影响。这就是为什么 HTML 中有些中文正常、有些乱码的原因。

### 10.2 如何避免再次产生乱码

以下规则必须遵守：

1. **禁止使用非 UTF-8 工具编辑文件**：不要用 Windows 记事本（默认 ANSI）、不支持 UTF-8 的旧编辑器打开项目文件。推荐 VS Code 并确认右下角显示 `UTF-8`。

2. **HTML 中新增中文优先使用直接中文**：文件声明了 `<meta charset="UTF-8">`，直接写中文即可。如果对编码环境不放心，可用 NCR 格式（`&#XXXXX;`）。

3. **修改 HTML 后必须验证**：在浏览器打开页面，检查所有新增区域的中文是否正常显示，检查有无 `?/h2>`、`?/p>` 等损坏的闭合标签。

4. **禁止批量查找替换非 ASCII 字符**：`sed`、`awk` 等工具的某些版本对多字节 UTF-8 处理有 bug，可能导致字节级损坏。如需批量替换中文，优先用 `repairUIStrings()` 运行时覆盖。

5. **Git 操作注意**：`git add` 前检查 `git diff` 中是否有意外出现的 `?` 字符替代了正常中文。如果发现乱码变多，说明操作过程中发生了编码损坏。

### 10.3 发生乱码时的修复顺序

1. **首先修复 HTML 结构**：用 `grep -on '\?/[a-z]*>' index.html` 查找损坏的闭合标签，用 sed 将其恢复：`sed -i 's/\?\/h2>/<\/h2>/g'`（覆盖所有标签类型：h2, h3, p, span, div, label, button, option, strong）
2. **然后扩展 repairUIStrings()**：在 `view.js` 中为乱码区域添加选择器→正确文本的映射
3. **使用 `textContent` 注意子元素**：如果元素内部有 `<span>` 等子元素，不要直接设置 `el.textContent`（会清除子元素），而是遍历 `childNodes` 只修改 `TEXT_NODE` 类型的节点
4. **验证**：`node --check` 检查 JS 语法，浏览器打开页面检查所有步骤区块

### 10.4 验证清单（修改 HTML 后必做）

```bash
# 1. 检查无损坏的闭合标签
grep -on '\?/[a-z]*>' web-app/index.html
# 应该无输出——如果有输出，说明编码已损坏

# 2. JS 语法检查
node --check web-app/assets/view.js
node --check web-app/assets/state.js
node --check web-app/assets/actions.js

# 3. 浏览器打开验证所有步骤
```
