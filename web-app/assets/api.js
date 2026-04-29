// ===================== Provider Presets =====================
const PROVIDER_PRESETS = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    type: 'openai',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder']
  },
  doubao: {
    id: 'doubao',
    name: '豆包（火山引擎）',
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    type: 'openai',
    defaultModel: 'doubao-pro-32k',
    models: ['doubao-pro-32k', 'doubao-pro-128k', 'deepseek-r1', 'doubao-1.5-pro']
  },
  qwen: {
    id: 'qwen',
    name: '千问（阿里云）',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    type: 'openai',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen2.5-72b-instruct']
  }
};

// ===================== Provider Getters =====================
function getActiveProvider() {
  return state.providers.find(p => p.id === state.activeProviderId) || state.providers[0];
}

function getProvider(id) {
  return state.providers.find(p => p.id === id);
}

// ===================== Step Model Resolution =====================
function getResolvedProviderId(stepRole) {
  const mappedId = state.stepModelMap[stepRole];
  if (mappedId && state.providers.some(p => p.id === mappedId && p.apiKey)) {
    return mappedId;
  }
  return state.activeProviderId;
}

// ===================== AbortController for Cancellable Operations =====================
function startProcess() {
  state.isProcessing = true;
  state.activeAbortController = new AbortController();
  // Disable sidebar step navigation visually
  document.querySelectorAll('.step-dot').forEach(d => d.style.pointerEvents = 'none');
  document.querySelectorAll('.side-action').forEach(b => { if (!b.classList.contains('active')) b.style.pointerEvents = 'none'; });
}

function endProcess() {
  state.isProcessing = false;
  state.activeAbortController = null;
  document.querySelectorAll('.step-dot').forEach(d => d.style.pointerEvents = '');
  document.querySelectorAll('.side-action').forEach(b => { b.style.pointerEvents = ''; });
}

function isProcessCancelled() {
  return state.activeAbortController && state.activeAbortController.signal.aborted;
}

