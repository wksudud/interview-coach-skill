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
          <span class="provider-badge preset-tag">\u9884\u8bbe</span>
          <span class="provider-badge ${isActive ? 'active-badge' : 'inactive-badge'}">${isActive ? '\u5f53\u524d\u4f7f\u7528' : '\u70b9\u51fb\u5207\u6362'}</span>
        </div>
        <div class="provider-card-body" onclick="event.stopPropagation()">
          <div class="form-group">
            <label>API \u5730\u5740 <span style="font-weight:400;font-size:10px;color:var(--text-light);">\u53ef\u4fee\u6539</span></label>
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
            <label>\u6a21\u578b</label>
            <select id="model_${p.id}" class="provider-model-select">
              ${p.models.map(m => `<option value="${m}" ${provider.model === m ? 'selected' : ''}>${m}</option>`).join('')}
              <option value="__custom__" ${p.models.includes(provider.model) ? '' : 'selected'}>\u81ea\u5b9a\u4e49\u6a21\u578b...</option>
            </select>
            <input type="text" id="customModel_${p.id}"
                   class="provider-custom-model hidden"
                   placeholder="\u8f93\u5165\u81ea\u5b9a\u4e49\u6a21\u578b\u540d"
                   value="${p.models.includes(provider.model) ? '' : provider.model}" />
          </div>
        </div>
        <div id="status_${p.id}" class="api-test-status"></div>
        <div class="provider-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-outline btn-sm" onclick="testProviderConnectivity('${p.id}')">
            \u6d4b\u8bd5\u8fde\u901a\u6027
          </button>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.provider-model-select').forEach(sel => {
    sel.addEventListener('change', function() {
      const customInput = document.getElementById('customModel_' + this.id.replace('model_', ''));
      if (customInput) {
        customInput.classList.toggle('hidden', this.value !== '__custom__');
        if (this.value !== '__custom__') customInput.value = '';
      }
    });

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
  resumeParse: '\u7b80\u5386\u89e3\u6790',
  resumeGeneration: '\u7b80\u5386\u751f\u6210',
  resumeOptimization: '\u7b80\u5386\u4f18\u5316',
  jobSearch: '\u804c\u4f4d\u641c\u7d22',
  careerMatch: '\u5c97\u4f4d\u5339\u914d',
  interviewQuestion: '\u9762\u8bd5\u51fa\u9898',
  interviewEval: '\u56de\u7b54\u8bc4\u4f30'
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
    defOpt.textContent = `\u9ed8\u8ba4 (${activeProvider ? activeProvider.name + ' \u00b7 ' + activeProvider.model : '\u672a\u914d\u7f6e'})`;
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
      return `<div class="chat-msg interviewer"><div class="role-label">\uD83C\uDFA4 \u9762\u8BD5\u5B98</div><div>${marked2(msg.content)}</div></div>`;
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
    : '\u6682\u65e0\u8bc4\u5206';
  document.getElementById('questionCounter').textContent = `\u5df2\u7b54 ${state.interviewQA.length} \u9898 | \u5e73\u5747\u5206\uff1a${avg}`;
}

