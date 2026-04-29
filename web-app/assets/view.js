// ===================== Step Utilities =====================
function getStepSectionId(stepNumber) {
  return TOP_LEVEL_STEP_IDS[stepNumber - 1] || null;
}

function getStepSection(stepNumber) {
  const id = getStepSectionId(stepNumber);
  return id ? document.getElementById(id) : null;
}

// ===================== Processing Toast =====================
function showProcessingToast(msg) {
  let toast = document.getElementById('processingToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'processingToast';
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--primary);color:white;padding:10px 24px;border-radius:20px;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(108,92,231,0.4);pointer-events:none;transition:opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ===================== Resume Substep =====================
function showResumeSubstep(substepId) {
  if (!RESUME_SUBSTEP_IDS.includes(substepId)) return;
  state.currentResumeSubstep = substepId;

  document.querySelectorAll('[data-substep-panel]').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.substepPanel === substepId);
  });
  document.querySelectorAll('.substep-chip').forEach(chip => {
    const chipId = chip.dataset.substep;
    const activeIndex = RESUME_SUBSTEP_IDS.indexOf(substepId);
    const chipIndex = RESUME_SUBSTEP_IDS.indexOf(chipId);
    chip.classList.toggle('active', chipId === substepId);
    chip.classList.toggle('done', chipIndex < activeIndex);
  });
}

function resetResumeSubsteps() {
  showResumeSubstep('basic');
}

// ===================== API Config Rendering =====================
function renderApiConfig() {
  const container = document.getElementById('providerPresets');
  if (!container) return;

  container.innerHTML = Object.values(PROVIDER_PRESETS).map(p => {
    const provider = getProvider(p.id) || p;
    const isActive = state.activeProviderId === p.id;
    return `
      <div class="provider-card ${isActive ? 'active' : ''}"
           data-provider-id="${p.id}"
           onclick="selectProviderPreset('${p.id}')">
        <div class="provider-card-header">
          <span class="provider-name">${p.name}</span>
          <span class="provider-badge preset-tag">预设</span>
          <span class="provider-badge ${isActive ? 'active-badge' : 'inactive-badge'}">${isActive ? '当前使用' : '点击切换'}</span>
        </div>
        <div class="provider-card-body" onclick="event.stopPropagation()">
          <div class="form-group">
            <label>API 地址 <span style="font-weight:400;font-size:10px;color:var(--text-light);">（可修改）</span></label>
            <input type="url" id="url_${p.id}" class="provider-key-input"
                   value="${provider.apiUrl || p.apiUrl}"
                   placeholder="https://api.example.com/v1/chat/completions" />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input type="password" id="key_${p.id}" class="provider-key-input"
                   placeholder="sk-..." value="${provider.apiKey || ''}"
                   autocomplete="off" />
          </div>
          <div class="form-group">
            <label>模型</label>
            <select id="model_${p.id}" class="provider-model-select">
              ${p.models.map(m => `<option value="${m}" ${provider.model === m ? 'selected' : ''}>${m}</option>`).join('')}
              <option value="__custom__" ${p.models.includes(provider.model) ? '' : 'selected'}>自定义模型名...</option>
            </select>
            <input type="text" id="customModel_${p.id}"
                   class="provider-custom-model hidden"
                   placeholder="输入自定义模型名"
                   value="${p.models.includes(provider.model) ? '' : provider.model}" />
          </div>
        </div>
        <div id="status_${p.id}" class="api-test-status"></div>
        <div class="provider-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-outline btn-sm" onclick="testProviderConnectivity('${p.id}')">
            测试连通性
          </button>
        </div>
      </div>`;
  }).join('');

  // Custom model input toggle
  document.querySelectorAll('.provider-model-select').forEach(sel => {
    sel.addEventListener('change', function() {
      const customInput = document.getElementById('customModel_' + this.id.replace('model_', ''));
      if (customInput) {
        customInput.classList.toggle('hidden', this.value !== '__custom__');
        if (this.value !== '__custom__') customInput.value = '';
      }
    });
    // Initialize visibility
    const customInput = document.getElementById('customModel_' + sel.id.replace('model_', ''));
    if (customInput && sel.value === '__custom__') {
      customInput.classList.remove('hidden');
    }
  });
}

function selectProviderPreset(id) {
  saveAllProviders();
  state.activeProviderId = id;
  renderApiConfig();
  updateStepModelSelectors();
}

// ===================== Step Model Selectors =====================
const STEP_ROLE_LABELS = {
  resumeParse: '简历解析',
  resumeGeneration: '简历生成',
  resumeOptimization: '简历优化',
  jobSearch: '职位搜索',
  careerMatch: '岗位匹配',
  interviewQuestion: '面试出题',
  interviewEval: '回答评估'
};