// ===================== Core API Call =====================
async function callLLM(system, messages, { maxTokens = 2048, providerId = null } = {}) {
  const resolvedId = providerId || state.activeProviderId;
  const provider = resolvedId ? getProvider(resolvedId) : getActiveProvider();

  if (!provider) throw new Error('请先配置 API 服务商');
  if (!provider.apiKey) throw new Error('请先填写 API Key');
  if (!provider.model) throw new Error('请选择模型');

  const msgs = [];
  if (system) {
    msgs.push({ role: 'system', content: system });
  }
  (messages || []).forEach(m => {
    msgs.push({ role: m.role, content: m.content });
  });

  const resp = await fetch(provider.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens,
      messages: msgs,
      temperature: 0.7,
      stream: false
    })
  });

  if (!resp.ok) {
    let errMsg;
    try {
      const errJson = await resp.json();
      errMsg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
    } catch {
      errMsg = await resp.text();
    }
    throw new Error(`API 错误 (${provider.name}): ${resp.status} - ${errMsg}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

// ===================== Provider Management =====================
function getProviderFormData(providerId) {
  const p = getProvider(providerId);
  if (!p) return null;

  const modelSelect = document.getElementById(`model_${providerId}`);
  const modelValue = modelSelect?.value;
  const customInput = document.getElementById(`customModel_${providerId}`);

  let model = p.model;
  if (modelValue === '__custom__') {
    model = customInput?.value?.trim() || p.model;
  } else if (modelValue) {
    model = modelValue;
  }

  const apiUrl = document.getElementById(`url_${providerId}`)?.value?.trim() || p.apiUrl;

  return {
    apiUrl,
    apiKey: document.getElementById(`key_${providerId}`)?.value?.trim() || '',
    model
  };
}

function saveProviderFromForm(providerId) {
  const p = getProvider(providerId);
  if (!p) return;
  const data = getProviderFormData(providerId);
  if (data.apiUrl) p.apiUrl = data.apiUrl;
  if (data.apiKey) p.apiKey = data.apiKey;
  if (data.model) p.model = data.model;
}

function saveAllProviders() {
  Object.keys(PROVIDER_PRESETS).forEach(id => { try { saveProviderFromForm(id); } catch (e) { console.error('saveProvider error', id, e); } });
  // Persist configs (without full API keys, but keep model selections)
  try {
    const configToSave = state.providers.map(p => ({
      id: p.id, name: p.name, apiUrl: p.apiUrl,
      model: p.model, type: p.type, apiKey: '' // never save keys
    }));
    localStorage.setItem('ai_providers_config', JSON.stringify(configToSave));
    localStorage.setItem('ai_active_provider', state.activeProviderId);
    localStorage.setItem('ai_step_model_map', JSON.stringify(state.stepModelMap));
  } catch (e) { /* ignore localStorage errors */ }
}

function loadProvidersFromStorage() {
  try {
    const saved = localStorage.getItem('ai_providers_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.forEach((p, i) => {
        if (state.providers[i]) {
          if (p.model) state.providers[i].model = p.model;
          if (p.apiUrl) state.providers[i].apiUrl = p.apiUrl;
        }
      });
    }
    const activeId = localStorage.getItem('ai_active_provider');
    if (activeId && state.providers.some(p => p.id === activeId)) {
      state.activeProviderId = activeId;
    }
    const stepMap = localStorage.getItem('ai_step_model_map');
    if (stepMap) {
      Object.assign(state.stepModelMap, JSON.parse(stepMap));
    }
  } catch (e) { /* ignore */ }
}

// ===================== Session Persistence (Resume + Progress) =====================
const SESSION_KEY = 'ai_session_data';

function saveSessionData() {
  try {
    const data = {
      userData: Object.fromEntries(
        Object.entries(state.userData).filter(([k]) => k !== 'customModules' || (state.userData.customModules && state.userData.customModules.length > 0))
      ),
      resume: state.resume,
      optimizedResume: state.optimizedResume,
      optimizeCompany: state.optimizeCompany,
      optimizePosition: state.optimizePosition,
      existingResume: state.existingResume,
      mode: state.mode,
      currentStep: state.currentStep,
      currentResumeSubstep: state.currentResumeSubstep,
      resumeTemplate: state.resumeTemplate,
      resumeGeneratedOnce: state.resumeGeneratedOnce,
      resumeLayoutCompressionIndex: state.resumeLayoutCompressionIndex,
      templateConfirmed: state.templateConfirmed,
      customTemplate: state.customTemplate,
      templateDesignerChat: (state.templateDesignerChat || []).slice(-20),
      matchChoice: state.matchChoice,
      matchData: state.matchData,
      jobChoice: state.jobChoice,
      jobsFound: state.jobsFound.slice(0, 10),
      jobSearchConfig: state.jobSearchConfig,
      targetCompany: state.targetCompany,
      hasStarted: state.hasStarted,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function loadSessionData() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return false;
    const data = JSON.parse(saved);
    if (data.userData && Object.keys(data.userData).length > 0) { state.userData = data.userData; }
    if (data.resume) state.resume = data.resume;
    if (data.optimizedResume) state.optimizedResume = data.optimizedResume;
    if (data.optimizeCompany) state.optimizeCompany = data.optimizeCompany;
    if (data.optimizePosition) state.optimizePosition = data.optimizePosition;
    if (data.existingResume) state.existingResume = data.existingResume;
    if (data.mode) state.mode = data.mode;
    if (data.currentStep) state.currentStep = data.currentStep;
    if (data.currentResumeSubstep) state.currentResumeSubstep = data.currentResumeSubstep;
    if (data.resumeTemplate) state.resumeTemplate = data.resumeTemplate;
    if (typeof data.resumeGeneratedOnce === 'boolean') state.resumeGeneratedOnce = data.resumeGeneratedOnce;
    if (typeof data.resumeLayoutCompressionIndex === 'number') state.resumeLayoutCompressionIndex = data.resumeLayoutCompressionIndex;
    if (data.templateConfirmed) state.templateConfirmed = data.templateConfirmed;
    if (data.customTemplate) state.customTemplate = data.customTemplate;
    if (data.templateDesignerChat) state.templateDesignerChat = data.templateDesignerChat;
    if (data.matchChoice) state.matchChoice = data.matchChoice;
    if (data.matchData) state.matchData = data.matchData;
    if (data.jobChoice) state.jobChoice = data.jobChoice;
    if (data.jobsFound && data.jobsFound.length > 0) state.jobsFound = data.jobsFound;
    if (data.jobSearchConfig) state.jobSearchConfig = data.jobSearchConfig;
    if (data.targetCompany) state.targetCompany = data.targetCompany;
    if (data.hasStarted) state.hasStarted = true;
    return true;
  } catch (e) {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) { /* ignore */ }
    return false;
  }
}

function clearSessionData() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}

// Tracks whether user confirmed clearing data
let _sessionContinueConfirmed = false;
function promptRestoreSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return false;
    const data = JSON.parse(saved);
    if (!data.mode && !data.userData?.name) return false;
    return data;
  } catch (e) { return false; }
}

// ===================== Connectivity Test =====================
async function testProviderConnectivity(providerId) {
  saveProviderFromForm(providerId);
  const provider = getProvider(providerId);
  if (!provider || !provider.apiKey || !provider.model) {
    showApiTestStatus(`请先填写 ${provider?.name || '该服务商'} 的 API Key 和模型名`, 'error');
    return;
  }

  const statusEl = document.getElementById(`status_${providerId}`);
  if (statusEl) {
    statusEl.className = 'api-test-status';
    statusEl.textContent = '正在测试连通性...';
  }

  try {
    const result = await callLLM(
      'You are a connectivity test assistant. Reply with OK and the provider name.',
      [{ role: 'user', content: 'Return a short connectivity confirmation.' }],
      { maxTokens: 32, providerId }
    );
    const preview = (result || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const displayText = `连接成功${preview ? ' · ' + preview : ''}`;
    if (statusEl) {
      statusEl.className = 'api-test-status success';
      statusEl.textContent = displayText;
    }
  } catch (error) {
    if (statusEl) {
      statusEl.className = 'api-test-status error';
      statusEl.textContent = `连接失败：${error.message}`;
    }
  }
}