// ===================== Application Tracker UI =====================
const STATUS_LABELS = {
  'submitted': '\u5df2\u6295\u9012',
  'resume-passed': '\u7b80\u5386\u901a\u8fc7',
  'interviewing': '\u9762\u8bd5\u4e2d',
  'offer': '\u5df2\u83b7 Offer',
  'rejected': '\u5df2\u62d2\u7edd'
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
    '<div class="summary-item"><div class="value">' + total + '</div><div class="label">\u603B\u8BA1</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['submitted'] || 0) + '</div><div class="label">\u5DF2\u6295\u9012</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['resume-passed'] || 0) + '</div><div class="label">\u7B80\u5386\u901A\u8FC7</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['interviewing'] || 0) + '</div><div class="label">\u9762\u8BD5\u4E2D</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['offer'] || 0) + '</div><div class="label">\u5DF2\u83B7 Offer</div></div>' +
    '<div class="summary-item"><div class="value">' + (byStatus['rejected'] || 0) + '</div><div class="label">\u5DF2\u62D2\u7EDD</div></div>' +
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

  const textBySelector = [
    ['.header h1', 'AI \u6c42\u804c\u5168\u6d41\u7a0b\u52a9\u624b'],
    ['.header p', '\u4ece\u7b80\u5386\u751f\u6210\u5230\u9762\u8bd5\u51c6\u5907\uff0c\u4e00\u7ad9\u5f0f\u5b8c\u6210\u4f60\u7684\u6c42\u804c\u5de5\u4f5c\u6d41'],
    ['#entryNavItem span:last-child', '\u7b80\u5386\u5165\u53e3\u9009\u62e9'],
    ['#apiNavItem span:last-child', 'API \u7ba1\u7406'],
    ['#trackerNavItem span:last-child', '\u6c42\u804c\u8ffd\u8e2a'],
    ['#setupSection h2', 'API \u7ba1\u7406'],
    ['#setupSection h3', 'AI \u5404\u6b65\u9aa4\u6a21\u578b\u5206\u914d'],
    ['#setupSection h3 + p', '\u4f60\u53ef\u4ee5\u4e3a\u4e0d\u540c\u4efb\u52a1\u6307\u5b9a\u6a21\u578b\uff0c\u4e0d\u8bbe\u7f6e\u65f6\u9ed8\u8ba4\u4f7f\u7528\u5f53\u524d\u9009\u4e2d\u7684\u670d\u52a1\u5546\u3002'],
    ['#trackerEmpty p:first-of-type', '\u8fd8\u6ca1\u6709\u7533\u8bf7\u8bb0\u5f55'],
    ['#trackerEmpty p:last-of-type', '\u70b9\u51fb\u4e0a\u65b9\u201c\u65b0\u589e\u7533\u8bf7\u201d\u5f00\u59cb\u8ddf\u8e2a\u4f60\u7684\u6c42\u804c\u8fdb\u5ea6'],
    ['#fileDropZone p:first-of-type', '\u62d6\u62fd\u6587\u4ef6\u5230\u8fd9\u91cc\uff0c\u6216\u70b9\u51fb\u9009\u62e9\u6587\u4ef6'],
    ['#fileDropZone p:last-of-type', '\u652f\u6301 .txt / .md / .pdf / .docx / .rtf / .html'],
    ['#folderImportArea p', '\u652f\u6301 Chrome / Edge\u3002\u5176\u4ed6\u6d4f\u89c8\u5668\u53ef\u4ee5\u5148\u4e0a\u4f20 ZIP\u3002'],
    ['#step6 h2', '\uD83C\uDFAF \u5c97\u4f4d\u5339\u914d\u63a8\u8350'],
    ['#step6 .subtitle', '\u6839\u636e\u4f60\u7684\u7b80\u5386\u80cc\u666f\u548c\u6c42\u804c\u76ee\u6807\uff0cAI \u4f1a\u63a8\u8350\u66f4\u9002\u5408\u4f60\u7684\u65b9\u5411\u3002'],
    ['#step6 .step-model-bar span', '\u5f53\u524d\u6b65\u9aa4\u4f7f\u7528\u6a21\u578b'],
    ['#matchLoading span', '\u6b63\u5728\u5206\u6790\u4f60\u7684\u80cc\u666f\u5e76\u751f\u6210\u5c97\u4f4d\u5efa\u8bae...'],
    ['#step7 h2', '\uD83D\uDD0D \u771f\u5b9e\u804c\u4f4d\u641c\u7d22'],
    ['#step7 .subtitle', '\u4ece\u62db\u8058\u7f51\u7ad9\u641c\u7d22\u771f\u5b9e\u804c\u4f4d\uff0c\u5e76\u57fa\u4e8e JD \u7ee7\u7eed\u4f18\u5316\u7b80\u5386\u3002'],
    ['#step7 .step-model-bar span', '\u5f53\u524d\u6b65\u9aa4\u4f7f\u7528\u6a21\u578b'],
    ['#jobLoading span', '\u6b63\u5728\u641c\u7d22\u62db\u8058\u4fe1\u606f...'],
    ['#skipJobConfirm p', '\u5df2\u8df3\u8fc7\u804c\u4f4d\u641c\u7d22\uff0c\u63a5\u4e0b\u6765\u5c06\u57fa\u4e8e\u4f60\u9009\u62e9\u7684\u65b9\u5411\u7ee7\u7eed\u8fdb\u884c\u7b80\u5386\u4f18\u5316\u3002'],
  ];

  textBySelector.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = value;
    });
  });

  const textById = {
    btnStartResumeGenerate: '\u5f00\u59cb\u751f\u6210\u7b80\u5386',
    resumeStartHint: '\u5148\u9009\u62e9\u6a21\u677f\uff0c\u518d\u5f00\u59cb\u751f\u6210\uff1b\u5207\u6362\u6a21\u677f\u540e\u53ef\u70b9\u51fb\u201c\u91cd\u65b0\u751f\u6210\u7b80\u5386\u201d\u5c1d\u8bd5\u4e0d\u540c\u98ce\u683c\u3002',
    currentTemplateBadge: '\u5f53\u524d\u6a21\u677f\u5c06\u7528\u4e8e\u751f\u6210\u4e0e\u5bfc\u51fa',
    templateUploadStatus: '\u652f\u6301\u4e0a\u4f20 PDF / DOCX / Markdown \u6a21\u677f\uff0c\u4f5c\u4e3a\u751f\u6210\u4e0e\u5bfc\u51fa\u7684\u6392\u7248\u53c2\u8003\u3002',
    btnTogglePreview: '\u5207\u6362\u9884\u89c8',
    btnRegenerateResume: '\u91cd\u65b0\u751f\u6210\u7b80\u5386',
    exportTemplateSummary: '\u5bfc\u51fa\u5c06\u4f7f\u7528\u5f53\u524d\u6a21\u677f\u7684\u6392\u7248\u548c\u6837\u5f0f',
    jobProgressText: '\u51c6\u5907\u641c\u7d22...'
  };

  Object.entries(textById).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const placeholderMap = {
    f_name: '\u4f8b\u5982\uff1a\u674e\u534e',
    f_contact: '\u624b\u673a\u53f7 / \u90ae\u7bb1 / \u5fae\u4fe1',
    f_target: '\u4f8b\u5982\uff1a\u9ad8\u7ea7\u540e\u7aef\u5f00\u53d1\u5de5\u7a0b\u5e08',
    f_city: '\u4f8b\u5982\uff1a\u5317\u4eac\u3001\u4e0a\u6d77\u3001\u676d\u5dde',
    f_hometown: '\u4f8b\u5982\uff1a\u6c5f\u82cf\u5357\u4eac',
    f_birth: '\u4f8b\u5982\uff1a1998.06',
    f_links: 'GitHub / \u4f5c\u54c1\u96c6 / LinkedIn \u94fe\u63a5',
    f_summary: '\u4f8b\u5982\uff1a3 \u5e74 Java \u540e\u7aef\u5f00\u53d1\u7ecf\u9a8c\uff0c\u719f\u6089\u9ad8\u5e76\u53d1\u7cfb\u7edf\u8bbe\u8ba1\u4e0e\u6027\u80fd\u4f18\u5316\u3002',
    f_school: '\u4f8b\u5982\uff1a\u5317\u4eac\u90ae\u7535\u5927\u5b66',
    f_major: '\u4f8b\u5982\uff1a\u8ba1\u7b97\u673a\u79d1\u5b66\u4e0e\u6280\u672f',
    f_edu_time: '\u4f8b\u5982\uff1a2017.09 - 2021.06',
    f_gpa: '\u4f8b\u5982\uff1a3.8/4.0\uff0c\u6216\u5217\u51fa 3-5 \u95e8\u6838\u5fc3\u8bfe\u7a0b',
    resumeChatInput: '\u544a\u8bc9 AI \u4f60\u60f3\u600e\u4e48\u4fee\u6539\u8fd9\u4efd\u7b80\u5386...',
    jobSearchQuery: '\u7559\u7a7a\u5219\u81ea\u52a8\u641c\u7d22\uff0c\u4e5f\u53ef\u4ee5\u8f93\u5165\u5982\uff1aJava \u540e\u7aef \u5317\u4eac',
    matchChoice: '\u4f8b\u5982\uff1a\u9009\u62e9\u7b2c 1 \u4e2a\u63a8\u8350\u65b9\u5411\uff0c\u6216\u624b\u52a8\u586b\u5199\u76ee\u6807\u5c97\u4f4d',
    jobChoice: '\u4f8b\u5982\uff1a\u9009\u4e2d\u67d0\u4e2a JD \u6216\u624b\u52a8\u8f93\u5165\u76ee\u6807\u5c97\u4f4d',
    trackerCompany: '\u4f8b\u5982\uff1a\u5b57\u8282\u8df3\u52a8',
    trackerPosition: '\u4f8b\u5982\uff1a\u9ad8\u7ea7\u540e\u7aef\u5f00\u53d1\u5de5\u7a0b\u5e08',
    trackerUrl: '\u804c\u4f4d\u8be6\u60c5\u9875\u94fe\u63a5',
    trackerNotes: '\u4f8b\u5982\uff1a\u9762\u8bd5\u65f6\u95f4\u3001\u6c9f\u901a\u53cd\u9988\u3001\u540e\u7eed\u8ddf\u8fdb\u8ba1\u5212'
  };
  Object.entries(placeholderMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = value;
  });
  const selectTextFixes = [
    ['#f_years option[value=""]', '\u8bf7\u9009\u62e9'],
    ['#f_gender option[value=""]', '\u8bf7\u9009\u62e9'],
    ['#f_degree option[value=""]', '\u8bf7\u9009\u62e9'],
    ['#trackerPlatform option[value=""]', '\u8bf7\u9009\u62e9'],
    ['#trackerStatus option[value="submitted"]', '\u5df2\u6295\u9012'],
    ['#trackerStatus option[value="resume-passed"]', '\u7b80\u5386\u901a\u8fc7'],
    ['#trackerStatus option[value="interviewing"]', '\u9762\u8bd5\u4e2d'],
    ['#trackerStatus option[value="offer"]', '\u5df2\u83b7 Offer'],
    ['#trackerStatus option[value="rejected"]', '\u5df2\u62d2\u7edd']
  ];

  selectTextFixes.forEach(([selector, value]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  });
}