function updateStepModelSelectors() {
  const selects = document.querySelectorAll('.step-model-select');
  if (selects.length === 0) return;

  selects.forEach(sel => {
    const role = sel.dataset.role;
    if (!role) return;
    const current = state.stepModelMap[role] || '';
    const activeId = state.activeProviderId;

    // Keep the "default" option and update all provider options
    const defaultOpt = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    const defOpt = document.createElement('option');
    defOpt.value = '';
    const activeProvider = getProvider(activeId);
    defOpt.textContent = `默认 (${activeProvider ? activeProvider.name + ' · ' + activeProvider.model : '未配置'})`;
    sel.appendChild(defOpt);

    state.providers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.model})`;
      if (p.id === (current || activeId)) opt.selected = true;
      sel.appendChild(opt);
    });

    // Listen for changes
    sel.onchange = () => {
      state.stepModelMap[role] = sel.value || null;
      saveAllProviders();
    };
  });
}

// ===================== API Test Status =====================
function showApiTestStatus(message, kind) {
  // Legacy function - now per-provider status is in provider cards
  const el = document.getElementById('apiTestStatus');
  if (!el) return;
  el.className = 'api-test-status';
  if (kind) el.classList.add(kind);
  el.textContent = message;
}

// ===================== Navigation =====================
function hideWorkflowViews() {
  document.getElementById('setupSection').classList.add('hidden');
  document.getElementById('entrySection').classList.remove('active');
  document.getElementById('entrySection').classList.add('hidden');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  setEntryNavActive(false);
  setTrackerNavActive(false);
}

function setApiNavActive(active) {
  document.getElementById('apiNavItem').classList.toggle('active', active);
}

function setEntryNavActive(active) {
  document.getElementById('entryNavItem').classList.toggle('active', active);
}

function setEntryNavEnabled(enabled) {
  document.getElementById('entryNavItem').disabled = !enabled;
}

function showApiManager() {
  hideWorkflowViews();
  document.getElementById('setupSection').classList.remove('hidden');
  renderApiConfig();
  setTimeout(() => updateStepModelSelectors(), 0);
  setApiNavActive(true);
}

function showEntrySection() {
  try { hideWorkflowViews(); } catch (e) {}
  const entryEl = document.getElementById('entrySection');
  if (entryEl) {
    entryEl.classList.remove('hidden');
    entryEl.classList.add('active');
  }
  setEntryNavActive(true);
  // Force-enable the entry button
  const entryBtn = document.getElementById('entryNavItem');
  if (entryBtn) entryBtn.disabled = false;
  state.hasStarted = true;
  state.currentStep = 0;
}

function jumpToStep(n) {
  if (state.isProcessing) {
    showProcessingToast('AI 正在处理中，请等待完成后再切换步骤');
    return;
  }
  state.hasStarted = true;
  goStep(n);
}

function goStep(n) {
  if (state.isProcessing) return; // silently block during processing
  if (n < 1 || n > TOP_LEVEL_STEP_IDS.length) return;
  document.getElementById('setupSection').classList.add('hidden');
  setApiNavActive(false);
  setEntryNavActive(false);
  setTrackerNavActive(false);
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('entrySection').classList.remove('active');
  document.getElementById('entrySection').classList.add('hidden');

  const stepSection = getStepSection(n);
  if (!stepSection) return;
  stepSection.classList.add('active');

  document.querySelectorAll('.step-dot').forEach(d => {
    d.classList.remove('active');
    d.classList.remove('done');
    const step = parseInt(d.dataset.step);
    if (step < n) d.classList.add('done');
    if (step === n) d.classList.add('active');
  });

  const pct = TOP_LEVEL_STEP_IDS.length === 1 ? 0 : ((n - 1) / (TOP_LEVEL_STEP_IDS.length - 1)) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  state.hasStarted = true;
  state.currentStep = n;

  if (n === 1) {
    showResumeSubstep(state.currentResumeSubstep || 'basic');
  }
}

// ===================== Chat UI =====================
function addChatMessage(role, content) {
  state.chatHistory.push({ role, content });
  renderChat();
}

function renderChat() {
  const box = document.getElementById('chatBox');
  box.innerHTML = state.chatHistory.map(msg => {
    if (msg.role === 'interviewer') {
      return `<div class="chat-msg interviewer"><div class="role-label">🎤 面试官</div><div>${marked2(msg.content)}</div></div>`;
    } else if (msg.role === 'user') {
      return `<div class="chat-msg user"><div>${marked2(msg.content)}</div></div>`;
    } else if (msg.role === 'feedback') {
      return `<div class="chat-msg" style="max-width:95%;align-self:center;background:transparent;border:none;padding:8px 0;">${msg.content}</div>`;
    } else if (msg.role === 'reference') {
      return `<div class="chat-msg" style="max-width:95%;align-self:center;background:transparent;border:none;padding:8px 0;">${msg.content}</div>`;
    } else if (msg.role === 'system') {
      return `<div class="chat-msg system">${marked2(msg.content)}</div>`;
    }
    return '';
  }).join('');
  box.scrollTop = box.scrollHeight;
}

function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let out = '';
  let inList = false;    // 'ul' | 'ol' | false
  let listItems = [];
  let inPara = false;

  function flushList() {
    if (!inList || listItems.length === 0) return;
    const tag = inList === 'ol' ? 'ol' : 'ul';
    out += '<' + tag + '>' + listItems.map(li => '<li>' + li + '</li>').join('') + '</' + tag + '>';
    listItems = [];
    inList = false;
  }

  function flushPara() {
    if (inPara) { out += '</p>'; inPara = false; }
  }

  function inlineFormat(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Blank line — break paragraphs and lists
    if (trimmed === '') {
      flushList();
      flushPara();
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^### (.+)/);
    const h2 = trimmed.match(/^## (.+)/);
    const h1 = trimmed.match(/^# (.+)/);
    if (h3 || h2 || h1) {
      flushList();
      flushPara();
      if (h3) { out += '<h3>' + inlineFormat(h3[1]) + '</h3>'; continue; }
      if (h2) { out += '<h2>' + inlineFormat(h2[1]) + '</h2>'; continue; }
      if (h1) { out += '<h1>' + inlineFormat(h1[1]) + '</h1>'; continue; }
    }

    // Horizontal rule
    if (/^---+\s*$/.test(trimmed)) {
      flushList();
      flushPara();
      out += '<hr>';
      continue;
    }

    // Unordered list
    const ulItem = trimmed.match(/^[-*]\s+(.+)/);
    if (ulItem) {
      flushPara();
      if (inList !== 'ul') { flushList(); inList = 'ul'; }
      listItems.push(inlineFormat(ulItem[1]));
      continue;
    }

    // Ordered list
    const olItem = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (olItem) {
      flushPara();
      if (inList !== 'ol') { flushList(); inList = 'ol'; }
      listItems.push(inlineFormat(olItem[1]));
      continue;
    }

    // Regular paragraph text
    flushList();
    if (!inPara) { out += '<p>'; inPara = true; } else { out += '<br>'; }
    out += inlineFormat(trimmed);
  }

  flushList();
  flushPara();
  return out;
}

// Legacy alias
function marked2(text) {
  return renderMarkdown(text);
}

function updateQuestionCounter() {
  const avg = state.scores.length > 0
    ? (state.scores.reduce((a, b) => a + b, 0) / state.scores.length).toFixed(1)
    : '暂无评分';
  document.getElementById('questionCounter').textContent = `已答 ${state.interviewQA.length} 题 | 平均分：${avg}`;
}

// ===================== Application Tracker UI =====================
const STATUS_LABELS = {
  'submitted': '已投递',
  'resume-passed': '简历通过',
  'interviewing': '面试中',
  'offer': '已 Offer',
  'rejected': '已拒绝'
};

function showApplicationTracker() {
  hideWorkflowViews();
  document.getElementById('trackerSection').classList.add('active');
  document.getElementById('trackerEmpty').style.display = '';
  setTrackerNavActive(true);
  renderTrackerSummary();
  renderTrackerList();
}

function setTrackerNavActive(active) {
  const btn = document.getElementById('trackerNavItem');
  if (btn) btn.classList.toggle('active', active);
}

function toggleTrackerForm() {
  const form = document.getElementById('trackerForm');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    document.getElementById('trackerCompany').focus();
  }
}

function renderTrackerSummary() {
  const container = document.getElementById('trackerSummary');
  const total = state.applications.length;
  const byStatus = {};
  state.applications.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  container.innerHTML =
    '<div class="summary-grid" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr));">' +
    '<div class="summary-item"><div class="value">' + total + '</div><div class="label">总计</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['submitted'] || 0) + '</div><div class="label">已投递</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['resume-passed'] || 0) + '</div><div class="label">简历通过</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['interviewing'] || 0) + '</div><div class="label">面试中</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['offer'] || 0) + '</div><div class="label">已 Offer</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['rejected'] || 0) + '</div><div class="label">已拒绝</div></div>' +
    '</div>';
}

function renderTrackerList() {
  const container = document.getElementById('trackerList');
  const empty = document.getElementById('trackerEmpty');
  if (state.applications.length === 0) {
    container.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  const sorted = state.applications.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  let html = '<div class="tracker-table-wrap"><table class="tracker-table"><thead><tr>' +
    '<th>公司</th><th>职位</th><th>平台</th><th>状态</th><th>投递日期</th><th>操作</th>' +
    '</tr></thead><tbody>';

  sorted.forEach(app => {
    html += '<tr>' +
      '<td><strong>' + escHtml(app.company) + '</strong></td>' +
      '<td>' + escHtml(app.position) + '</td>' +
      '<td>' + (app.platform ? escHtml(app.platform) : '-') + '</td>' +
      '<td><span class="status-badge ' + app.status + '">' + (STATUS_LABELS[app.status] || app.status) + '</span></td>' +
      '<td style="font-size:13px;color:var(--text-light);">' + (app.dateApplied || '-') + '</td>' +
      '<td><div class="tracker-actions">' +
      '<button onclick="editTrackerApplication(\'' + app.id + '\')">编辑</button>' +
      '<button class="btn-del" onclick="deleteTrackerApplication(\'' + app.id + '\')">删除</button>' +
      '</div></td></tr>';
    if (app.url || app.notes) {
      html += '<tr style="background:#FAFBFC;"><td colspan="6" style="padding:4px 12px;font-size:12px;">';
      if (app.url) html += '🔆 <a href="' + escHtml(app.url) + '" target="_blank" rel="noopener" style="color:var(--primary);">' + escHtml(app.url) + '</a>';
      if (app.url && app.notes) html += ' | ';
      if (app.notes) html += '📰 ' + escHtml(app.notes);
      html += '</td></tr>';
    }
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ===================== File List UI =====================
function addFileToList(name, status, size) {
  const list = document.getElementById('fileList');
  const id = 'file-item-' + name.replace(/[^a-zA-Z0-9]/g, '-');
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#F8F9FD;border-radius:8px;padding:10px 14px;';
  div.innerHTML = `
    <div style="flex:1;overflow:hidden;">
      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📫 ${name}</div>
      <div style="font-size:11px;color:var(--text-light);">${(size / 1024).toFixed(1)} KB — ${status}</div>
    </div>
    <button onclick="removeFile('${name.replace(/'/g, "\\'")}')" style="background:none;border:none;color:#E74C3C;cursor:pointer;font-size:18px;padding:0 4px;">&times;</button>
  `;
  list.appendChild(div);
}

function updateFileListItem(name, status) {
  const id = 'file-item-' + name.replace(/[^a-zA-Z0-9]/g, '-');
  const div = document.getElementById(id);
  if (div) {
    div.querySelector('div > div:last-child').textContent = status;
  }
}

function removeFile(name) {
  const idx = uploadedFiles.findIndex(f => f.name === name);
  if (idx > -1) uploadedFiles.splice(idx, 1);
  const id = 'file-item-' + name.replace(/[^a-zA-Z0-9]/g, '-');
  const div = document.getElementById(id);
  if (div) div.remove();
}

// ===================== Resume Template Preview Cards =====================
function renderTemplateCards() {
  const container = document.getElementById('templatePreviewCards');
  if (!container) return;

  const isCustom = state.resumeTemplate === 'custom';
  let html = '';

  Object.entries(RESUME_TEMPLATES).forEach(([key, tpl]) => {
    const selected = !isCustom && state.resumeTemplate === key;
    html += `
      <div class="template-preview-card ${selected ? 'selected' : ''}" onclick="selectTemplate('${key}')">
        <div class="check-badge">${selected ? '\u2713' : ''}</div>
        <div class="tpl-name">${selected ? '\u5df2\u9009' : '\u6a21\u677f'} ${tpl.name}</div>
        <div class="tpl-desc">${tpl.desc}</div>
        <div class="tpl-for">${tpl.for}</div>
        <div class="tpl-preview">${escHtml(tpl.preview)}</div>
      </div>`;
  });

  html += `
    <div class="template-preview-card ${isCustom ? 'selected' : ''}" onclick="selectTemplate('custom')">
      <div class="check-badge">${isCustom ? '\u2713' : ''}</div>
      <div class="tpl-name">${isCustom ? '\u5df2\u9009' : '\u6a21\u677f'} \u81ea\u5b9a\u4e49\u6a21\u677f</div>
      <div class="tpl-desc">\u4e0a\u4f20\u4f60\u81ea\u5df1\u7684\u7b80\u5386\u6a21\u677f\u6587\u4ef6</div>
      <div class="tpl-for">\u652f\u6301 .docx / .pdf / .md / .txt</div>
      <div class="tpl-preview" style="text-align:center;padding:20px;font-size:13px;">
        ${state.customTemplate
          ? '\u5df2\u52a0\u8f7d\u6a21\u677f\uff08' + Math.min(state.customTemplate.length, 80) + '\u5b57\uff09<br><span style="font-size:11px;color:var(--text-light);">' + escHtml(state.customTemplate.substring(0, 60)) + '...</span>'
          : '\u70b9\u51fb\u4e0a\u65b9\u201c\u4e0a\u4f20\u6a21\u677f\u6587\u4ef6\u201d\uff0c\u6216<br>\u8ba9 AI \u53c2\u8003\u73b0\u6709\u6a21\u677f\u91cd\u65b0\u6392\u7248'}
      </div>
    </div>`;

  container.innerHTML = html;
}

function selectTemplate(key) {
  state.resumeTemplate = key;
  if (key !== 'custom') state.customTemplate = '';
  renderTemplateCards();
  updateTemplateDesignerPreview(key);
  saveSessionData();
}

function updateTemplateDesignerPreview(key) {
  const el = document.getElementById('selectedTemplateName');
  if (!el) return;
  if (key === 'custom') {
    el.textContent = '\u81ea\u5b9a\u4e49\u6a21\u677f';
    return;
  }
  const tpl = RESUME_TEMPLATES[key];
  el.textContent = tpl ? tpl.name : '\u901a\u7528\u6807\u51c6';
}

// ===================== Platform Order List =====================
function renderPlatformOrderList() {
  const container = document.getElementById('platformOrderList');
  if (!container) return;
  const config = state.jobSearchConfig;
  const order = config.searchOrder.length > 0 ? config.searchOrder : config.platforms;
  container.innerHTML = order.map(key => {
    const plat = JOB_PLATFORMS.find(p => p.key === key);
    if (!plat) return '';
    const enabled = config.platforms.includes(key);
    return `<div class="platform-chip ${enabled ? 'enabled' : 'disabled'}"
             onclick="togglePlatform('${key}')"
             style="cursor:pointer;padding:6px 12px;border-radius:8px;border:1px solid ${enabled ? 'var(--primary)' : 'var(--border)'};background:${enabled ? '#F3F0FF' : '#FAFBFC'};font-size:12px;font-weight:500;opacity:${enabled ? '1' : '0.5'};transition:all 0.2s;">
             ${enabled ? '\u542f\u7528' : '\u505c\u7528'} ${plat.name}
           </div>`;
  }).join('');
}

function togglePlatform(key) {
  const config = state.jobSearchConfig;
  const idx = config.platforms.indexOf(key);
  if (idx > -1) {
    config.platforms.splice(idx, 1);
  } else {
    config.platforms.push(key);
  }
  if (config.searchOrder.length > 0) {
    // Keep searchOrder in sync
    const ordIdx = config.searchOrder.indexOf(key);
    if (ordIdx > -1) config.searchOrder.splice(ordIdx, 1);
    else config.searchOrder.push(key);
  }
  renderPlatformOrderList();
}

// ===================== Project Folder File Tree =====================
function renderFileTree() {
  const container = document.getElementById('folderFiles');
  const fileCount = projectFolderFiles.length;
  const totalSize = projectFolderFiles.reduce((s, f) => s + f.size, 0);
  let html = `<div style="margin-bottom:8px;font-weight:600;font-size:13px;color:var(--text-light);">\u5df2\u626b\u63cf ${fileCount} \u4e2a\u4ee3\u7801\u6587\u4ef6\uff0c\u5171 ${(totalSize / 1024).toFixed(0)} KB</div>`;
  projectFolderFiles.slice(0, 30).forEach(f => {
    html += `<div style="padding:2px 0;">\u6587\u4ef6 ${f.path} <span style="color:var(--text-light);font-size:11px;">(${(f.size/1024).toFixed(1)} KB)</span></div>`;
  });
  if (projectFolderFiles.length > 30) {
    html += `<div style="color:var(--text-light);font-size:12px;">...\u8fd8\u6709 ${projectFolderFiles.length - 30} \u4e2a\u6587\u4ef6</div>`;
  }
  container.innerHTML = html;
}

function repairUIStrings() {
  document.title = 'AI \u6c42\u804c\u5168\u6d41\u7a0b\u52a9\u624b';
  const textMap = [
    ['.header h1', 'AI \u6c42\u804c\u5168\u6d41\u7a0b\u52a9\u624b'],
    ['.header p', '\u4ece\u7b80\u5386\u751f\u6210\u5230\u9762\u8bd5\u51c6\u5907\uff0c\u4e00\u7ad9\u5f0f\u5b8c\u6210\u4f60\u7684\u6c42\u804c\u5de5\u4f5c\u6d41'],
    ['#entryNavItem span:last-child', '\u7b80\u5386\u5165\u53e3\u9009\u62e9'],
    ['#apiNavItem span:last-child', 'API \u7ba1\u7406'],
    ['#trackerNavItem span:last-child', '\u6c42\u804c\u8ffd\u8e2a'],
    ['#setupSection h2', 'API \u7ba1\u7406'],
    ['#setupSection h3', 'AI \u5404\u6b65\u9aa4\u6a21\u578b\u5206\u914d'],
    ['#setupSection h3 + p', '\u4f60\u53ef\u4ee5\u4e3a\u4e0d\u540c\u4efb\u52a1\u6307\u5b9a\u6a21\u578b\uff0c\u4e0d\u8bbe\u7f6e\u65f6\u9ed8\u8ba4\u4f7f\u7528\u5f53\u524d\u9009\u4e2d\u7684\u670d\u52a1\u5546\u3002'],
    ['#entrySection h2', '\u6b22\u8fce\u4f7f\u7528 AI \u6c42\u804c\u5168\u6d41\u7a0b\u52a9\u624b'],
    ['#entrySection > div > p:nth-child(3)', '\u8bf7\u9009\u62e9\u4f60\u60f3\u505a\u7684\u4e8b\u60c5\uff0c\u6211\u4f1a\u4e3a\u4f60\u63d0\u4f9b\u5bf9\u5e94\u7684\u6c42\u804c\u670d\u52a1'],
    ['#step1 > h2', '01 \u7b80\u5386\u5185\u5bb9'],
    ['#step1 > .subtitle', '\u628a\u7b80\u5386\u9700\u8981\u7684\u4fe1\u606f\u653e\u5728\u4e00\u4e2a\u5927\u6b65\u9aa4\u91cc\uff0c\u518d\u6309\u987a\u5e8f\u5206\u6210\u51e0\u4e2a\u5c0f\u6b65\u9aa4\u586b\u5199'],
    ['#step5 > h2', '02 \u7b80\u5386\u751f\u6210'],
    ['#step5 > .subtitle', '\u5148\u9009\u6a21\u677f\uff0c\u518d\u5f00\u59cb\u751f\u6210\uff1b\u751f\u6210\u540e\u53ef\u5207\u6362\u6a21\u677f\u5e76\u91cd\u65b0\u751f\u6210\uff0c\u6700\u540e\u76f4\u63a5\u5bfc\u51fa PDF / DOC / MD'],
    ['#step6 > h2', '03 \u5c97\u4f4d\u5339\u914d'],
    ['#step6 > .subtitle', 'AI \u6839\u636e\u4f60\u7684\u7b80\u5386\u80cc\u666f\u63a8\u8350\u66f4\u9002\u5408\u7684\u5c97\u4f4d\u65b9\u5411'],
    ['#step7 > h2', '04 \u804c\u4f4d\u641c\u7d22'],
    ['#step7 > .subtitle', '\u4ece\u62db\u8058\u7f51\u7ad9\u641c\u7d22\u771f\u5b9e\u804c\u4f4d\uff0c\u5e76\u57fa\u4e8e\u771f\u5b9e JD \u4f18\u5316\u6c42\u804c\u65b9\u5411'],
    ['#step8 > h2', '05 \u7b80\u5386\u4f18\u5316'],
    ['#step8 > .subtitle', '\u7ed3\u5408\u76ee\u6807\u5c97\u4f4d\u8981\u6c42\uff0c\u5bf9\u5f53\u524d\u7b80\u5386\u8fdb\u884c\u5b9a\u5411\u4f18\u5316'],
    ['#step9 > h2', '06 \u6a21\u62df\u9762\u8bd5'],
    ['#step9 > .subtitle', '\u56f4\u7ed5\u76ee\u6807\u5c97\u4f4d\u5f00\u5c55\u6a21\u62df\u9762\u8bd5\uff0c\u5e76\u5f97\u5230\u56de\u7b54\u53cd\u9988'],
    ['#trackerSection h2', '\u6c42\u804c\u7533\u8bf7\u8ffd\u8e2a'],
    ['#trackerSection .subtitle', '\u8bb0\u5f55\u6bcf\u4e00\u6b21\u6295\u9012\u3001\u9762\u8bd5\u8fdb\u5c55\u4e0e\u53cd\u9988\uff0c\u5f62\u6210\u6e05\u6670\u7684\u6c42\u804c\u770b\u677f'],
    ['.side-title:nth-of-type(1)', '\u914d\u7f6e'],
    ['.side-title:nth-of-type(2)', '\u6d41\u7a0b\u76ee\u5f55'],
    ['.side-title:nth-of-type(3)', '\u6c42\u804c\u5e73\u53f0'],
    // Step 1 substep panel titles
    ['[data-substep-panel="education"] .substep-title h3', '\u6559\u80b2\u80cc\u666f'],
    ['[data-substep-panel="education"] .substep-title span', '\u628a\u5b66\u6821\u3001\u4e13\u4e1a\u548c\u65f6\u95f4\u8865\u5b8c\u6574'],
    ['[data-substep-panel="work"] .substep-title h3', '\u5de5\u4f5c\u7ecf\u5386'],
    ['[data-substep-panel="work"] .substep-title span', '\u6309\u65f6\u95f4\u5012\u5e8f\u586b\u5199\uff0c\u5c3d\u91cf\u5199\u6e05\u695a\u7ed3\u679c\u548c\u6570\u5b57'],
    ['[data-substep-panel="projects"] .substep-title h3', '\u9879\u76ee\u3001\u6280\u80fd\u4e0e\u5176\u4ed6\u4fe1\u606f'],
    ['[data-substep-panel="projects"] .substep-title span', '\u6700\u540e\u628a\u4eae\u70b9\u9879\u76ee\u548c\u6280\u80fd\u8865\u5145\u5b8c\u6574'],
    ['[data-substep-panel="selfeval"] .substep-title h3', '\u81ea\u6211\u8bc4\u4ef7\u3001\u8865\u5145\u6a21\u5757\u4e0e\u81ea\u5b9a\u4e49\u677f\u5757'],
    ['[data-substep-panel="selfeval"] .substep-title span', '\u6700\u540e\u4e00\u6b65\uff0c\u5c55\u73b0\u4f60\u7684\u4f18\u52bf\u548c\u4e2a\u4eba\u7279\u70b9'],
    // Step 1 section headings
    ['[data-substep-panel="projects"] > h3:nth-of-type(1)', '\u9879\u76ee\u7ecf\u5386'],
    ['[data-substep-panel="projects"] > h3:nth-of-type(2)', '\u4ece\u672c\u5730\u9879\u76ee\u5bfc\u5165'],
    ['[data-substep-panel="projects"] > h3:nth-of-type(3)', '\u4e13\u4e1a\u6280\u80fd'],
    ['[data-substep-panel="projects"] > h3:nth-of-type(4)', '\u5176\u4ed6\u4fe1\u606f'],
    ['[data-substep-panel="basic"] > h3:nth-of-type(1)', '\u8865\u5145\u6750\u6599'],
    ['[data-substep-panel="selfeval"] > h3:nth-of-type(1)', '\u81ea\u6211\u8bc4\u4ef7'],
    ['[data-substep-panel="selfeval"] > h3:nth-of-type(2)', '\u81ea\u5b9a\u4e49\u6a21\u5757'],
    // AI assist panels
    ['[data-substep-panel="work"] .ai-assist-panel > div > span:nth-child(2)', 'AI \u5e2e\u4f60\u6da6\u8272\u5de5\u4f5c\u7ecf\u5386'],
    ['[data-substep-panel="work"] .ai-assist-panel > div > span:nth-child(3)', '\u63cf\u8ff0\u4f60\u505a\u4e86\u4ec0\u4e48\uff0c\u6211\u6765\u5e2e\u4f60\u6574\u7406\u6210\u66f4\u9002\u5408\u7b80\u5386\u7684\u8868\u8ff0\u3002'],
    ['[data-substep-panel="work"] .ai-assist-panel .btn-primary', '\u751f\u6210\u7b80\u5386\u63cf\u8ff0'],
    ['[data-substep-panel="projects"] .ai-assist-panel > div > span:nth-child(2)', 'AI \u5e2e\u4f60\u6574\u7406\u9879\u76ee\u4eae\u70b9'],
    ['[data-substep-panel="projects"] .ai-assist-panel > div > span:nth-child(3)', '\u5148\u5199\u81ea\u7136\u8bed\u8a00\u63cf\u8ff0\uff0c\u518d\u8f6c\u6362\u6210\u7b80\u5386\u8868\u8ff0\u3002'],
    ['[data-substep-panel="projects"] .ai-assist-panel .btn-primary', '\u751f\u6210\u9879\u76ee\u63cf\u8ff0'],
    ['[data-substep-panel="selfeval"] .ai-assist-panel > div > span:nth-child(2)', 'AI \u5e2e\u4f60\u751f\u6210\u81ea\u6211\u8bc4\u4ef7'],
    ['[data-substep-panel="selfeval"] .ai-assist-panel > div > span:nth-child(3)', '\u6839\u636e\u4f60\u5df2\u586b\u5199\u7684\u4fe1\u606f\uff0c\u81ea\u52a8\u751f\u6210\u4e00\u6bb5\u4e13\u4e1a\u7684\u81ea\u6210\u8bc4\u4ef7'],
    // Step 5 content phase
    ['#step5 #contentPhase > div:first-of-type > div:first-child > h3', '\u7b2c\u4e00\u9636\u6bb5\uff1a\u5148\u9009\u6a21\u677f\uff0c\u518d\u751f\u6210\u5185\u5bb9'],
    ['#step5 #contentPhase > div:first-of-type > div:first-child > p', '\u73b0\u5728\u4e0d\u4f1a\u81ea\u52a8\u751f\u6210\u7b80\u5386\u3002\u4f60\u53ef\u4ee5\u5148\u9009\u62e9\u6a21\u677f\u98ce\u683c\uff0c\u518d\u70b9\u51fb\u5f00\u59cb\u751f\u6210\uff1b\u5982\u679c\u60f3\u5c1d\u8bd5\u5176\u4ed6\u6a21\u677f\uff0c\u70b9\u51fb\u201c\u91cd\u65b0\u751f\u6210\u201d\u5373\u53ef\u3002'],
    ['#step5 .resume-panel-header h3', '\u6a21\u677f\u5de5\u4f5c\u53f0'],
    ['#step5 .resume-panel-header p', '\u9ed8\u8ba4\u6a21\u677f\u5df2\u7ecf\u6309\u4f60\u4e0a\u4f20\u7684 PDF \u98ce\u683c\u91cd\u505a\u3002\u4f60\u4e5f\u53ef\u4ee5\u4e0a\u4f20\u65b0\u7684\u6a21\u677f\u6587\u4ef6\uff0c\u5feb\u901f\u5c1d\u8bd5\u4e0d\u540c\u6392\u7248\u3002'],
    // Step 5 template phase
    ['#templatePhase .resume-phase-intro h3', '\u7b2c\u4e8c\u9636\u6bb5\uff1a\u786e\u8ba4\u6a21\u677f\u5e76\u5bfc\u51fa'],
    ['#templatePhase .resume-phase-intro p', '\u8fd9\u91cc\u53ef\u4ee5\u7ee7\u7eed\u5207\u6362\u6a21\u677f\uff0c\u5bfc\u51fa\u7684 PDF / DOC \u4f1a\u76f4\u63a5\u4f7f\u7528\u5f53\u524d\u6a21\u677f\u6837\u5f0f\u3002\u9ed8\u8ba4\u6a21\u677f\u5df2\u7ecf\u6309\u4f60\u4e0a\u4f20\u7684 PDF \u7ed3\u6784\u91cd\u505a\u3002'],
    // Step 7 job search config
    ['#jobPlatformConfig > summary', '\u641c\u7d22\u8bbe\u7f6e'],
    ['#jobPlatformConfig > div > div:first-child', '\u641c\u7d22\u5e73\u53f0\uff08\u62d6\u62fd\u8c03\u6574\u987a\u5e8f\uff09'],
    // Step 9 interview
    ['#interviewSetup > p:first-of-type', '\u51c6\u5907\u597d\u4e86\u5417\uff1f\u70b9\u51fb\u5f00\u59cb\u8fdb\u5165\u6a21\u62df\u9762\u8bd5\u3002\u6bcf\u9053\u9898\u4f60\u53ef\u4ee5\u9009\u62e9\u81ea\u5df1\u56de\u7b54\uff08\u83b7\u5f97\u8bc4\u5206+\u53cd\u9988+\u53c2\u8003\u56de\u7b54\uff09\u6216\u76f4\u63a5\u770b\u53c2\u8003\u56de\u7b54\u3002'],
    ['#questionSourceSelector h3', '\u9898\u76ee\u6765\u6e90\u9009\u62e9'],
    ['#questionSourceSelector > p', '\u9009\u62e9\u9762\u8bd5\u9898\u76ee\u7684\u6765\u6e90\uff0c\u53ef\u591a\u9009\u3002\u5168\u90e8\u4e0d\u9009\u5219\u8868\u793a\u4e0d\u9650\u6765\u6e90\u3002'],
    // Tracker section
    ['#trackerSection > div:first-child .btn', '+ \u6dfb\u52a0\u7533\u8bf7'],
    ['#trackerEmpty p:first-of-type', '\u8fd8\u6ca1\u6709\u7533\u8bf7\u8bb0\u5f55'],
    ['#trackerEmpty p:last-of-type', '\u70b9\u51fb\u4e0a\u65b9\u201c\u6dfb\u52a0\u7533\u8bf7\u201d\u5f00\u59cb\u8ddf\u8e2a\u4f60\u7684\u6c42\u804c\u8fdb\u5ea6'],
    // Processing status messages
    ['.ai-assist-status span', '\u6b63\u5728\u751f\u6210...'],
    ['#folderAnalysis span', '\u6b63\u5728\u5206\u6790\u9879\u76ee\u5185\u5bb9...'],
    ['#resumeLoading span', '\u6b63\u5728\u751f\u6210\u7b80\u5386...'],
    ['#matchLoading span', '\u6b63\u5728\u5206\u6790\u4f60\u7684\u804c\u4e1a\u65b9\u5411...'],
    ['#jobLoading span', '\u6b63\u5728\u641c\u7d22\u62db\u8058\u4fe1\u606f...'],
    ['#optimizeLoading span', '\u6b63\u5728\u4f18\u5316\u7b80\u5386...'],
    ['#resumeChatStatus span', 'AI \u6b63\u5728\u4fee\u6539...'],
    // File upload zones
    ['#fileDropZone p:first-of-type', '\u62d6\u62fd\u6587\u4ef6\u5230\u8fd9\u91cc\uff0c\u6216\u70b9\u51fb\u9009\u62e9\u6587\u4ef6'],
    ['#fileDropZone p:last-of-type', '\u652f\u6301 .txt / .md / .pdf / .docx / .rtf / .html'],
    // Project folder import
    ['#folderImportArea p', '\u652f\u6301 Chrome / Edge\u3002\u5176\u4ed6\u6d4f\u89c8\u5668\u53ef\u4ee5\u5148\u4e0a\u4f20 ZIP\u3002'],
    ['#responsibilitySelector > label', '\u9009\u62e9\u8981\u5728\u7b80\u5386\u91cc\u7a81\u51fa\u5c55\u793a\u7684\u8d21\u732e\uff1a'],
    // Step model bar labels
    ['.step-model-bar > span:first-child', '\u672c\u6b65\u9aa4 AI \u6a21\u578b\uff1a']
  ];
  textMap.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach(function(el) {
      el.textContent = value;
    });
  });
  document.querySelectorAll('.step-dot .label').forEach((el, index) => {
    const labels = ['\u7b80\u5386\u5185\u5bb9', '\u7b80\u5386\u751f\u6210', '\u5c97\u4f4d\u5339\u914d', '\u804c\u4f4d\u641c\u7d22', '\u7b80\u5386\u4f18\u5316', '\u6a21\u62df\u9762\u8bd5'];
    if (labels[index]) el.textContent = labels[index];
  });
  document.querySelectorAll('.step-overview-item .text').forEach((el, index) => {
    const labels = ['\u57fa\u7840\u4fe1\u606f\u4e0e\u8865\u5145\u6750\u6599', '\u6559\u80b2\u80cc\u666f', '\u5de5\u4f5c\u7ecf\u5386', '\u9879\u76ee\u3001\u6280\u80fd\u4e0e\u5176\u4ed6\u4fe1\u606f', '\u81ea\u6211\u8bc4\u4ef7\u4e0e\u8865\u5145'];
    if (labels[index]) el.textContent = labels[index];
  });
  document.querySelectorAll('.substep-chip').forEach((el) => {
    const mapping = {
      basic: '1. \u57fa\u7840\u4fe1\u606f',
      education: '2. \u6559\u80b2\u80cc\u666f',
      work: '3. \u5de5\u4f5c\u7ecf\u5386',
      projects: '4. \u9879\u76ee\u4e0e\u6280\u80fd',
      selfeval: '5. \u81ea\u6211\u8bc4\u4ef7'
    };
    if (mapping[el.dataset.substep]) el.textContent = mapping[el.dataset.substep];
  });
  const placeholderMap = {
    f_name: '\u4f60\u7684\u59d3\u540d', f_contact: '\u624b\u673a\u53f7 / \u90ae\u7bb1', f_target: '\u4f8b\u5982\uff1a\u9ad8\u7ea7\u540e\u7aef\u5f00\u53d1\u5de5\u7a0b\u5e08', f_city: '\u4f8b\u5982\uff1a\u5317\u4eac\u3001\u4e0a\u6d77\u3001\u676d\u5dde\uff08\u53ef\u591a\u586b\uff09', f_hometown: '\u4f8b\u5982\uff1a\u5e7f\u4e1c\u6df1\u5733', f_birth: '\u4f8b\u5982\uff1a1998.06\uff08\u53ef\u9009\uff09', f_links: 'GitHub / \u535a\u5ba2 / LinkedIn \u94fe\u63a5', f_summary: '\u4f8b\u5982\uff1a3 \u5e74\u540e\u7aef\u5f00\u53d1\u7ecf\u9a8c\uff0c\u719f\u6089 Java\u3001\u5fae\u670d\u52a1\u548c\u9ad8\u5e76\u53d1\u7cfb\u7edf\u4f18\u5316\u3002',
    f_school: '\u4f8b\u5982\uff1a\u67d0\u67d0\u5927\u5b66', f_major: '\u4f8b\u5982\uff1a\u8ba1\u7b97\u673a\u79d1\u5b66\u4e0e\u6280\u672f', f_edu_time: '\u4f8b\u5982\uff1a2017.09 - 2021.06', f_gpa: '\u4f8b\u5982\uff1a3.8/4.0\uff0c\u6216\u5217\u51fa 3-5 \u95e8\u6838\u5fc3\u8bfe\u7a0b',
    f_skills_lang: '\u4f8b\u5982\uff1aJava\uff08\u719f\u7ec3\uff09\u3001Python\uff08\u719f\u7ec3\uff09\u3001Go\uff08\u4e86\u89e3\uff09', f_skills_tools: '\u4f8b\u5982\uff1aSpring Boot, Redis, Kubernetes, Docker', f_skills_lang_ability: '\u4f8b\u5982\uff1a\u82f1\u8bed CET-6\uff0c\u53ef\u6d41\u7545\u9605\u8bfb\u82f1\u6587\u6280\u672f\u6587\u6863',
    f_awards: '\u4f8b\u5982\uff1aACM \u533a\u57df\u8d5b\u94f6\u5956\u3001\u56fd\u5bb6\u5956\u5b66\u91d1', f_other: '\u4f8b\u5982\uff1aGitHub 500+ stars \u5f00\u6e90\u9879\u76ee\u4f5c\u8005', f_self_eval: '\u6982\u62ec\u4f60\u7684\u4f18\u52bf\u3001\u9879\u76ee\u98ce\u683c\u3001\u89e3\u51b3\u95ee\u9898\u80fd\u529b\u548c\u5c97\u4f4d\u5339\u914d\u5ea6',
    jobSearchQuery: '\u4f8b\u5982\uff1aJava \u540e\u7aef \u5317\u4eac', jobChoice: '\u8f93\u5165\u4f60\u60f3\u7ee7\u7eed\u5206\u6790\u7684 JD \u7f16\u53f7', matchChoice: '\u8bf7\u8f93\u5165\u7f16\u53f7\uff0c\u4f8b\u5982 1\uff0c\u6216\u544a\u8bc9\u6211\u4f60\u60f3\u6362\u4e2a\u65b9\u5411', resumeChatInput: '\u544a\u8bc9 AI \u600e\u4e48\u4fee\u6539\u8fd9\u4efd\u7b80\u5386...',
    customSourceField: '\u8f93\u5165\u7f51\u9875 URL\uff0c\u4f8b\u5982 https://www.maimai.cn', chatInput: '\u8f93\u5165\u4f60\u7684\u95ee\u9898...', trackerCompany: '\u516c\u53f8\u540d\u79f0', trackerPosition: '\u804c\u4f4d\u540d\u79f0\uff0c\u4f8b\u5982\u540e\u7aef\u5f00\u53d1\u5de5\u7a0b\u5e08', trackerUrl: '\u804c\u4f4d\u94fe\u63a5', trackerNotes: '\u8bb0\u5f55\u5185\u63a8\u3001\u9762\u8bd5\u53cd\u9988\u3001\u85aa\u8d44\u4fe1\u606f\u7b49'
  };
  Object.entries(placeholderMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = value;
  });
  const valueLabelPairs = [
    ['#f_years option[value=""]', '\u8bf7\u9009\u62e9'], ['#f_gender option[value=""]', '\u8bf7\u9009\u62e9'], ['#f_degree option[value=""]', '\u8bf7\u9009\u62e9'], ['#trackerPlatform option[value=""]', '\u8bf7\u9009\u62e9'], ['#trackerStatus option[value="submitted"]', '\u5df2\u6295\u9012'], ['#trackerStatus option[value="resume-passed"]', '\u7b80\u5386\u901a\u8fc7'], ['#trackerStatus option[value="interviewing"]', '\u9762\u8bd5\u4e2d'], ['#trackerStatus option[value="offer"]', '\u5df2\u62ff Offer'], ['#trackerStatus option[value="rejected"]', '\u5df2\u6dd8\u6c70']
  ];
  valueLabelPairs.forEach(([selector, value]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  });
  const textById = {
    btnStartResumeGenerate: '\u5f00\u59cb\u751f\u6210\u7b80\u5386', resumeStartHint: '\u5148\u9009\u62e9\u6a21\u677f\uff0c\u518d\u5f00\u59cb\u751f\u6210\uff1b\u5207\u6362\u6a21\u677f\u540e\u53ef\u70b9\u51fb\u201c\u91cd\u65b0\u751f\u6210\u201d\u5c1d\u8bd5\u4e0d\u540c\u98ce\u683c\u3002', currentTemplateBadge: '\u5f53\u524d\u6a21\u677f\uff1a\u53c2\u8003\u7b80\u5386\u7248', templateUploadStatus: '\u652f\u6301\u4e0a\u4f20 PDF / DOCX / Markdown \u6a21\u677f\uff0c\u4f5c\u4e3a\u751f\u6210\u4e0e\u5bfc\u51fa\u7684\u6392\u7248\u53c2\u8003\u3002', btnTogglePreview: '\u9884\u89c8', btnRegenerateResume: '\u91cd\u65b0\u751f\u6210', exportTemplateSummary: '\u5bfc\u51fa\u5c06\u4f7f\u7528\u5f53\u524d\u6240\u9009\u6a21\u677f\u6837\u5f0f', jobProgressText: '\u51c6\u5907\u641c\u7d22...'
  };
  Object.entries(textById).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const exactTextSelectors = [
    // Step 1 basic substep
    ['[data-substep-panel="basic"] .substep-title h3', '\u57fa\u7840\u4fe1\u606f'],
    ['[data-substep-panel="basic"] .substep-title span', '\u5148\u586b\u5199\u6700\u5f71\u54cd\u7b80\u5386\u6210\u7a3f\u7684\u5173\u952e\u4fe1\u606f'],
    ['[data-substep-panel="basic"] .btn-group .btn-primary', '\u4e0b\u4e00\u5c0f\u6b65 \u2192'],
    // Step 1 education substep buttons
    ['[data-substep-panel="education"] .btn-group .btn-secondary', '\u4e0a\u4e00\u5c0f\u6b65'],
    ['[data-substep-panel="education"] .btn-group .btn-primary', '\u4e0b\u4e00\u5c0f\u6b65 \u2192'],
    // Step 1 work substep buttons
    ['[data-substep-panel="work"] > .btn-group .btn-secondary', '\u4e0a\u4e00\u5c0f\u6b65'],
    ['[data-substep-panel="work"] > .btn-group .btn-primary', '\u4e0b\u4e00\u5c0f\u6b65 \u2192'],
    // Step 1 projects substep buttons
    ['[data-substep-panel="projects"] > .btn-group .btn-secondary', '\u4e0a\u4e00\u5c0f\u6b65'],
    ['[data-substep-panel="projects"] > .btn-group .btn-primary', '\u4e0b\u4e00\u5c0f\u6b65 \u2192'],
    // Step 1 selfeval substep buttons
    ['[data-substep-panel="selfeval"] > .btn-group .btn-secondary', '\u4e0a\u4e00\u5c0f\u6b65'],
    ['[data-substep-panel="selfeval"] > .btn-group .btn-primary', '\u751f\u6210\u7b80\u5386 \u2192'],
    // Step 1 add buttons
    ['[data-substep-panel="basic"] .btn-outline', '+ \u6dfb\u52a0\u81ea\u5b9a\u4e49\u4fe1\u606f\u9879\uff08\u5982\u653f\u6cbb\u9762\u8c8c\u3001\u6c11\u65cf\u7b49\uff09'],
    ['[data-substep-panel="work"] > .btn-outline', '+ \u6dfb\u52a0\u66f4\u591a\u5de5\u4f5c\u7ecf\u5386'],
    ['#projectFields + .btn-outline', '+ \u6dfb\u52a0\u66f4\u591a\u9879\u76ee'],
    // Step 1 folder import buttons
    ['#folderImportArea .btn-outline', '\u9009\u62e9\u9879\u76ee\u6587\u4ef6\u5939'],
    ['#folderImportArea .btn-secondary', '\u6216\u4e0a\u4f20 ZIP \u6587\u4ef6'],
    ['#folderImportArea p', '\u652f\u6301 Chrome / Edge\u3002\u5176\u4ed6\u6d4f\u89c8\u5668\u53ef\u4ee5\u5148\u4e0a\u4f20 ZIP\u3002'],
    ['[data-substep-panel="projects"] > p', '\u9009\u62e9\u672c\u5730\u9879\u76ee\u6587\u4ef6\u5939\u540e\uff0cAI \u4f1a\u5e2e\u4f60\u603b\u7ed3\u503c\u5f97\u5199\u8fdb\u7b80\u5386\u7684\u8d21\u732e\u70b9\u3002'],
    // Step 1 responsibility selector buttons
    ['#responsibilitySelector .btn-secondary', '\u6e05\u7a7a'],
    ['#responsibilitySelector .btn-primary', '\u5e94\u7528\u5230\u9879\u76ee\u7ecf\u5386'],
    // Step 1 work substep details summary - fix first text node to preserve child span
    ['[data-substep-panel="work"] details span:first-of-type', '(\u8bc1\u4e66 / \u4f5c\u54c1 / \u8bf4\u660e\u6587\u6863)'],
    ['[data-substep-panel="selfeval"] > .btn-outline', '+ \u6dfb\u52a0\u81ea\u5b9a\u4e49\u6a21\u5757'],
    // Step 1 work entry labels
    ['.work-entry .form-group:nth-child(1) label', '\u516c\u53f8\u540d\u79f0'],
    ['.work-entry .form-group:nth-child(2) label', '\u804c\u4f4d'],
    ['.work-entry .form-group:nth-child(3) label', '\u5de5\u4f5c\u65f6\u95f4'],
    ['.work-entry .form-group:nth-child(4) label', '\u6838\u5fc3\u6210\u5c31'],
    // Step 1 project entry labels
    ['.project-entry .form-group:nth-child(1) label', '\u9879\u76ee\u540d\u79f0'],
    ['.project-entry .form-group:nth-child(2) label', '\u4f60\u7684\u89d2\u8272'],
    ['.project-entry .form-group:nth-child(3) label', '\u6280\u672f\u6808'],
    ['.project-entry .form-group:nth-child(4) label', '\u4f60\u7684\u8d21\u732e'],
    // Step 1 self-eval description paragraphs
    ['[data-substep-panel="selfeval"] > p:first-of-type', '\u7528 2-4 \u53e5\u8bdd\u603b\u7ed3\u4f60\u7684\u6838\u5fc3\u7ade\u4e89\u529b\u3001\u804c\u4e1a\u6001\u5ea6\u3001\u5bf9\u76ee\u6807\u5c97\u4f4d\u7684\u70ed\u60c5\u3002\u597d\u7684\u81ea\u6211\u8bc4\u4ef7\u80fd\u8ba9 HR \u5feb\u901f\u4e86\u89e3\u4f60\u3002'],
    ['[data-substep-panel="selfeval"] > p:nth-of-type(2)', '\u4f60\u53ef\u4ee5\u6dfb\u52a0\u4efb\u4f55\u60f3\u5728\u7b80\u5386\u4e2d\u5c55\u793a\u7684\u6a21\u5757\uff1a\u8bc1\u4e66\u8d44\u8d28\u3001\u57f9\u8bad\u7ecf\u5386\u3001\u793e\u4f1a\u6d3b\u52a8\u3001\u5fd7\u613f\u670d\u52a1\u3001\u4e13\u5229\u7b49\u3002'],
    // Step 5 content phase
    ['#step5 #contentPhase .resume-phase-intro h3', '\u7b2c\u4e00\u9636\u6bb5\uff1a\u5148\u9009\u6a21\u677f\uff0c\u518d\u751f\u6210\u5185\u5bb9'],
    ['#step5 #contentPhase .resume-phase-intro p', '\u73b0\u5728\u4e0d\u4f1a\u81ea\u52a8\u751f\u6210\u7b80\u5386\u3002\u4f60\u53ef\u4ee5\u5148\u9009\u62e9\u6a21\u677f\u98ce\u683c\uff0c\u518d\u70b9\u51fb\u5f00\u59cb\u751f\u6210\uff1b\u5982\u679c\u60f3\u5c1d\u8bd5\u5176\u4ed6\u6a21\u677f\uff0c\u70b9\u51fb\u201c\u91cd\u65b0\u751f\u6210\u201d\u5373\u53ef\u3002'],
    ['#step5 .resume-toolbar .btn:nth-child(3)', '\u590d\u5236 Markdown'],
    ['#step5 .resume-toolbar .btn-primary', '\u786e\u8ba4\u5185\u5bb9\uff0c\u8fdb\u5165\u5bfc\u51fa \u2192'],
    // Step 5 AI chat label
    ['#contentPhase > div:nth-of-type(6) > div:first-child > span:nth-child(2)', '\u8ba9 AI \u4fee\u6539\u7b80\u5386'],
    ['#contentPhase > div:nth-of-type(6) > div:first-child > span:nth-child(3)', '\u4f8b\u5982\uff1a\u201c\u628a\u5de5\u4f5c\u7ecf\u5386\u5199\u5f97\u66f4\u91cf\u5316\u201d\u3001\u201c\u5220\u9664\u7b2c\u4e8c\u4e2a\u9879\u76ee\u201d\u3001\u201c\u5728\u6280\u80fd\u91cc\u52a0\u4e0a Docker\u201d'],
    ['#contentPhase > div:nth-of-type(6) .btn-primary', '\u53d1\u9001'],
    // Step 5 resume area labels (generation section header)
    ['#contentPhase > div:nth-of-type(3) > span:nth-child(2)', '\u7b2c\u4e00\u9636\u6bb5\uff1a\u751f\u6210\u5185\u5bb9'],
    ['#contentPhase > div:nth-of-type(3) > span:nth-child(3)', 'AI \u751f\u6210\u521d\u7a3f \u2192 \u4f60\u7f16\u8f91 \u2192 \u5bf9\u8bdd\u4fee\u6539 \u2192 \u6ee1\u610f\u540e\u8fdb\u5165\u6392\u7248'],
    // Step 5 upload template button
    ['#contentPhase .template-status-row .btn-outline', '\u4e0a\u4f20\u6a21\u677f\u6587\u4ef6'],
    // Step 5 template phase
    ['#templatePhase .btn-group .btn-secondary', '\u8fd4\u56de\u7f16\u8f91\u5185\u5bb9'],
    ['#templatePhase .btn-group .btn-primary', '\u786e\u8ba4\uff0c\u4e0b\u4e00\u6b65 \u2192'],
    // Step 7 job search
    ['#jobPlatformConfig > summary', '\u641c\u7d22\u8bbe\u7f6e'],
    ['#jobPlatformConfig > div > div:first-child', '\u641c\u7d22\u5e73\u53f0\uff08\u62d6\u62fd\u8c03\u6574\u987a\u5e8f\uff09'],
    // Step 6 confirm match button
    ['#matchResult .btn-primary', '\u786e\u8ba4\u9009\u62e9 \u2192'],
    // Step 7 confirm job button
    ['#jobResult .btn-primary', '\u786e\u8ba4\u9009\u62e9 \u2192'],
    // Step 7 cancel search button
    ['#jobProgressPanel .btn-secondary', '\u53d6\u6d88\u641c\u7d22'],
    // Step 8 enter interview button
    ['#step8 .btn-success', '\u8fdb\u5165\u6a21\u62df\u9762\u8bd5'],
    // Step 9 interview buttons
    ['#answerInputArea .btn-primary', '\u63d0\u4ea4\u56de\u7b54'],
    ['#answerInputArea .btn-secondary', '\u53d6\u6d88'],
    ['#interviewSummary .btn-primary', '\u91cd\u65b0\u5f00\u59cb'],
    // Step 7 skip job confirm
    ['#skipJobConfirm p', '\u5df2\u8df3\u8fc7\u804c\u4f4d\u641c\u7d22\uff0c\u5c06\u57fa\u4e8e\u4f60\u9009\u62e9\u7684\u65b9\u5411\u8fdb\u884c\u7b80\u5386\u4f18\u5316\u3002'],
    ['#skipJobConfirm .btn-primary', '\u8fdb\u5165\u7b80\u5386\u4f18\u5316'],
    // Step 7 main buttons
    ['button[onclick="skipJobSearch()"]', '\u8df3\u8fc7'],
    ['button[onclick="searchJobs()"]', '\u641c\u7d22\u804c\u4f4d'],
    // Step 9 end interview button
    ['button[onclick="endInterview()"]', '\u7ed3\u675f\u9762\u8bd5'],
    // Step 9 interview
    ['#interviewSetup > p:first-of-type', '\u51c6\u5907\u597d\u4e86\u5417\uff1f\u70b9\u51fb\u5f00\u59cb\u8fdb\u5165\u6a21\u62df\u9762\u8bd5\u3002\u6bcf\u9053\u9898\u4f60\u53ef\u4ee5\u9009\u62e9\u81ea\u5df1\u56de\u7b54\uff08\u83b7\u5f97\u8bc4\u5206+\u53cd\u9988+\u53c2\u8003\u56de\u7b54\uff09\u6216\u76f4\u63a5\u770b\u53c2\u8003\u56de\u7b54\u3002'],
    ['#questionSourceSelector h3', '\u9898\u76ee\u6765\u6e90\u9009\u62e9'],
    ['#questionSourceSelector > p', '\u9009\u62e9\u9762\u8bd5\u9898\u76ee\u7684\u6765\u6e90\uff0c\u53ef\u591a\u9009\u3002\u5168\u90e8\u4e0d\u9009\u5219\u8868\u793a\u4e0d\u9650\u6765\u6e90\u3002'],
    // Step 9 buttons
    ['#btnAnswerSelf', '\u81ea\u5df1\u56de\u7b54'],
    ['#btnShowRef', '\u770b\u53c2\u8003\u56de\u7b54'],
    ['#interviewSetup .btn', '\u5f00\u59cb\u9762\u8bd5'],
    // Tracker
    ['#trackerForm .btn-secondary', '\u53d6\u6d88'],
    ['#trackerForm .btn-primary', '\u4fdd\u5b58'],
    // Self-eval AI button
    ['[data-substep-panel="selfeval"] .ai-assist-panel .btn-primary', '\u751f\u6210\u81ea\u6211\u8bc4\u4ef7'],
    // Step 1 folder import
    ['[data-substep-panel="projects"] > details > summary', '\u4e0a\u4f20\u8865\u5145\u6750\u6599'],
    ['#folderImportArea > p', '\u9009\u62e9\u672c\u5730\u9879\u76ee\u6587\u4ef6\u5939\u540e\uff0cAI \u4f1a\u5e2e\u4f60\u603b\u7ed3\u503c\u5f97\u5199\u8fdb\u7b80\u5386\u7684\u8d21\u732e\u70b9\u3002'],
    // Step 5 export panel
    ['#step5 #contentPhase .resume-panel-header h3', '\u6a21\u677f\u5de5\u4f5c\u53f0'],
    ['#step5 #contentPhase .resume-panel-header p', '\u9ed8\u8ba4\u6a21\u677f\u5df2\u7ecf\u6309\u4f60\u4e0a\u4f20\u7684 PDF \u98ce\u683c\u91cd\u505a\u3002\u4f60\u4e5f\u53ef\u4ee5\u4e0a\u4f20\u65b0\u7684\u6a21\u677f\u6587\u4ef6\uff0c\u5feb\u901f\u5c1d\u8bd5\u4e0d\u540c\u6392\u7248\u3002'],
    ['#templatePhase .resume-phase-intro h3', '\u7b2c\u4e8c\u9636\u6bb5\uff1a\u786e\u8ba4\u6a21\u677f\u5e76\u5bfc\u51fa'],
    ['#templatePhase .resume-phase-intro p', '\u8fd9\u91cc\u53ef\u4ee5\u7ee7\u7eed\u5207\u6362\u6a21\u677f\uff0c\u5bfc\u51fa\u7684 PDF / DOC \u4f1a\u76f4\u63a5\u4f7f\u7528\u5f53\u524d\u6a21\u677f\u6837\u5f0f\u3002\u9ed8\u8ba4\u6a21\u677f\u5df2\u7ecf\u6309\u4f60\u4e0a\u4f20\u7684 PDF \u7ed3\u6784\u91cd\u505a\u3002'],
    // Step 5 resume area labels
    ['#contentPhase > div:nth-of-type(2) > span:nth-child(1)', '\u7b2c\u4e00\u9636\u6bb5\uff1a\u751f\u6210\u5185\u5bb9'],
    ['#contentPhase > div:nth-of-type(2) > span:nth-child(2)', 'AI \u751f\u6210\u521d\u7a3f \u2192 \u4f60\u7f16\u8f91 \u2192 \u5bf9\u8bdd\u4fee\u6539 \u2192 \u6ee1\u610f\u540e\u8fdb\u5165\u6392\u7248'],
    // Tracker form labels
    ['#trackerForm .form-group:nth-child(1) label', '\u516c\u53f8\u540d\u79f0'],
    ['#trackerForm .form-group:nth-child(2) label', '\u804c\u4f4d'],
    ['#trackerForm .form-group:nth-child(3) label', '\u62db\u8058\u5e73\u53f0'],
    ['#trackerForm .form-group:nth-child(4) label', '\u7533\u8bf7\u72b6\u6001'],
    ['#trackerForm .form-group:nth-child(5) label', '\u804c\u4f4d\u94fe\u63a5'],
    ['#trackerForm .form-group:nth-child(6) label', '\u5907\u6ce8'],
  ];
  exactTextSelectors.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach(function(el) {
      el.textContent = value;
    });
  });

  // Fix form labels by walking inputs and setting their associated label text
  const inputLabelMap = {
    f_name: '\u59d3\u540d', f_contact: '\u8054\u7cfb\u65b9\u5f0f',
    f_target: '\u76ee\u6807\u5c97\u4f4d', f_years: '\u5de5\u4f5c\u5e74\u9650',
    f_city: '\u610f\u5411\u5de5\u4f5c\u5730', f_hometown: '\u7c4d\u8d2f',
    f_birth: '\u51fa\u751f\u5e74\u6708', f_gender: '\u6027\u522b',
    f_links: '\u4e2a\u4eba\u4e3b\u9875', f_summary: '\u4e2a\u4eba\u7b80\u4ecb',
    f_school: '\u5b66\u6821\u540d\u79f0', f_degree: '\u5b66\u5386',
    f_major: '\u4e13\u4e1a', f_edu_time: '\u5c31\u8bfb\u65f6\u95f4',
    f_gpa: 'GPA / \u6838\u5fc3\u8bfe\u7a0b',
    f_skills_lang: '\u7f16\u7a0b\u8bed\u8a00', f_skills_tools: '\u6846\u67b6\u4e0e\u5de5\u5177',
    f_skills_lang_ability: '\u8bed\u8a00\u80fd\u529b', f_awards: '\u83b7\u5956 / \u7ade\u8d5b',
    f_other: '\u5176\u4ed6', f_self_eval: '\u81ea\u6211\u8bc4\u4ef7',
    jobSearchQuery: '\u641c\u7d22\u5173\u952e\u8bcd', jobChoice: '\u9009\u62e9\u804c\u4f4d',
    matchChoice: '\u4f60\u7684\u9009\u62e9', chatInput: '\u8f93\u5165\u4f60\u7684\u56de\u7b54...',
    trackerCompany: '\u516c\u53f8\u540d\u79f0', trackerPosition: '\u804c\u4f4d',
    trackerPlatform: '\u62db\u8058\u5e73\u53f0', trackerStatus: '\u7533\u8bf7\u72b6\u6001',
    trackerUrl: '\u804c\u4f4d\u94fe\u63a5', trackerNotes: '\u5907\u6ce8',
    existingResumeInput: '\u8bf7\u7c98\u8d34\u4f60\u7684\u7b80\u5386\u5185\u5bb9',
    jobResultsPerPlatform: '\u6bcf\u4e2a\u5e73\u53f0\u7ed3\u679c\u6570'
  };
  Object.entries(inputLabelMap).forEach(([inputId, labelText]) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;
    const label = formGroup.querySelector('label');
    if (!label) return;
    for (let i = 0; i < label.childNodes.length; i++) {
      const node = label.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = labelText;
        return;
      }
    }
    label.insertBefore(document.createTextNode(labelText), label.firstChild);
  });

  // Fix *required markers
  document.querySelectorAll('label > span[style*="E74C3C"]').forEach(function(span) {
    span.textContent = '*\u5fc5\u586b';
  });
  // Fix (optional) markers
  document.querySelectorAll('label .optional').forEach(function(span) {
    var raw = span.textContent;
    if (raw.indexOf('\uff08') > -1 || raw.indexOf('(') > -1) {
      span.textContent = '(\u53ef\u9009)';
    }
  });
  // Fix step model bar labels
  document.querySelectorAll('.step-model-bar > span:first-child').forEach(function(span) {
    span.textContent = '\u672c\u6b65\u9aa4 AI \u6a21\u578b\uff1a';
  });

  // Fix select option texts
  var selectOptionsMap = {
    f_years: ['\u5e94\u5c4a\u751f', '1-3\u5e74', '3-5\u5e74', '5-10\u5e74', '10\u5e74\u4ee5\u4e0a'],
    f_gender: ['\u7537', '\u5973'],
    f_degree: ['\u535a\u58eb', '\u7855\u58eb', '\u672c\u79d1', '\u5927\u4e13']
  };
  Object.entries(selectOptionsMap).forEach(function(entry) {
    var selectId = entry[0];
    var texts = entry[1];
    var select = document.getElementById(selectId);
    if (!select) return;
    var options = select.querySelectorAll('option');
    options.forEach(function(opt, idx) {
      if (opt.value === '') return; // skip empty value option
      var textIdx = idx - 1; // first real option maps to texts[0]
      if (textIdx >= 0 && textIdx < texts.length) {
        opt.textContent = texts[textIdx];
      }
    });
  });

  // Fix tracker select option texts
  var trackerStatusEl = document.getElementById('trackerStatus');
  if (trackerStatusEl) {
    var statusLabels = ['\u5df2\u6295\u9012', '\u7b80\u5386\u901a\u8fc7', '\u9762\u8bd5\u4e2d', '\u5df2 Offer', '\u5df2\u62d2\u7edd'];
    trackerStatusEl.querySelectorAll('option').forEach(function(opt, idx) {
      if (opt.value === '') return;
      if (idx < statusLabels.length) opt.textContent = statusLabels[idx];
    });
  }

  // Fix "\u8865\u5145\u6750\u6599" h3 in basic substep
  var basicSubstep = document.querySelector('[data-substep-panel="basic"]');
  if (basicSubstep) {
    var h3s = basicSubstep.querySelectorAll(':scope > h3');
    h3s.forEach(function(h3) {
      var text = h3.textContent || '';
      // Match garbled "\u8865\u5145\u6750\u6599"
      if (text.indexOf('\u741b') > -1 || text.indexOf('\u9356') > -1 || text.indexOf('\u93c9') > -1) {
        for (var j = 0; j < h3.childNodes.length; j++) {
          var node = h3.childNodes[j];
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = '\u8865\u5145\u6750\u6599 ';
            return;
          }
        }
        h3.insertBefore(document.createTextNode('\u8865\u5145\u6750\u6599 '), h3.firstChild);
      }
    });
    // Fix the file upload label
    var labels = basicSubstep.querySelectorAll('.form-group label');
    labels.forEach(function(lbl) {
      if (lbl.textContent && lbl.textContent.indexOf('\u6d93') > -1) {
        for (var k = 0; k < lbl.childNodes.length; k++) {
          var n = lbl.childNodes[k];
          if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
            n.textContent = '\u4e0a\u4f20\u6210\u7ee9\u5355\u3001\u8bc1\u4e66\u3001\u4f5c\u54c1\u8bf4\u660e\u7b49\u8865\u5145\u4fe1\u606f';
            return;
          }
        }
      }
    });
    // Fix (\u53ef\u9009) span inside "\u8865\u5145\u6750\u6599"
    var h3spans = basicSubstep.querySelectorAll(':scope > h3 span');
    h3spans.forEach(function(span) {
      if (span.textContent && (span.textContent.indexOf('\u9359') > -1 || span.textContent.indexOf('\u20ac') > -1)) {
        span.textContent = '(\u53ef\u9009)';
      }
    });
  }

  // Fix work entry labels in work substep
  var workSubstep = document.querySelector('[data-substep-panel="work"]');
  if (workSubstep) {
    var workLabels = workSubstep.querySelectorAll('.work-entry .form-group label');
    var workLabelTexts = ['\u516c\u53f8\u540d\u79f0', '\u804c\u4f4d', '\u5de5\u4f5c\u65f6\u95f4', '\u6838\u5fc3\u6210\u5c31'];
    workLabels.forEach(function(lbl, idx) {
      if (idx < workLabelTexts.length) {
        for (var n = 0; n < lbl.childNodes.length; n++) {
          var node = lbl.childNodes[n];
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = workLabelTexts[idx];
            return;
          }
        }
      }
    });
  }

  // Fix interview source checkbox labels
  var sourceList = document.getElementById('sourceList');
  if (sourceList) {
    var sourceLabels = sourceList.querySelectorAll('label');
    var sourceTexts = ['牛客网', '力扣/LeetCode', 'BOSS 直聘面经', '知乎面经', '自定义来源'];
    sourceLabels.forEach(function(lbl, idx) {
      if (idx < sourceTexts.length) {
        for (var n = 0; n < lbl.childNodes.length; n++) {
          var node = lbl.childNodes[n];
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = ' ' + sourceTexts[idx];
            return;
          }
        }
      }
    });
  }

  // Fix the interview model bar "评估模型" label
  document.querySelectorAll('.step-model-bar span').forEach(function(span) {
    if (span.textContent && (span.textContent.indexOf('璇') > -1 || span.textContent.indexOf('浼') > -1)) {
      span.textContent = '评估模型：';
    }
  });

  // Fix project entry labels in projects substep
  var projSubstep = document.querySelector('[data-substep-panel="projects"]');
  if (projSubstep) {
    var projLabels = projSubstep.querySelectorAll('.project-entry .form-group label');
    var projLabelTexts = ['\u9879\u76ee\u540d\u79f0', '\u4f60\u7684\u89d2\u8272', '\u6280\u672f\u6808', '\u4f60\u7684\u8d21\u732e'];
    projLabels.forEach(function(lbl, idx) {
      if (idx < projLabelTexts.length) {
        for (var n = 0; n < lbl.childNodes.length; n++) {
          var node = lbl.childNodes[n];
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = projLabelTexts[idx];
            return;
          }
        }
      }
    });
  }

  // Fix work substep details summary text (preserve child span)
  var workDetails = document.querySelector('[data-substep-panel="work"] details summary');
  if (workDetails) {
    for (var wd = 0; wd < workDetails.childNodes.length; wd++) {
      var wnode = workDetails.childNodes[wd];
      if (wnode.nodeType === Node.TEXT_NODE && wnode.textContent.trim()) {
        wnode.textContent = '上传补充材料 ';
        break;
      }
    }
    var wspan = workDetails.querySelector('span');
    if (wspan && (wspan.textContent.indexOf('璇') > -1 || wspan.textContent.indexOf('浣') > -1)) {
      wspan.textContent = '(证书 / 作品 / 说明文档)';
    }
  }
  // Fix drag-drop text inside work substep details
  var workDetailsP = document.querySelector('[data-substep-panel="work"] details p');
  if (workDetailsP) { workDetailsP.textContent = '拖拽或点击上传文件'; }

  // Fix garbled emoji spans (馃 → 🤖, 馃摑 → 📝, 馃攧 → 🔄 etc.)
  document.querySelectorAll('span').forEach(function(span) {
    var t = span.textContent || '';
    if (t.indexOf('馃') > -1) {
      if (t.indexOf('') > -1) span.textContent = '🤖';
      else if (t.indexOf('摑') > -1) span.textContent = '📝';
      else if (t.indexOf('攧') > -1) span.textContent = '🔄';
      else if (t.indexOf('帳') > -1) span.textContent = '🎤';
      else if (t.indexOf('攳') > -1) span.textContent = '🔍';
      else span.textContent = '';
    }
  });

  // Fix sidebar nav button first spans (were emojis, now garbled short text)
  var apiNavFirstSpan = document.querySelector('#apiNavItem span:first-child');
  if (apiNavFirstSpan) { apiNavFirstSpan.textContent = '⚙️'; }
  var entryNavFirstSpan = document.querySelector('#entryNavItem span:first-child');
  if (entryNavFirstSpan) { entryNavFirstSpan.textContent = '📋'; }
  var trackerNavFirstSpan = document.querySelector('#trackerNavItem span:first-child');
  if (trackerNavFirstSpan) { trackerNavFirstSpan.textContent = '📊'; }

  // Fix work entry placeholder attributes on class-based inputs
  var workPlaceholders = {
    f_work_company: '公司名称',
    f_work_title: '职位',
    f_work_time: '如：2022.03 - 至今',
    f_work_achievements: '例如：主导订单系统重构，将接口响应时间从 2s 降到 200ms，QPS 提升 10 倍。'
  };
  Object.entries(workPlaceholders).forEach(function(entry) {
    document.querySelectorAll('.' + entry[0]).forEach(function(el) {
      el.placeholder = entry[1];
    });
  });

  // Fix project entry placeholder attributes on class-based inputs
  var projPlaceholders = {
    f_proj_name: '项目名称',
    f_proj_role: '如：技术负责人',
    f_proj_tech: '如：Spring Boot, Redis, Kubernetes',
    f_proj_contribution: '用 STAR 法则描述，尽量量化结果。'
  };
  Object.entries(projPlaceholders).forEach(function(entry) {
    document.querySelectorAll('.' + entry[0]).forEach(function(el) {
      el.placeholder = entry[1];
    });
  });

  // Fix (STAR + 量化结果) spans in work entry labels - rebuild if missing
  var workEntries = document.querySelectorAll('.work-entry');
  workEntries.forEach(function(entry) {
    var optSpan = entry.querySelector('.optional');
    if (!optSpan) {
      // Span was lost during HTML parsing; find the achievement label and rebuild
      var labels = entry.querySelectorAll('.form-group label');
      labels.forEach(function(lbl) {
        var txt = lbl.textContent || '';
        if (txt.indexOf('成就') > -1 || txt.indexOf('鏍') > -1 || txt.indexOf('牳') > -1 || txt.indexOf('鎴') > -1) {
          // Set label text node
          for (var n = 0; n < lbl.childNodes.length; n++) {
            if (lbl.childNodes[n].nodeType === Node.TEXT_NODE && lbl.childNodes[n].textContent.trim()) {
              lbl.childNodes[n].textContent = '核心成就 ';
              break;
            }
          }
          // Add optional span if missing
          if (!lbl.querySelector('.optional')) {
            var span = document.createElement('span');
            span.className = 'optional';
            span.textContent = '(STAR + 量化结果)';
            lbl.appendChild(span);
          }
        }
      });
    } else if (optSpan.textContent.indexOf('STAR') > -1 || optSpan.textContent.indexOf('閲') > -1 || optSpan.textContent.indexOf('噺') > -1) {
      optSpan.textContent = '(STAR + 量化结果)';
    }
  });

  // Fix project entry (可选) spans
  var projEntries = document.querySelectorAll('.project-entry');
  projEntries.forEach(function(entry) {
    var optSpans = entry.querySelectorAll('.optional');
    optSpans.forEach(function(span) {
      if (span.textContent.indexOf('鍙') > -1 || span.textContent.indexOf('€') > -1) {
        span.textContent = '(可选)';
      }
    });
  });

  // Fix AI assist input placeholder text
  var aiInputs = document.querySelectorAll('.ai-assist-input');
  aiInputs.forEach(function(input) {
    if (input.placeholder && (input.placeholder.indexOf('渚') > -1 || input.placeholder.indexOf('緇') > -1)) {
      input.placeholder = '例如：我负责订单系统重构，优化了慢查询，也引入了缓存，整体性能提升很多。';
    }
  });
}