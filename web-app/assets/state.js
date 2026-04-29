// ===================== Step Constants =====================
const TOP_LEVEL_STEP_IDS = ['step1', 'step5', 'step6', 'step7', 'step8', 'step9'];
const RESUME_SUBSTEP_IDS = ['basic', 'education', 'work', 'projects', 'selfeval'];

// Universal built-in templates
const RESUME_TEMPLATES = {
  reference: {
    name: '参考简历版',
    desc: '默认模板，按你上传的中文简历样式重做，适合校招、实习与一页式简历。',
    for: '默认推荐',
    accent: '默认',
    generationHint: '版式参考一页中文简历：姓名居中、联系方式单独一行、分区标题清晰、内容紧凑，项目经历优先写技术栈、职责与成果，整体正式克制。',
    preview: `# 张三
13800138000 ｜ zhangsan@example.com

## 教育背景
某某大学 ｜ 计算机学院 ｜ 本科 ｜ 2020.09 - 2024.06
- GPA: 3.5/4.0

## 项目经历
### 智能客服对话系统 ｜ 核心开发 ｜ 2023.03 - 2023.09
- 技术栈：Python、TensorFlow、Flask、Docker
- 职责：NLP 意图识别模块开发与模型调优
- 成果：意图识别准确率从 82% 提升至 93%，响应耗时降至 200ms 以内`,
    pdf: {
      margins: { top: 16, right: 18, bottom: 18, left: 18 },
      font: { h1: 20, h2: 12.5, h3: 10.8, body: 9.9, meta: 9.2 },
      spacing: { afterH1: 5, afterContact: 10, beforeH2: 9, afterH2: 4, beforeH3: 4, afterH3: 1.5, afterParagraph: 1.8, afterList: 2.4, bulletIndent: 4.5 },
      lineHeight: { body: 1.5, tight: 1.34, heading: 1.18 },
      compression: [
        { fontScale: 1, spacingScale: 1, lineScale: 1 },
        { fontScale: 0.97, spacingScale: 0.92, lineScale: 0.96 },
        { fontScale: 0.94, spacingScale: 0.84, lineScale: 0.92 },
        { fontScale: 0.91, spacingScale: 0.76, lineScale: 0.89 }
      ]
    }
  },
  standard: {
    name: '现代专业版',
    desc: '信息层次更清晰，适合社招和通用岗位投递。',
    for: '通用岗位',
    accent: '清晰',
    generationHint: '输出一份现代、清晰、正式的中文简历，模块标题统一，经历成果尽量量化，信息密度适中，适合导出为专业 PDF。',
    preview: `# 候选人姓名
城市 ｜ 电话 ｜ 邮箱 ｜ 作品集
## 个人概述
- 3-4 句概括岗位方向、经验年限、核心技术与业务结果

## 工作经历
### 公司名称 ｜ 岗位 ｜ 2022.03 - 至今
- 主导核心系统重构，性能提升 40%
- 建立可观测体系，故障定位时间缩短 60%`,
    pdf: {
      margins: { top: 18, right: 18, bottom: 18, left: 18 },
      font: { h1: 19, h2: 12.2, h3: 10.6, body: 9.8, meta: 9.2 },
      spacing: { afterH1: 5, afterContact: 10, beforeH2: 10, afterH2: 4, beforeH3: 5, afterH3: 2, afterParagraph: 2, afterList: 2.6, bulletIndent: 4.5 },
      lineHeight: { body: 1.52, tight: 1.36, heading: 1.2 },
      compression: [
        { fontScale: 1, spacingScale: 1, lineScale: 1 },
        { fontScale: 0.97, spacingScale: 0.92, lineScale: 0.96 },
        { fontScale: 0.94, spacingScale: 0.86, lineScale: 0.93 }
      ]
    }
  },
  compact: {
    name: '紧凑高密版',
    desc: '信息密度更高，适合经历较多、想尽量压到一页的简历。',
    for: '资深岗位',
    accent: '高密',
    generationHint: '输出一份高信息密度的一页式中文简历，减少空话，保留高价值成果、技术栈和职责，适合经验较多的候选人。',
    preview: `# 候选人姓名 ｜ 求职方向
城市 ｜ 电话 ｜ 邮箱

## 核心竞争力
- 8 年后端 / AI 应用经验，负责过高并发系统与核心交付
- 熟悉系统设计、性能优化、跨团队推进`,
    pdf: {
      margins: { top: 14, right: 15, bottom: 14, left: 15 },
      font: { h1: 18, h2: 11.5, h3: 10.2, body: 9.3, meta: 8.8 },
      spacing: { afterH1: 4, afterContact: 8, beforeH2: 8, afterH2: 3, beforeH3: 4, afterH3: 1.5, afterParagraph: 1.4, afterList: 1.8, bulletIndent: 4.2 },
      lineHeight: { body: 1.42, tight: 1.3, heading: 1.16 },
      compression: [
        { fontScale: 1, spacingScale: 1, lineScale: 1 },
        { fontScale: 0.97, spacingScale: 0.9, lineScale: 0.95 },
        { fontScale: 0.94, spacingScale: 0.82, lineScale: 0.91 }
      ]
    }
  }
};

// Job search platforms
const JOB_PLATFORMS = [
  { key: 'zhipin', name: 'BOSS直聘', url: 'zhipin.com' },
  { key: 'zhaopin', name: '智联招聘', url: 'zhaopin.com' },
  { key: 'lagou', name: '拉勾网', url: 'lagou.com' },
  { key: 'liepin', name: '猎聘', url: 'liepin.com' },
  { key: '51job', name: '前程无忧', url: '51job.com' }
];

// ===================== Pure State =====================
const state = {
  providers: [
    { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1/chat/completions', apiKey: '', model: 'deepseek-chat', type: 'openai' },
    { id: 'doubao', name: '豆包（火山引擎）', apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', apiKey: '', model: 'doubao-pro-32k', type: 'openai' },
    { id: 'qwen', name: '千问（阿里云）', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', apiKey: '', model: 'qwen-plus', type: 'openai' }
  ],
  activeProviderId: 'deepseek',

  stepModelMap: {
    resumeParse: null,
    resumeGeneration: null,
    resumeOptimization: null,
    jobSearch: null,
    careerMatch: null,
    interviewQuestion: null,
    interviewEval: null
  },

  isProcessing: false,
  activeAbortController: null,

  hasStarted: false,
  currentStep: 0,
  currentResumeSubstep: 'basic',
  mode: '',
  existingResume: '',
  resume: '',
  optimizedResume: '',
  resumeTemplate: 'reference',
  resumeGeneratedOnce: false,
  resumeLayoutCompressionIndex: 0,
  templateConfirmed: false,
  customTemplate: '',
  templateDesignerChat: [],
  userData: {},

  matchChoice: '',
  matchData: null,

  jobChoice: '',
  jobsFound: [],
  jobSearchConfig: {
    platforms: ['zhipin', 'zhaopin', 'lagou', 'liepin', '51job'],
    resultsPerPlatform: 3,
    searchOrder: []
  },
  jobSearchProgress: { phase: '', platform: '', completed: 0, total: 0 },
  jobSearchCancelled: false,

  interviewSources: [],
  customSource: '',
  chatHistory: [],
  interviewQuestions: [],
  questionIndex: 0,
  scores: [],
  interviewActive: false,
  interviewQA: [],
  currentQuestion: '',
  awaitingAnswer: false,
  awaitingInput: false,

  applications: []
};
