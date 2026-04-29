// ===================== File Upload =====================
console.log('actions.js loaded OK');
const uploadedFiles = []; // { name, content, type, size }

function handleFileSelect(event) {
  for (const file of event.target.files) {
    readFileContent(file);
  }
  event.target.value = '';
}

function handleFileDrop(event) {
  for (const file of event.dataTransfer.files) {
    readFileContent(file);
  }
}

function readFileContent(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'md', 'pdf', 'docx', 'rtf', 'html', 'htm'].includes(ext)) {
    alert(`不支持的文件格式: .${ext}。支持 txt、md、pdf、docx、rtf、html`);
    return;
  }
  addFileToList(file.name, '读取中...', file.size);

  if (ext === 'txt' || ext === 'md' || ext === 'rtf' || ext === 'html' || ext === 'htm') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target.result || '';
      const content = (ext === 'html' || ext === 'htm')
        ? extractHtmlText(rawText)
        : (ext === 'rtf' ? extractRtfText(rawText) : rawText);
      uploadedFiles.push({ name: file.name, content, type: ext, size: file.size });
      updateFileListItem(file.name, '已读取');
    };
    reader.readAsText(file);
  } else if (ext === 'pdf') {
    extractPdfText(file).then(content => {
      uploadedFiles.push({ name: file.name, content: content.substring(0, 10000), type: ext, size: file.size });
      const pageMatch = content.match(/ - (\d+) 页/);
      const pageInfo = pageMatch ? '（' + pageMatch[1] + ' 页）' : '';
      updateFileListItem(file.name, 'PDF 已解析' + pageInfo);
    }).catch(() => {
      updateFileListItem(file.name, 'PDF 解析失败');
    });
  } else if (ext === 'docx') {
    extractDocxText(file).then(content => {
      uploadedFiles.push({ name: file.name, content: content.substring(0, 10000), type: ext, size: file.size });
      updateFileListItem(file.name, 'DOCX 已解析');
    }).catch(() => {
      updateFileListItem(file.name, 'DOCX 解析失败');
    });
  }
}

function getUploadedFilesStr() {
  if (uploadedFiles.length === 0) return '';
  let str = '\n\n补充材料：\n';
  uploadedFiles.forEach(f => {
    str += `--- ${f.name} ---\n${f.content}\n\n`;
  });
  return str;
}

// ===================== PDF / DOCX / RTF / HTML Extractors =====================
async function extractPdfText(file) {
  try {
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '[PDF 文件: ' + file.name + '] - ' + pdf.numPages + ' 页\n\n';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  } catch (e) {
    console.error('PDF extraction error:', e);
    return '[PDF 文件: ' + file.name + '] - 解析失败: ' + e.message;
  }
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

function extractRtfText(text) {
  return (text || '')
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\''[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .trim();
}

function extractHtmlText(text) {
  const div = document.createElement('div');
  div.innerHTML = text || '';
  return div.textContent || div.innerText || '';
}

// ===================== Init =====================
function initApp() {
  try { saveAllProviders(); } catch (e) {}

  const validProviders = state.providers.filter(p => p.apiKey);
  if (validProviders.length === 0) {
    alert('请至少为一个 API 服务商填写 Key。');
    return;
  }

  // Hide API setup
  const setupEl = document.getElementById('setupSection');
  if (setupEl) setupEl.classList.add('hidden');

  // Show entry section directly — bypass all helpers
  try { document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); } catch(e){}
  const entryEl = document.getElementById('entrySection');
  if (entryEl) { entryEl.classList.remove('hidden'); entryEl.classList.add('active'); }
  const entryBtn = document.getElementById('entryNavItem');
  if (entryBtn) { entryBtn.classList.add('active'); entryBtn.style.opacity = '1'; entryBtn.style.cursor = 'pointer'; }
  const apiBtn = document.getElementById('apiNavItem');
  if (apiBtn) apiBtn.classList.remove('active');

  state.mode = '';
  state.existingResume = '';
  state.hasStarted = true;
  state.currentStep = 0;
  updateStepModelSelectors();
}

// ===================== Mode / Entry Selection =====================
function chooseMode(mode) {
  try {
    state.mode = mode;
    saveSessionData();
    if (mode === 'create') {
    document.getElementById('entrySection').classList.remove('active');
    document.getElementById('entrySection').classList.add('hidden');
    setEntryNavActive(false);
    state.currentResumeSubstep = 'basic';
    goStep(1);
  } else {
    document.getElementById('resumeInputArea').classList.remove('hidden');
    document.getElementById('confirmResumeBtn').textContent =
      mode === 'optimize' ? '\u786e\u8ba4\uff0c\u8fdb\u5165\u7b80\u5386\u4f18\u5316 \u2192' : '\u786e\u8ba4\uff0c\u8fdb\u5165\u5c97\u4f4d\u5339\u914d \u2192';
  }
  } catch (e) { alert('\u64cd\u4f5c\u5931\u8d25\uff1a' + e.message); }
}

function cancelModeSelection() {
  state.mode = '';
  state.existingResume = '';
  document.getElementById('resumeInputArea').classList.add('hidden');
  document.getElementById('existingResumeInput').value = '';
  document.getElementById('resumeInputStatus').textContent = '';
  updateResumePhotoUI();
  renderInterviewPrep();
}

function handleResumeFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'md', 'pdf', 'docx', 'rtf', 'html', 'htm'].includes(ext)) {
    alert('请上传 .txt、.md、.pdf、.docx、.rtf 或 .html 格式的文件');
    return;
  }
  const statusEl = document.getElementById('resumeInputStatus');
  const inputEl = document.getElementById('existingResumeInput');

  if (ext === 'pdf') {
    statusEl.textContent = '正在解析 PDF...';
    extractPdfText(file).then(content => {
      inputEl.value = content;
      statusEl.textContent = '已读取：' + file.name;
    }).catch(() => {
      statusEl.textContent = 'PDF 解析失败，请尝试复制粘贴内容';
    });
  } else if (ext === 'docx') {
    statusEl.textContent = '正在解析 DOCX...';
    extractDocxText(file).then(content => {
      inputEl.value = content;
      statusEl.textContent = '已读取：' + file.name;
    }).catch(() => {
      statusEl.textContent = 'DOCX 解析失败，请尝试复制粘贴内容';
    });
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target.result || '';
      inputEl.value = (ext === 'html' || ext === 'htm')
        ? extractHtmlText(rawText)
        : (ext === 'rtf' ? extractRtfText(rawText) : rawText);
      statusEl.textContent = '已读取：' + file.name;
    };
    reader.readAsText(file);
  }
}

function confirmResumeInput() {
  const text = document.getElementById('existingResumeInput').value.trim();
  if (!text) {
    alert('请粘贴或上传你的简历内容');
    return;
  }
  state.existingResume = text;
  saveSessionData();

  if (state.mode === 'optimize') {
    document.getElementById('entrySection').classList.remove('active');
    document.getElementById('entrySection').classList.add('hidden');
    setEntryNavActive(false);
    state.resume = text;
    state.currentResumeSubstep = 'basic';
    goStep(1);
    parseExistingResume(text);
  } else if (state.mode === 'direct') {
    document.getElementById('entrySection').classList.remove('active');
    document.getElementById('entrySection').classList.add('hidden');
    setEntryNavActive(false);
    state.userData.target = state.userData.target || '目标岗位';
    state.resume = text;
    goStep(3);
    goStep6();
  }
}

// ===================== Existing Resume Parsing =====================
async function parseExistingResume(text) {
  const container = document.getElementById('step1');
  const statusDiv = document.createElement('div');
  statusDiv.id = 'parseStatus';
  statusDiv.className = 'loading';
  statusDiv.innerHTML = '<div class="spinner"></div><span>正在分析你的简历并预填信息...</span>';
  container.insertBefore(statusDiv, container.querySelector('.substep-panel'));

  const system = '你是一个简历解析助手。请从用户提供的简历文本中提取结构化信息，并且只返回 JSON，不要附带解释。JSON 结构如下：\n' +
    JSON.stringify({
      name: '', contact: '', target: '', years: '', city: '', links: '', summary: '',
      school: '', degree: '', major: '', eduTime: '', gpa: '',
      workExp: [{ company: '', title: '', time: '', achievements: '' }],
      projects: [{ name: '', role: '', tech: '', contribution: '' }],
      skillsLang: '', skillsTools: '', skillsLangAbility: '', awards: '', other: ''
    }, null, 2).replace(/"":/g, '"":').replace(/"\[\]/g, '"') + '\n缺失字段请返回空字符串，数组字段没有内容时返回空数组。';

  try {
    const result = await callLLM(system, [
      { role: 'user', content: `请解析这份简历：\n\n${text.substring(0, 8000)}` }
    ], { maxTokens: 3072, providerId: getResolvedProviderId('resumeParse') });

    const parsed = extractJSON(result);
    if (parsed) { Object.assign(state.userData, parsed); }
    prefillFormFields();
    saveSessionData();

    if (statusDiv) {
      statusDiv.innerHTML = '<span style="color:var(--success);">已完成简历解析，请检查并补充后继续。</span>';
      setTimeout(() => { if (statusDiv) statusDiv.remove(); }, 2500);
    }
  } catch (e) {
    if (statusDiv) {
      statusDiv.innerHTML = `<span style="color:#E74C3C;">自动解析失败：${e.message}，请手动补充信息。</span>`;
      setTimeout(() => { if (statusDiv) statusDiv.remove(); }, 4000);
    }
    state.userData.target = state.userData.target || '目标岗位';
  }
}

function prefillFormFields() {
  const d = state.userData;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  setVal('f_name', d.name);
  setVal('f_contact', d.contact);
  setVal('f_target', d.target);
  setVal('f_years', d.years);
  setVal('f_city', d.city);
  setVal('f_hometown', d.hometown);
  setVal('f_birth', d.birth);
  setVal('f_gender', d.gender);
  setVal('f_links', d.links);
  setVal('f_summary', d.summary);
  setVal('f_self_eval', d.selfEval);
  updateResumePhotoUI();

  // Restore custom info fields
  const customInfoContainer = document.getElementById('customInfoFields');
  if (customInfoContainer && d.customInfo) {
    customInfoContainer.innerHTML = '';
    Object.entries(d.customInfo).forEach(([k, v]) => addCustomInfoField(k, v));
  }

  // Restore custom modules
  const customModContainer = document.getElementById('customModules');
  if (customModContainer && d.customModules) {
    customModContainer.innerHTML = '';
    d.customModules.forEach(m => addCustomModule(m.name, m.items));
  }
  setVal('f_school', d.school);
  setVal('f_degree', d.degree);
  setVal('f_major', d.major);
  setVal('f_edu_time', d.eduTime);
  setVal('f_gpa', d.gpa);
  setVal('f_skills_lang', d.skillsLang);
  setVal('f_skills_tools', d.skillsTools);
  setVal('f_skills_lang_ability', d.skillsLangAbility);
  setVal('f_awards', d.awards);
  setVal('f_other', d.other);

  if (d.workExp && d.workExp.length > 0) {
    const workFields = document.getElementById('workFields');
    workFields.innerHTML = '';
    d.workExp.forEach(w => {
      const entry = document.createElement('div');
      entry.className = 'work-entry';
      entry.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;';
      entry.innerHTML = `
        <div class="form-row">
          <div class="form-group"><label>公司名称</label><input type="text" class="f_work_company" value="${escHtml(w.company || '')}" /></div>
          <div class="form-group"><label>职位</label><input type="text" class="f_work_title" value="${escHtml(w.title || '')}" /></div>
        </div>
        <div class="form-row single">
          <div class="form-group"><label>工作时间</label><input type="text" class="f_work_time" value="${escHtml(w.time || '')}" /></div>
        </div>
        <div class="form-group"><label>核心成就</label><textarea class="f_work_achievements tall" rows="4">${escHtml(w.achievements || '')}</textarea></div>
        <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:13px;padding:6px 16px;margin-top:8px;">删除</button>
      `;
      workFields.appendChild(entry);
    });
  }

  if (d.projects && d.projects.length > 0) {
    const projFields = document.getElementById('projectFields');
    projFields.innerHTML = '';
    d.projects.forEach(p => {
      const entry = document.createElement('div');
      entry.className = 'project-entry';
      entry.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;';
      entry.innerHTML = `
        <div class="form-row">
          <div class="form-group"><label>项目名称</label><input type="text" class="f_proj_name" value="${escHtml(p.name || '')}" /></div>
          <div class="form-group"><label>你的角色</label><input type="text" class="f_proj_role" value="${escHtml(p.role || '')}" /></div>
        </div>
        <div class="form-group"><label>技术栈</label><input type="text" class="f_proj_tech" value="${escHtml(p.tech || '')}" /></div>
        <div class="form-group"><label>你的贡献</label><textarea class="f_proj_contribution" rows="3">${escHtml(p.contribution || '')}</textarea></div>
        <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:13px;padding:6px 16px;margin-top:8px;">删除</button>
      `;
      projFields.appendChild(entry);
    });
  }
}

// ===================== AI Assist for Steps 3 & 4 =====================
async function askAIAssist(step, evt) {
  const event = evt || window.event;
  const btn = event.target;
  const panel = btn.closest('.ai-assist-panel');
  const input = panel.querySelector('.ai-assist-input');
  const resultArea = panel.querySelector('.ai-assist-result');
  const status = panel.querySelector('.ai-assist-status');
  const prompt = input.value.trim();

  if (!prompt) {
    alert('请先描述你的工作内容或项目经历');
    return;
  }

  status.classList.remove('hidden');
  resultArea.classList.add('hidden');
  btn.disabled = true;

  const target = state.userData.target || '技术岗位';
  const system = '你是简历优化助手。请根据用户输入，生成 3 到 4 条适合写进简历的项目或工作描述。要求：\n1. 使用强动词开头；\n2. 尽量包含量化结果；\n3. 突出个人贡献；\n4. 每条单独一行。';

  try {
    const result = await callLLM(system, [
      { role: 'user', content: `目标岗位：${target}\n\n请把下面的描述润色成更适合简历的表述：\n${prompt}` }
    ], { maxTokens: 1024 });

    resultArea.textContent = result;
    resultArea.classList.remove('hidden');
    status.classList.add('hidden');

    const existingApply = panel.querySelector('.ai-apply-btn');
    if (existingApply) existingApply.remove();
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary ai-apply-btn';
    applyBtn.textContent = '应用到表单';
    applyBtn.style.cssText = 'font-size:13px;padding:6px 20px;margin-top:8px;';
    applyBtn.onclick = () => {
      const textarea = step === 3
        ? document.querySelector('.f_work_achievements')
        : document.querySelector('.f_proj_contribution');
      if (textarea) {
        textarea.value = textarea.value.trim() ? textarea.value + '\n' + result : result;
        resultArea.textContent = '已应用到表单';
        panel.querySelector('.ai-assist-input').value = '';
      }
    };
    resultArea.after(applyBtn);
  } catch (e) {
    status.innerHTML = `<span style="color:#E74C3C;">生成失败：${e.message}</span>`;
  }
  btn.disabled = false;
}

// ===================== Step 1: Basic Info =====================
function saveStep1() {
  state.userData.name = document.getElementById('f_name').value.trim();
  state.userData.contact = document.getElementById('f_contact').value.trim();
  state.userData.target = document.getElementById('f_target').value.trim();
  state.userData.years = document.getElementById('f_years').value;
  state.userData.city = document.getElementById('f_city').value.trim();
  state.userData.hometown = document.getElementById('f_hometown')?.value.trim() || '';
  state.userData.birth = document.getElementById('f_birth')?.value.trim() || '';
  state.userData.gender = document.getElementById('f_gender')?.value || '';
  state.userData.links = document.getElementById('f_links').value.trim();
  state.userData.summary = document.getElementById('f_summary').value.trim();

  // Collect custom info fields
  state.userData.customInfo = state.userData.customInfo || {};
  document.querySelectorAll('#customInfoFields .custom-info-row').forEach(row => {
    const label = row.querySelector('.ci-label')?.value?.trim();
    const value = row.querySelector('.ci-value')?.value?.trim();
    if (label && value) state.userData.customInfo[label] = value;
  });

  if (!state.userData.name || !state.userData.contact) {
    alert('请至少填写姓名和联系方式');
    return;
  }
  showResumeSubstep('education');
  saveSessionData();
}

function updateResumePhotoUI() {
  const preview = document.getElementById('resumePhotoPreview');
  const placeholder = document.getElementById('resumePhotoPlaceholder');
  const status = document.getElementById('resumePhotoStatus');
  const photoDataUrl = state.userData?.photoDataUrl || '';
  if (!preview || !placeholder || !status) return;

  if (photoDataUrl) {
    preview.src = photoDataUrl;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    status.textContent = `\u5df2\u4e0a\u4f20\u7167\u7247${state.userData.photoFileName ? `\uff1a${state.userData.photoFileName}` : ''}`;
    status.style.color = 'var(--success)';
  } else {
    preview.removeAttribute('src');
    preview.style.display = 'none';
    placeholder.style.display = 'block';
    status.textContent = '\u53ef\u4e0a\u4f20 JPG / PNG / WEBP\uff0c\u5efa\u8bae 2MB \u4ee5\u5185\u3002';
    status.style.color = 'var(--text-light)';
  }
}

function handleResumePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    alert('\u8bf7\u4e0a\u4f20 JPG\u3001PNG \u6216 WEBP \u683c\u5f0f\u7684\u7167\u7247\u3002');
    event.target.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('\u7167\u7247\u8bf7\u5c3d\u91cf\u63a7\u5236\u5728 2MB \u4ee5\u5185\u3002');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.userData.photoDataUrl = typeof reader.result === 'string' ? reader.result : '';
    state.userData.photoFileName = file.name;
    saveSessionData();
    updateResumePhotoUI();
    if (state.resume) updateResumePreview();
  };
  reader.readAsDataURL(file);
}

function clearResumePhoto() {
  if (state.userData) {
    delete state.userData.photoDataUrl;
    delete state.userData.photoFileName;
  }
  const input = document.getElementById('resumePhotoInput');
  if (input) input.value = '';
  saveSessionData();
  updateResumePhotoUI();
  if (state.resume) updateResumePreview();
}

// ===================== Step 2: Education =====================
function saveStep2() {
  state.userData.school = document.getElementById('f_school').value.trim();
  state.userData.degree = document.getElementById('f_degree').value;
  state.userData.major = document.getElementById('f_major').value.trim();
  state.userData.eduTime = document.getElementById('f_edu_time').value.trim();
  state.userData.gpa = document.getElementById('f_gpa').value.trim();
  showResumeSubstep('work');
  saveSessionData();
}

// ===================== Step 3: Work Experience =====================
function addWorkEntry() {
  const container = document.getElementById('workFields');
  const entry = document.createElement('div');
  entry.className = 'work-entry';
  entry.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;';
  entry.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>公司名称</label><input type="text" class="f_work_company" placeholder="公司名称" /></div>
      <div class="form-group"><label>职位</label><input type="text" class="f_work_title" placeholder="职位" /></div>
    </div>
    <div class="form-row single">
      <div class="form-group"><label>工作时间</label><input type="text" class="f_work_time" placeholder="如：2022.03 - 至今" /></div>
    </div>
    <div class="form-group"><label>核心成就</label><textarea class="f_work_achievements tall" rows="4" placeholder="用 STAR 法则+量化数据描述"></textarea></div>
    <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:13px;padding:6px 16px;">删除</button>
  `;
  container.appendChild(entry);
}

function saveStep3() {
  const companies = document.querySelectorAll('.f_work_company');
  const titles = document.querySelectorAll('.f_work_title');
  const times = document.querySelectorAll('.f_work_time');
  const achievements = document.querySelectorAll('.f_work_achievements');
  state.userData.workExp = [];
  companies.forEach((c, i) => {
    if (c.value.trim()) {
      state.userData.workExp.push({
        company: c.value.trim(),
        title: titles[i].value.trim(),
        time: times[i].value.trim(),
        achievements: achievements[i].value.trim()
      });
    }
  });
  showResumeSubstep('projects');
  saveSessionData();
}

// ===================== Step 4: Projects & Skills =====================
function addProjectEntry() {
  const container = document.getElementById('projectFields');
  const entry = document.createElement('div');
  entry.className = 'project-entry';
  entry.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;';
  entry.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>项目名称</label><input type="text" class="f_proj_name" placeholder="项目名称" /></div>
      <div class="form-group"><label>你的角色</label><input type="text" class="f_proj_role" placeholder="如：技术负责人" /></div>
    </div>
    <div class="form-group"><label>技术栈</label><input type="text" class="f_proj_tech" placeholder="如：Spring Boot, Redis" /></div>
    <div class="form-group"><label>你的贡献</label><textarea class="f_proj_contribution" rows="3" placeholder="STAR 法则描述"></textarea></div>
    <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:13px;padding:6px 16px;">删除</button>
  `;
  container.appendChild(entry);
}

function saveStep4() {
  const projNames = document.querySelectorAll('.f_proj_name');
  const projRoles = document.querySelectorAll('.f_proj_role');
  const projTechs = document.querySelectorAll('.f_proj_tech');
  const projContribs = document.querySelectorAll('.f_proj_contribution');
  state.userData.projects = [];
  projNames.forEach((p, i) => {
    if (p.value.trim()) {
      state.userData.projects.push({
        name: p.value.trim(),
        role: projRoles[i].value.trim(),
        tech: projTechs[i].value.trim(),
        contribution: projContribs[i].value.trim()
      });
    }
  });
  state.userData.skillsLang = document.getElementById('f_skills_lang').value.trim();
  state.userData.skillsTools = document.getElementById('f_skills_tools').value.trim();
  state.userData.skillsLangAbility = document.getElementById('f_skills_lang_ability').value.trim();
  state.userData.awards = document.getElementById('f_awards').value.trim();
  state.userData.other = document.getElementById('f_other').value.trim();

  saveSessionData();
  showResumeSubstep('selfeval');
}

// ===================== Step 5: Self Evaluation & Custom Modules =====================
function addCustomInfoField(label, val) {
  const container = document.getElementById('customInfoFields');
  const row = document.createElement('div');
  row.className = 'custom-info-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
  row.innerHTML = `
    <input type="text" class="ci-label" placeholder="字段名（如：政治面貌）" value="${escHtml(label||'')}" style="flex:2;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;" />
    <input type="text" class="ci-value" placeholder="值（如：中共党员）" value="${escHtml(val||'')}" style="flex:3;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;" />
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#E74C3C;cursor:pointer;font-size:16px;">×</button>
  `;
  container.appendChild(row);
}

function addCustomModule(name, items) {
  const container = document.getElementById('customModules');
  const idx = container.children.length;
  const mod = document.createElement('div');
  mod.className = 'custom-module';
  mod.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;background:#FAFBFC;';
  mod.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
      <input type="text" class="cm-name" placeholder="模块名（如：证书资质）" value="${escHtml(name||'')}" style="flex:1;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;font-weight:600;" />
      <button class="btn btn-outline btn-sm ai-module-btn" onclick="askModuleAI(this.closest('.custom-module'))" style="font-size:11px;padding:3px 10px;">🤖 AI 填充</button>
      <button onclick="this.closest('.custom-module').remove()" style="background:none;border:none;color:#E74C3C;cursor:pointer;font-size:16px;">×</button>
    </div>
    <textarea class="cm-items" rows="3" placeholder="填写内容（如：PMP 项目管理认证、AWS Solutions Architect）" style="width:100%;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;">${escHtml(items||'')}</textarea>
    <div class="ai-module-status loading hidden" style="justify-content:flex-start;padding:6px 0;"><div class="spinner" style="width:16px;height:16px;border-width:2px;"></div><span style="font-size:12px;">AI 正在生成...</span></div>
  `;
  container.appendChild(mod);
}

async function askSelfEvalAI(evt) {
  const event = evt || window.event;
  const btn = event.target;
  const panel = btn.closest('.ai-assist-panel');
  const status = panel.querySelector('.ai-assist-status');
  const resultArea = panel.querySelector('.ai-assist-result');
  const textarea = document.getElementById('f_self_eval');

  status.classList.remove('hidden');
  resultArea.classList.add('hidden');
  btn.disabled = true;

  const data = collectAllData();
  const system = `你是专业简历顾问。请根据用户提供的背景信息，生成一段 2-4 句话的自我评价。要求：
1. 突出核心竞争力
2. 体现职业态度和对目标岗位的热情
3. 语言专业、简洁、真实
4. 直接输出评价文本，不要任何前缀或解释`;

  try {
    const result = await callLLM(system, [
      { role: 'user', content: `\u8bf7\u6839\u636e\u4ee5\u4e0b\u80cc\u666f\u751f\u6210\u81ea\u6211\u8bc4\u4ef7\uff1a\n\n${data}` }
    ], { maxTokens: 512 });

    resultArea.textContent = result;
    resultArea.classList.remove('hidden');
    status.classList.add('hidden');

    // Apply button
    const existingApply = panel.querySelector('.ai-apply-btn');
    if (existingApply) existingApply.remove();
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary btn-sm ai-apply-btn';
    applyBtn.textContent = '\u2713 \u5e94\u7528\u5230\u8868\u5355';
    applyBtn.style.cssText = 'font-size:12px;padding:5px 16px;margin-top:8px;';
    applyBtn.onclick = () => {
      textarea.value = result;
      resultArea.textContent = '\u2713 \u5df2\u5e94\u7528\u5230\u8868\u5355';
      panel.querySelectorAll('.ai-apply-btn').forEach(b => b.remove());
    };
    resultArea.after(applyBtn);
  } catch (e) {
    status.innerHTML = `<span style="color:#E74C3C;font-size:12px;">\u751f\u6210\u5931\u8d25\uff1a${e.message}</span>`;
  }
  btn.disabled = false;
}

async function askModuleAI(modEl) {
  const nameInput = modEl.querySelector('.cm-name');
  const textarea = modEl.querySelector('.cm-items');
  const statusEl = modEl.querySelector('.ai-module-status');
  const btn = modEl.querySelector('.ai-module-btn');
  const moduleName = nameInput.value.trim() || '\u8865\u5145\u4fe1\u606f';

  if (!btn || btn.disabled) return;
  btn.disabled = true;

  statusEl.classList.remove('hidden');

  const data = collectAllData();
  const system = `\u4f60\u662f\u4e13\u4e1a\u7b80\u5386\u987e\u95ee\u3002\u8bf7\u6839\u636e\u7528\u6237\u80cc\u666f\u548c"${moduleName}"\u8fd9\u4e2a\u6a21\u5757\u4e3b\u9898\uff0c\u751f\u6210\u9002\u5408\u586b\u5199\u7684\u7b80\u5386\u5185\u5bb9\u3002\u8981\u6c42\uff1a
1. \u5185\u5bb9\u771f\u5b9e\u5408\u7406\uff0c\u7b26\u5408\u7b80\u5386\u89c4\u8303
2. \u5982\u679c\u662f\u8bc1\u4e66\u7c7b\uff0c\u5217\u51fa\u5e38\u89c1\u7684\u76f8\u5173\u8ba4\u8bc1
3. \u5982\u679c\u662f\u6280\u80fd\u7c7b\uff0c\u5217\u51fa\u5177\u4f53\u6761\u76ee
4. \u76f4\u63a5\u8f93\u51fa\u5185\u5bb9\uff0c\u4e0d\u8981\u4efb\u4f55\u524d\u7f00\u6216\u89e3\u91ca
5. 3-5 \u6761\u4e3a\u5b9c`;

  try {
    const result = await callLLM(system, [
      { role: 'user', content: `\u7528\u6237\u80cc\u666f\uff1a\n${data}\n\n\u8bf7\u4e3a"${moduleName}"\u6a21\u5757\u751f\u6210\u7b80\u5386\u5185\u5bb9\u3002` }
    ], { maxTokens: 512 });

    textarea.value = result;
    statusEl.classList.add('hidden');
    // Flash green
    textarea.style.borderColor = 'var(--success)';
    setTimeout(() => { textarea.style.borderColor = ''; }, 1500);
  } catch (e) {
    statusEl.innerHTML = `<span style="color:#E74C3C;font-size:12px;">\u751f\u6210\u5931\u8d25\uff1a${e.message}</span>`;
  }
  btn.disabled = false;
}

function legacySaveStep5() {
  state.userData.selfEval = document.getElementById('f_self_eval')?.value.trim() || '';

  // Collect custom modules
  state.userData.customModules = [];
  document.querySelectorAll('.custom-module').forEach(mod => {
    const name = mod.querySelector('.cm-name')?.value?.trim();
    const items = mod.querySelector('.cm-items')?.value?.trim();
    if (name && items) state.userData.customModules.push({ name, items });
  });

  saveSessionData();
  // Show content phase, hide template phase
  document.getElementById('contentPhase').classList.remove('hidden');
  document.getElementById('templatePhase').classList.add('hidden');
  document.getElementById('resumeLoading').style.display = 'none';
  document.getElementById('resumeResult').classList.add('hidden');
  goStep(2);
  renderResumeTemplateCards();
  syncResumeWorkspace();
}

// ===================== Data Collection & Resume Generation =====================
function collectAllData() {
  const d = state.userData;
  let personalStr = `\u59d3\u540d\uff1a${d.name || ''}\n\u8054\u7cfb\u65b9\u5f0f\uff1a${d.contact || ''}`;
  if (d.target) personalStr += `\n\u76ee\u6807\u5c97\u4f4d\uff1a${d.target}`;
  if (d.years) personalStr += `\n\u5de5\u4f5c\u5e74\u9650\uff1a${d.years}`;
  if (d.city) personalStr += `\n\u610f\u5411\u5de5\u4f5c\u5730\uff1a${d.city}`;
  if (d.hometown) personalStr += `\n\u7c4d\u8d2f\uff1a${d.hometown}`;
  if (d.birth) personalStr += `\n\u51fa\u751f\u5e74\u6708\uff1a${d.birth}`;
  if (d.gender) personalStr += `\n\u6027\u522b\uff1a${d.gender}`;
  if (d.links) personalStr += `\n\u4e2a\u4eba\u4e3b\u9875\uff1a${d.links}`;
  if (d.photoDataUrl) personalStr += `\n\u4e2a\u4eba\u7167\u7247\uff1a\u5df2\u4e0a\u4f20\u804c\u4e1a\u5f62\u8c61\u7167\uff0c\u53ef\u653e\u5728\u7b80\u5386\u9875\u7709\u5c55\u793a`; 
  if (d.customInfo && Object.keys(d.customInfo).length > 0) {
    Object.entries(d.customInfo).forEach(([k, v]) => { if (v) personalStr += `\n${k}\uff1a${v}`; });
  }
  if (d.summary) personalStr += `\n\u4e2a\u4eba\u7b80\u4ecb\uff1a${d.summary}`;

  let workStr = '';
  if (d.workExp) {
    d.workExp.forEach(w => {
      workStr += `- ${w.company} / ${w.title} / ${w.time}\n${w.achievements}\n\n`;
    });
  }
  let projStr = '';
  if (d.projects) {
    d.projects.forEach(p => {
      projStr += `- ${p.name}\uff08${p.role}\uff09\n  \u6280\u672f\u6808\uff1a${p.tech}\n  \u8d21\u732e\uff1a${p.contribution}\n\n`;
    });
  }
  let extraStr = '';
  if (d.selfEval) extraStr += `\n\u81ea\u6211\u8bc4\u4ef7\uff1a\n${d.selfEval}\n`;
  if (d.customModules && d.customModules.length > 0) {
    d.customModules.forEach(m => {
      extraStr += `\n${m.name}\uff1a\n${m.items}\n`;
    });
  }

  return `\u4e2a\u4eba\u4fe1\u606f\uff1a
${personalStr}

\u6559\u80b2\u80cc\u666f\uff1a
\u5b66\u6821\uff1a${d.school || ''}
\u5b66\u5386\uff1a${d.degree || ''}
\u4e13\u4e1a\uff1a${d.major || ''}
\u65f6\u95f4\uff1a${d.eduTime || ''}
GPA/\u8bfe\u7a0b\uff1a${d.gpa || ''}

\u5de5\u4f5c\u7ecf\u5386\uff1a
${workStr || '\u65e0'}
\u9879\u76ee\u7ecf\u5386\uff1a
${projStr || '\u65e0'}
\u4e13\u4e1a\u6280\u80fd\uff1a
\u7f16\u7a0b\u8bed\u8a00\uff1a${d.skillsLang || ''}
\u6846\u67b6\u5de5\u5177\uff1a${d.skillsTools || ''}
\u8bed\u8a00\u80fd\u529b\uff1a${d.skillsLangAbility || ''}

\u5176\u4ed6\u4fe1\u606f\uff1a
获奖：${d.awards || ''}
其他：${d.other || ''}${extraStr}${getUploadedFilesStr()}`;
}

async function legacyGenerateResume() {
  document.getElementById('resumeLoading').style.display = 'flex';
  document.getElementById('resumeResult').classList.add('hidden');

  const data = collectAllData();
  const system = `你是专业的中文简历顾问。请直接输出 Markdown 格式的简历正文。

格式规范：
- 用 # 作为姓名标题（单独一行）
- 下一行写联系方式（城市 · 电话 · 邮箱，用 · 分隔）
- 用 ## 标记各板块标题（教育背景、工作经历、项目经历、专业技能等）
- 用 ### 标记公司/项目名称行（格式：公司名 | 职位 | 时间）
- 经历和项目板块下用 - 列出量化成就（每条以动词开头，含具体数据）
- 技能板块用 - 按类别分条列出

禁止：
- 不要有任何开头语、结尾语、解释、客套话
- 不要用 \`\`\` 包裹
- 不要写"个人简介"板块——把关键信息融入经历描述中
- 每条成就描述控制在 60 字以内`;

  startProcess();
  try {
    let content = await callLLM(system, [
      { role: 'user', content: `根据以下信息生成简历内容：\n\n${data}` }
    ], { maxTokens: 4096, providerId: getResolvedProviderId('resumeGeneration') });

    if (isProcessCancelled()) return;
    content = stripResumeOutput(content);
    state.resume = content;
    saveSessionData();
    const editor = document.getElementById('resumeMDEditor');
    if (editor) editor.value = content;
    updateResumePreview();
    document.getElementById('resumeLoading').style.display = 'none';
    document.getElementById('resumeResult').classList.remove('hidden');
  } catch (e) {
    document.getElementById('resumeLoading').innerHTML = `<span style="color:#E74C3C;">\u751f\u6210\u5931\u8d25\uff1a${e.message}</span>`;
  } finally {
    endProcess();
  }
}

// ===================== Step 6: Career Matching =====================
async function goStep6() {
  goStep(3);
  document.getElementById('matchLoading').classList.remove('hidden');
  document.getElementById('matchResult').classList.add('hidden');

  const data = collectAllData();
  const system = '\u4f60\u662f\u804c\u4e1a\u987e\u95ee\u3002\u8bf7\u57fa\u4e8e\u7528\u6237\u80cc\u666f\u63a8\u8350 3 \u5230 5 \u4e2a\u5c97\u4f4d\u65b9\u5411\uff0c\u53ea\u8fd4\u56de JSON \u6570\u7ec4\uff1a\n' +
    '[{"id":1,"title":"","match":90,"reason":"","demand":"","path":""}]';

  startProcess();
  try {
    const result = await callLLM(system, [
      { role: 'user', content: `\u8bf7\u6839\u636e\u4e0b\u9762\u7684\u80cc\u666f\u63a8\u8350\u5c97\u4f4d\u65b9\u5411\uff1a\n\n${data}` }
    ], { maxTokens: 2048, providerId: getResolvedProviderId('careerMatch') });

    const parsed = extractJSON(result);
    const matches = parsed || [];
    const container = document.getElementById('matchList');
    container.innerHTML = '<h3 style="margin-bottom:16px;">\u6839\u636e\u4f60\u7684\u80cc\u666f\uff0c\u63a8\u8350\u4ee5\u4e0b\u65b9\u5411\uff1a</h3>';
    matches.forEach(m => {
      container.innerHTML += `
        <div class="result-card">
          <h4>\u63a8\u8350 ${m.id}\uff1a${m.title}</h4>
          <div class="meta">\u5339\u914d\u5ea6\uff1a${m.match}%</div>
          <div class="match-bar"><div class="fill" style="width:${m.match}%"></div></div>
          <p>\u63a8\u8350\u7406\u7531\uff1a${m.reason}</p>
          <p>\u5e02\u573a\u9700\u6c42\uff1a${m.demand}</p>
          <p>\u53d1\u5c55\u8def\u5f84\uff1a${m.path}</p>
        </div>`;
    });
    state.matchData = matches;
    document.getElementById('matchLoading').classList.add('hidden');
    document.getElementById('matchResult').classList.remove('hidden');
  } catch (e) {
    document.getElementById('matchLoading').innerHTML = `<span style="color:#E74C3C;">\u5206\u6790\u5931\u8d25\uff1a${e.message}</span>`;
  } finally {
    endProcess();
  }
}

function confirmMatch() {
  const choice = document.getElementById('matchChoice').value.trim();
  state.matchChoice = choice;
  saveSessionData();
  goStep(4);
}

// ===================== Step 7: Job Search =====================
function cancelJobSearch() {
  if (state.activeAbortController) {
    state.activeAbortController.abort();
    state.jobSearchCancelled = true;
  }
}

function updateJobProgress(phase, detail, pct) {
  const el = document.getElementById('jobProgressBar');
  const el2 = document.getElementById('jobProgressText');
  if (el) el.style.width = (pct || 0) + '%';
  if (el2) el2.textContent = detail || phase;
}

async function searchJobs() {
  state.jobSearchCancelled = false;
  const query = document.getElementById('jobSearchQuery').value.trim();
  const target = state.userData.target || '\u6280\u672f\u5c97\u4f4d';
  const city = state.userData.city || '\u5317\u4eac';
  const config = state.jobSearchConfig;

  // Show progress panel, hide old UI
  document.getElementById('jobLoading').classList.add('hidden');
  document.getElementById('jobResult').classList.add('hidden');
  document.getElementById('skipJobConfirm').classList.add('hidden');
  document.getElementById('jobProgressPanel').classList.remove('hidden');
  document.getElementById('jobProgressDetail').innerHTML = '';

  const platforms = (config.searchOrder && config.searchOrder.length > 0)
    ? config.searchOrder.map(k => JOB_PLATFORMS.find(p => p.key === k)).filter(Boolean)
    : JOB_PLATFORMS.filter(p => config.platforms.includes(p.key));
  const resultsPerPlatform = config.resultsPerPlatform || 3;
  const totalSteps = platforms.length + 1; // +1 for initial analysis
  let completed = 0;
  let allJobs = [];

  startProcess();

  try {
    // Phase 1: Analyze resume to extract keywords
    updateJobProgress('analyze', '\u6b63\u5728\u5206\u6790\u7b80\u5386\uff0c\u63d0\u53d6\u5c97\u4f4d\u5173\u952e\u8bcd...', 5);
    appendProgressDetail('\uD83D\uDD0D \u5206\u6790\u7b80\u5386\u5173\u952e\u8bcd...');
    const keywordSys = '\u4f60\u662f\u4e00\u4e2a\u7b80\u5386\u5206\u6790\u52a9\u624b\u3002\u8bf7\u4ece\u7b80\u5386\u4e2d\u63d0\u53d6 3-5 \u4e2a\u6700\u6838\u5fc3\u7684\u6c42\u804c\u5173\u952e\u8bcd\uff08\u5305\u62ec\u6280\u672f\u6808\u3001\u5c97\u4f4d\u65b9\u5411\uff09\uff0c\u53ea\u8fd4\u56de JSON \u6570\u7ec4\uff1a["\u5173\u952e\u8bcd1","\u5173\u952e\u8bcd2"]';
    let keywords = [];
    try {
      const kwResult = await callLLM(keywordSys, [
        { role: 'user', content: `\u8bf7\u4ece\u4ee5\u4e0b\u7b80\u5386\u63d0\u53d6\u5173\u952e\u8bcd\uff1a\n\n${state.resume}` }
      ], { maxTokens: 256, providerId: getResolvedProviderId('jobSearch') });
      keywords = extractJSON(kwResult) || [];
    } catch { keywords = [target]; }
    completed++;
    updateJobProgress('analyze', `\u8bc6\u522b\u5173\u952e\u8bcd\uff1a${keywords.join('\u3001')}`, Math.round(completed / totalSteps * 100));
    updateLastProgressDetail('\u2713 \u5206\u6790\u5b8c\u6210\uff0c\u5173\u952e\u8bcd\uff1a' + keywords.join('\u3001'));
    if (isProcessCancelled()) { handleJobSearchCancelled(); return; }

    // Phase 2: Search each platform
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      appendProgressDetail(`\uD83D\uDD0E \u641c\u7d22 ${platform.name}...`);
      updateJobProgress('searching', `\u641c\u7d22 ${platform.name}`, Math.round((completed + (i / platforms.length)) / (totalSteps + 1) * 100));

      const searchSys = `\u4f60\u662f\u62db\u8058\u4fe1\u606f\u6574\u7406\u52a9\u624b\u3002\u8bf7\u751f\u6210 ${resultsPerPlatform} \u6761\u6765\u81ea ${platform.name}\uff08${platform.url}\uff09\u7684\u804c\u4f4d\u4fe1\u606f\u3002\u8981\u6c42\uff1a\u804c\u4f4d\u8981\u771f\u5b9e\u5408\u7406\uff0c\u8fd4\u56de JSON \u6570\u7ec4\uff1a
[{"id":${i*resultsPerPlatform+1},"title":"","company":"","location":"","salary":"","requirements":"","source":"${platform.name}"}]`;

      try {
        const searchQuery = query || `${keywords.slice(0, 3).join(' ')} ${city}`;
        const result = await callLLM(searchSys, [
          { role: 'user', content: `\u56f4\u7ed5\u5173\u952e\u8bcd ${keywords.join('\u3001')} \u548c\u57ce\u5e02 ${city}\uff0c\u751f\u6210${resultsPerPlatform}\u6761 ${platform.name} \u7684\u62db\u8058\u4fe1\u606f\u3002\u641c\u7d22\u610f\u56fe\uff1a${searchQuery}` }
        ], { maxTokens: 2048, providerId: getResolvedProviderId('jobSearch') });

        if (isProcessCancelled()) { handleJobSearchCancelled(); return; }
        const jobs = extractJSON(result) || [];
        jobs.forEach((j, idx) => {
          j.id = allJobs.length + 1;
          j.platform = platform.name;
        });
        allJobs = allJobs.concat(jobs);
        updateLastProgressDetail(`\u2713 ${platform.name} \u627e\u5230 ${jobs.length} \u4e2a\u804c\u4f4d`);
      } catch (e) {
        updateLastProgressDetail(`\u26A0\uFE0F ${platform.name} \u641c\u7d22\u51fa\u9519\uff0c\u5df2\u8df3\u8fc7`);
      }
      completed++;
      updateJobProgress('searching', `\u5b8c\u6210 ${platform.name}`, Math.round(completed / (totalSteps + 1) * 100));
    }

    // Phase 3: Aggregate
    if (isProcessCancelled()) { handleJobSearchCancelled(); return; }
    appendProgressDetail('\u2728 \u6574\u7406\u641c\u7d22\u7ed3\u679c...');
    updateJobProgress('done', '\u641c\u7d22\u5b8c\u6210', 100);

    state.jobsFound = allJobs;
    const container = document.getElementById('jobList');
    container.innerHTML = '<h3 style="margin-bottom:16px;">\u4e3a\u4f60\u627e\u5230\u4ee5\u4e0b\u804c\u4f4d\uff1a</h3>';
    allJobs.forEach(j => {
      container.innerHTML += `
        <div class="job-item" onclick="selectJob(${j.id})">
          <h4>${j.title} - ${j.company}</h4>
          <div class="meta">\uD83D\uDCCD ${j.location} | \uD83D\uDCB0 ${j.salary} | \uD83D\uDCCB ${j.platform}</div>
          <p style="font-size:14px;margin:8px 0;">\uD83E\uDDFE ${j.requirements}</p>
        </div>`;
    });
    setTimeout(() => {
      document.getElementById('jobProgressPanel').classList.add('hidden');
      document.getElementById('jobResult').classList.remove('hidden');
    }, 500);
  } catch (e) {
    document.getElementById('jobProgressPanel').classList.add('hidden');
    document.getElementById('jobLoading').classList.remove('hidden');
    document.getElementById('jobLoading').innerHTML = `<span style="color:#E74C3C;">\u641c\u7d22\u5931\u8d25\uff1a${e.message}</span>`;
  } finally {
    endProcess();
  }
}

function handleJobSearchCancelled() {
  appendProgressDetail('\u26A0\uFE0F \u641c\u7d22\u5df2\u53d6\u6d88');
  state.jobSearchCancelled = true;
  setTimeout(() => {
    document.getElementById('jobProgressPanel').classList.add('hidden');
    document.getElementById('skipJobConfirm').classList.remove('hidden');
    document.getElementById('jobLoading').classList.add('hidden');
    document.getElementById('jobResult').classList.add('hidden');
  }, 300);
  endProcess();
}

function appendProgressDetail(text) {
  const el = document.getElementById('jobProgressDetail');
  if (el) {
    const div = document.createElement('div');
    div.style.cssText = 'font-size:13px;color:var(--text-light);padding:3px 0;transition:color 0.3s;';
    div.textContent = text;
    el.appendChild(div);
  }
}

function updateLastProgressDetail(text) {
  const el = document.getElementById('jobProgressDetail');
  if (el && el.lastChild) {
    el.lastChild.textContent = text;
    el.lastChild.style.color = 'var(--success)';
  }
}

function selectJob(id) {
  document.querySelectorAll('.job-item').forEach(el => el.classList.remove('selected'));
  const items = document.querySelectorAll('.job-item');
  if (items[id - 1]) items[id - 1].classList.add('selected');
  document.getElementById('jobChoice').value = id;
}

function skipJobSearch() {
  document.getElementById('jobLoading').classList.add('hidden');
  document.getElementById('jobResult').classList.add('hidden');
  document.getElementById('skipJobConfirm').classList.remove('hidden');
}

function confirmJob() {
  const choice = document.getElementById('jobChoice').value.trim();
  state.jobChoice = choice;
  saveSessionData();
  goStep(5);
  initOptimizeStep();
}

// ===================== Step 8: Optimize Resume =====================
function initOptimizeStep() {
  const posInput = document.getElementById('optimizePosition');
  if (posInput && !posInput.value) {
    posInput.value = state.optimizePosition || state.matchChoice || state.userData.target || '';
  }
  // Restore company selection
  const sel = document.getElementById('optimizeCompanySelect');
  const customDiv = document.getElementById('optimizeCustomCompanyDiv');
  const customInput = document.getElementById('optimizeCustomCompanyName');
  const presetKeys = ['byte','alibaba','tencent','google','meituan','startup'];
  if (sel && state.optimizeCompany) {
    if (presetKeys.includes(state.optimizeCompany)) {
      sel.value = state.optimizeCompany;
      if (customDiv) customDiv.classList.add('hidden');
    } else {
      sel.value = 'custom';
      if (customDiv) customDiv.classList.remove('hidden');
      if (customInput) customInput.value = state.optimizeCompany;
    }
  }
  updateOptimizeCompany();
  // Show quick-pick if job search yielded a company
  renderOptimizeQuickCompany();
}

function renderOptimizeQuickCompany() {
  const quickDiv = document.getElementById('optimizeQuickCompany');
  const label = document.getElementById('optimizeQuickCompanyLabel');
  if (!quickDiv || !label) return;
  // Try to extract company from job search results
  const jobCompany = extractCompanyFromJobSearch();
  if (jobCompany) {
    quickDiv.classList.remove('hidden');
    label.textContent = jobCompany;
  } else {
    quickDiv.classList.add('hidden');
  }
}

function extractCompanyFromJobSearch() {
  // Try to find company name from job choice or jobs found
  if (state.jobChoice) {
    // Try common patterns: "\u516c\u53f8\u540d - \u804c\u4f4d\u540d" or "\u3010\u516c\u53f8\u540d\u3011"
    const m = state.jobChoice.match(/^[\u4e00-\u9fa5a-zA-Z]+(?=\s*[-|\u2014\u2500])/) ||
             state.jobChoice.match(/[\u3010\u3011]?([\u4e00-\u9fa5a-zA-Z\u3000-\u303f\uff00-\uffef]+?)[\u3010\u3011]?[\s-|]/);
    if (m) return m[0] || m[1];
  }
  if (state.jobsFound && state.jobsFound.length > 0 && state.jobsFound[0].company) {
    return state.jobsFound[0].company;
  }
  return '';
}

function useQuickOptimizeCompany() {
  const company = extractCompanyFromJobSearch();
  if (!company) return;
  state.optimizeCompany = company;
  const sel = document.getElementById('optimizeCompanySelect');
  const customDiv = document.getElementById('optimizeCustomCompanyDiv');
  const customInput = document.getElementById('optimizeCustomCompanyName');
  const presetKeys = ['byte','alibaba','tencent','google','meituan','startup'];
  if (presetKeys.includes(company)) {
    if (sel) sel.value = company;
    if (customDiv) customDiv.classList.add('hidden');
  } else {
    if (sel) sel.value = 'custom';
    if (customDiv) customDiv.classList.remove('hidden');
    if (customInput) customInput.value = company;
  }
  updateOptimizeCompany();
  saveSessionData();
}

function updateOptimizeCompany() {
  const sel = document.getElementById('optimizeCompanySelect');
  const customDiv = document.getElementById('optimizeCustomCompanyDiv');
  const warning = document.getElementById('optimizeCustomWarning');
  const isCustom = sel && sel.value === 'custom';
  if (customDiv) customDiv.classList.toggle('hidden', !isCustom);
  if (warning) warning.classList.toggle('hidden', !isCustom);
  if (!isCustom) {
    state.optimizeCompany = sel ? sel.value : '';
  } else {
    const customInput = document.getElementById('optimizeCustomCompanyName');
    state.optimizeCompany = customInput ? customInput.value.trim() : '';
  }
  syncOptimizeState();
}

function syncOptimizeState() {
  const posInput = document.getElementById('optimizePosition');
  state.optimizePosition = posInput ? posInput.value.trim() : '';
  saveSessionData();
}

function syncOptimizeEditorState() {
  const editor = document.getElementById('optimizeMDEditor');
  if (editor) state.optimizedResume = editor.value;
}

function getOptimizeCompanyHint() {
  const company = state.optimizeCompany;
  if (!company) return '';
  const hints = {
    byte: '\u76ee\u6807\u516c\u53f8\uff1a\u5b57\u8282\u8df3\u52a8\u3002\u4f18\u5316\u91cd\u70b9\uff1a\u7a81\u51fa\u7b97\u6cd5\u80fd\u529b\u548c\u9ad8\u5e76\u53d1\u9879\u76ee\u7ecf\u9a8c\uff0c\u5f3a\u8c03\u91cf\u5316\u6210\u679c\u548c\u5feb\u901f\u8fed\u4ee3\u80fd\u529b\u3002',
    alibaba: '\u76ee\u6807\u516c\u53f8\uff1a\u963f\u91cc\u5df4\u5df4/\u8682\u8681\u3002\u4f18\u5316\u91cd\u70b9\uff1a\u7a81\u51fa\u5206\u5e03\u5f0f\u7cfb\u7edf\u7ecf\u9a8c\u548c\u4e1a\u52a1\u6df1\u5ea6\uff0c\u5f3a\u8c03\u6280\u672f\u9009\u578b\u7406\u7531\u548c\u67b6\u6784\u8bbe\u8ba1\u3002',
    tencent: '\u76ee\u6807\u516c\u53f8\uff1a\u817e\u8baf\u3002\u4f18\u5316\u91cd\u70b9\uff1a\u7a81\u51fa\u4ea7\u54c1\u601d\u7ef4\u548c\u5168\u6808\u80fd\u529b\uff0c\u5f3a\u8c03\u7528\u6237\u4f53\u9a8c\u76f8\u5173\u7ecf\u9a8c\u548c\u5de5\u7a0b\u5b9e\u8df5\u3002',
    google: '\u76ee\u6807\u516c\u53f8\uff1aGoogle/\u5fae\u8f6f\u3002\u4f18\u5316\u91cd\u70b9\uff1a\u7a81\u51fa\u7b97\u6cd5\u57fa\u7840\u548c\u7cfb\u7edf\u8bbe\u8ba1\u80fd\u529b\uff0c\u5f3a\u8c03\u4ee3\u7801\u8d28\u91cf\u548c\u5de5\u7a0b\u89c4\u8303\u3002',
    meituan: '\u76ee\u6807\u516c\u53f8\uff1a\u7f8e\u56e2\u3002\u4f18\u5316\u91cd\u70b9\uff1a\u7a81\u51fa\u9ad8\u5e76\u53d1\u573a\u666f\u7ecf\u9a8c\uff0c\u5f3a\u8c03\u7cfb\u7edf\u97e7\u6027\u548c\u5bb9\u707e\u964d\u7ea7\u65b9\u6848\u3002',
    startup: '\u76ee\u6807\u516c\u53f8\uff1a\u521b\u4e1a\u516c\u53f8\u3002\u4f18\u5316\u91cd\u70b9\uff1a\u7a81\u51fa\u6280\u672f\u5e7f\u5ea6\u548c\u72ec\u7acb\u89e3\u51b3\u95ee\u9898\u7684\u80fd\u529b\uff0c\u5f3a\u8c03 ownership \u548c\u4ece0\u52301\u7684\u7ecf\u9a8c\u3002'
  };
  if (hints[company]) return hints[company];
  return `\u76ee\u6807\u516c\u53f8\uff1a${company}\u3002\u8bf7\u6839\u636e\u8be5\u516c\u53f8\u6240\u5c5e\u884c\u4e1a\u548c\u7279\u70b9\uff0c\u5728\u7b80\u5386\u4e2d\u9002\u5f53\u7a81\u51fa\u4e0e\u8be5\u516c\u53f8\u7684\u6280\u672f\u6808\u548c\u4e1a\u52a1\u65b9\u5411\u76f8\u5339\u914d\u7684\u7ecf\u9a8c\u3002`;
}

async function startOptimize() {
  const optLoading = document.getElementById('optimizeLoading');
  const optResult = document.getElementById('optimizeResult');
  const optSubtitle = document.getElementById('optimizeSubtitle');
  const editor = document.getElementById('optimizeMDEditor');
  const actions = document.getElementById('optimizeActions');

  if (!optLoading || !optResult || !editor) return;

  // Sync state from inputs
  updateOptimizeCompany();
  syncOptimizeState();

  const company = state.optimizeCompany || '';
  const position = state.optimizePosition || state.matchChoice || state.userData.target || '\u76ee\u6807\u5c97\u4f4d';

  optLoading.classList.remove('hidden');
  optResult.classList.add('hidden');
  if (actions) actions.classList.add('hidden');

  const titleParts = [];
  if (company) titleParts.push(company);
  titleParts.push(position);
  if (optSubtitle) optSubtitle.textContent = `\u9488\u5bf9 ${titleParts.join(' \u00b7 ')} \u8fdb\u884c\u5b9a\u5411\u4f18\u5316`;

  const companyHint = getOptimizeCompanyHint();
  const system = `\u4f60\u662f\u8d44\u6df1\u7b80\u5386\u4f18\u5316\u4e13\u5bb6\u3002\u8bf7\u57fa\u4e8e\u76ee\u6807\u516c\u53f8\u548c\u804c\u4f4d\uff0c\u5bf9\u7b80\u5386\u8fdb\u884c\u6df1\u5ea6\u4f18\u5316\uff0c\u4f7f\u7b80\u5386\u5185\u5bb9\u66f4\u8d34\u5408\u76ee\u6807\u96c7\u4e3b\u7684\u9700\u6c42\u3002\u8981\u6c42\u5728\u7b80\u5386\u4e2d\u4f53\u73b0\u5bf9\u76ee\u6807\u516c\u53f8\u548c\u5c97\u4f4d\u7684\u7406\u89e3\u3002${
    companyHint ? '\n\n' + companyHint : ''
  }\n\n\u4f18\u5316\u539f\u5219\uff1a\n1. \u9488\u5bf9\u76ee\u6807\u516c\u53f8\u8c03\u6574\u6280\u672f\u6808\u4fa7\u91cd\u548c\u9879\u76ee\u63cf\u8ff0\u7684\u4fa7\u91cd\u70b9\n2. \u91cf\u5316\u6210\u679c\uff0c\u4f7f\u7528 STAR \u6cd5\u5219\n3. \u4fdd\u7559\u4e2d\u6587\u7b80\u5386\u7684\u4e13\u4e1a\u683c\u5f0f\n4. \u5728\u81ea\u6211\u8bc4\u4ef7\u4e2d\u4f53\u73b0\u5bf9\u76ee\u6807\u516c\u53f8\u7684\u5339\u914d\u5ea6\n5. \u6700\u540e\u7528 ## \u4f18\u5316\u8bf4\u660e \u5217\u51fa\u672c\u6b21\u8c03\u6574\u7684\u5173\u952e\u70b9`;

  startProcess();
  try {
    const content = await callLLM(system, [
      { role: 'user', content: `\u539f\u59cb\u7b80\u5386\uff1a\n${state.resume}\n\n\u76ee\u6807\u516c\u53f8\uff1a${company || '\u4e0d\u9650'}\n\u76ee\u6807\u804c\u4f4d\uff1a${position}\n\n\u8bf7\u8f93\u51fa\u4f18\u5316\u540e\u7684\u5b8c\u6574 Markdown \u7b80\u5386\uff0c\u5e76\u5728\u672b\u5c3e\u9644\u4e0a\u4f18\u5316\u8bf4\u660e\u3002` }
    ], { maxTokens: 4096, providerId: getResolvedProviderId('resumeOptimization') });

    if (isProcessCancelled()) return;
    const cleaned = stripResumeOutput(content);
    state.optimizedResume = cleaned;
    saveSessionData();
    optLoading.classList.add('hidden');
    optResult.classList.remove('hidden');
    editor.value = cleaned;
    updateOptimizePreview();
  } catch (e) {
    optLoading.innerHTML = `<span style="color:#E74C3C;">\u4f18\u5316\u5931\u8d25\uff1a${e.message}</span>`;
    if (actions) actions.classList.remove('hidden');
  } finally {
    endProcess();
  }
}

async function regenerateOptimizeResume() {
  const actions = document.getElementById('optimizeActions');
  if (actions) actions.classList.add('hidden');
  await startOptimize();
}

function toggleOptimizePreview() {
  const editor = document.getElementById('optimizeMDEditor');
  const preview = document.getElementById('optimizePreviewMode');
  const btn = document.getElementById('btnToggleOptimizePreview');
  if (!editor || !preview) return;
  const isPreview = !preview.classList.contains('hidden');
  if (isPreview) {
    preview.classList.add('hidden');
    editor.style.display = '';
    if (btn) btn.textContent = '\u5207\u6362\u9884\u89c8';
  } else {
    updateOptimizePreview();
    preview.classList.remove('hidden');
    editor.style.display = 'none';
    if (btn) btn.textContent = '\u5207\u6362\u7f16\u8f91';
  }
}

function updateOptimizePreview() {
  const editor = document.getElementById('optimizeMDEditor');
  const preview = document.getElementById('optimizePreviewContent');
  if (!editor || !preview) return;
  const md = editor.value || state.optimizedResume || '';
  preview.innerHTML = renderMarkdown(md);
}

function copyOptimizeResumeMD() {
  const editor = document.getElementById('optimizeMDEditor');
  const text = editor ? editor.value : (state.optimizedResume || '');
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showProcessingToast('\u5df2\u590d\u5236 Markdown');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showProcessingToast('\u5df2\u590d\u5236 Markdown');
  });
}

async function chatModifyOptimizeResume() {
  const input = document.getElementById('optimizeChatInput');
  const log = document.getElementById('optimizeChatLog');
  const status = document.getElementById('optimizeChatStatus');
  const editor = document.getElementById('optimizeMDEditor');
  const prompt = input.value.trim();
  const currentResume = editor ? editor.value : (state.optimizedResume || state.resume);
  if (!prompt || !currentResume) return;

  input.value = '';
  input.disabled = true;
  status.classList.remove('hidden');

  // Show user message
  const userDiv = document.createElement('div');
  userDiv.style.cssText = 'background:#F3F0FF;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;';
  userDiv.textContent = '\u4f60\uff1a' + prompt;
  log.appendChild(userDiv);

  const company = state.optimizeCompany || '';
  const position = state.optimizePosition || state.matchChoice || '';
  const contextNote = [company, position].filter(Boolean).length > 0
    ? `\n\u6ce8\u610f\uff1a\u7b80\u5386\u9700\u8981\u9762\u5411\u76ee\u6807\u516c\u53f8 ${company || '\u4e0d\u9650'}\u3001\u76ee\u6807\u804c\u4f4d ${position || '\u4e0d\u9650'}\u3002`
    : '';

  startProcess();
  try {
    const result = await callLLM(
      `\u4f60\u662f\u7b80\u5386\u4fee\u6539\u52a9\u624b\u3002\u6839\u636e\u7528\u6237\u8981\u6c42\u4fee\u6539\u7b80\u5386\u5185\u5bb9\uff0c\u4fdd\u6301\u9762\u5411\u76ee\u6807\u516c\u53f8\u548c\u804c\u4f4d\u7684\u4f18\u5316\u65b9\u5411\u3002\u76f4\u63a5\u8f93\u51fa\u4fee\u6539\u540e\u7684\u5b8c\u6574\u7b80\u5386 Markdown\uff0c\u4e0d\u8981\u4efb\u4f55\u89e3\u91ca\u3002`,
      [{ role: 'user', content: `\u5f53\u524d\u7b80\u5386\uff1a\n${currentResume}\n${contextNote}\n\u4fee\u6539\u8981\u6c42\uff1a${prompt}\n\n\u8bf7\u8f93\u51fa\u4fee\u6539\u540e\u7684\u5b8c\u6574\u7b80\u5386\uff1a` }],
      { maxTokens: 4096, providerId: getResolvedProviderId('resumeOptimization') }
    );

    if (isProcessCancelled()) return;
    const cleaned = stripResumeOutput(result);
    state.optimizedResume = cleaned;
    if (editor) editor.value = cleaned;
    updateOptimizePreview();
    saveSessionData();

    const aiDiv = document.createElement('div');
    aiDiv.style.cssText = 'background:#E8F5E9;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;';
    aiDiv.textContent = '\u5df2\u4fee\u6539';
    log.appendChild(aiDiv);
  } catch (e) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#E74C3C;font-size:11px;padding:4px;';
    errDiv.textContent = '\u4fee\u6539\u5931\u8d25\uff1a' + e.message;
    log.appendChild(errDiv);
  }
  status.classList.add('hidden');
  input.disabled = false;
  input.focus();
  log.scrollTop = log.scrollHeight;
  endProcess();
}

// ===================== Company Hints =====================
function getCompanyHint(companyKey) {
  if (!companyKey) return '';
  // Handle custom company names (not a preset key)
  const hints = {
    byte: '目标公司：字节跳动。该公司面试侧重算法能力、高并发系统设计、项目深度追问。请多出算法题和系统设计题，追问量化成果。',
    alibaba: '目标公司：阿里巴巴/蚂蚁。该公司面试侧重技术深度、分布式架构、业务场景题。请多问分布式系统、数据库优化、电商场景题。',
    tencent: '目标公司：腾讯。该公司面试侧重综合能力、产品思维、工程实践。请多问项目全栈能力、用户体验相关场景题。',
    google: '目标公司：Google/微软。该公司面试侧重算法与数据结构、系统设计、代码质量。请多出经典算法题和系统设计题。',
    meituan: '目标公司：美团。该公司面试侧重实战能力、业务理解、系统韧性。请多问高并发场景、容灾降级、数据一致性问题。',
    startup: '目标公司：创业公司。该公司面试侧重技术广度、独立解决问题能力、ownership。请多问全栈场景题和故障排查题。'
  };
  if (hints[companyKey]) return hints[companyKey];
  // Custom company: generate a generic but targeted hint
  return `目标公司：${companyKey}。请根据该公司所属行业和规模，适当调整面试侧重点。建议覆盖通用技术深度、项目经验、场景题和行为题。注意：自定义公司没有预设的面试策略，效果可能不如预设选项理想。`;
}

function updateTargetCompany() {
  const sel = document.getElementById('targetCompanySelect');
  const customDiv = document.getElementById('customCompanyInput');
  if (sel && sel.value === 'custom') {
    if (customDiv) customDiv.classList.remove('hidden');
    const customName = document.getElementById('customCompanyName');
    state.targetCompany = customName ? customName.value.trim() : '';
  } else {
    if (customDiv) customDiv.classList.add('hidden');
    state.targetCompany = sel ? sel.value : '';
  }
  saveSessionData();
}

// ===================== Step 9: Interview =====================
function buildInterviewSystem() {
  const target = state.matchChoice || state.userData.target || '技术岗位';
  const companyHint = getCompanyHint(state.targetCompany);
  return `你是一位资深面试官，请围绕目标岗位 ${target} 提问。题目要结合用户简历，覆盖技术深度、项目经验、场景题和行为题。反馈时请给出评分、优点、改进建议和参考回答。\n${companyHint}\n${getQuestionSourceInstruction()}\n\n用户信息：\n${collectAllData()}\n\n当前简历：\n${state.optimizedResume || state.resume}`;
}

function buildInterviewPrepSystem() {
  const target = state.matchChoice || state.userData.target || '\u6280\u672f\u5c97\u4f4d';
  const resumeText = state.optimizedResume || state.resume || '';
  const companyHint = getCompanyHint(state.targetCompany);
  return `\u4f60\u662f\u4e00\u4f4d\u4e2d\u6587\u6280\u672f\u9762\u8bd5\u6559\u7ec3\u3002\u8bf7\u56f4\u7ed5\u76ee\u6807\u5c97\u4f4d ${target}\uff0c\u57fa\u4e8e\u5019\u9009\u4eba\u7684\u7b80\u5386\u5185\u5bb9\uff0c\u8f93\u51fa\u4e00\u4efd"\u9762\u8bd5\u524d\u51c6\u5907\u6e05\u5355"\u3002\n${companyHint}\n\u8981\u6c42\uff1a
- \u53ea\u8f93\u51fa Markdown \u6b63\u6587\uff0c\u4e0d\u8981\u5bd2\u6684
- \u7ed3\u6784\u56fa\u5b9a\u4e3a\uff1a# \u603b\u4f53\u5224\u65ad\u3001## \u5fc5\u8bb2\u9879\u76ee\u3001## \u9ad8\u9891\u8ffd\u95ee\u3001## 30 \u5206\u949f\u901f\u67e5\u3001## \u5f00\u573a\u81ea\u6211\u4ecb\u7ecd
- "\u5fc5\u8bb2\u9879\u76ee"\u5217\u51fa 2-3 \u4e2a\u9879\u76ee\uff0c\u6bcf\u4e2a\u9879\u76ee\u7ed9\u51fa 3 \u4e2a\u5fc5\u987b\u8bf4\u6e05\u695a\u7684\u70b9
- "\u9ad8\u9891\u8ffd\u95ee"\u4f18\u5148\u8986\u76d6\u9879\u76ee\u6df1\u6316\u3001\u6280\u672f\u9009\u578b\u3001\u6027\u80fd\u4f18\u5316\u3001\u5f02\u5e38\u5904\u7406\u3001\u534f\u4f5c\u6c9f\u901a
- "30 \u5206\u949f\u901f\u67e5"\u5199\u6210\u53ef\u6267\u884c\u6e05\u5355
- "\u5f00\u573a\u81ea\u6211\u4ecb\u7ecd"\u7ed9\u51fa 120-180 \u5b57\u4e2d\u6587\u7248\u672c

\u5019\u9009\u4eba\u4fe1\u606f\uff1a
${collectAllData()}

\u5f53\u524d\u7b80\u5386\uff1a
${resumeText}`;
}

function renderInterviewPrep() {
  const result = document.getElementById('interviewPrepResult');
  if (!result) return;
  if (!state.interviewPrep) {
    result.classList.add('hidden');
    result.innerHTML = '';
    return;
  }
  result.classList.remove('hidden');
  result.innerHTML = renderMarkdown(state.interviewPrep);
}

async function generateInterviewPrep() {
  const loading = document.getElementById('interviewPrepLoading');
  const result = document.getElementById('interviewPrepResult');
  if (loading) loading.classList.remove('hidden');
  if (result) result.classList.add('hidden');

  try {
    const system = buildInterviewPrepSystem();
    const prep = await callLLM(system, [{ role: 'user', content: '\u8bf7\u751f\u6210\u8fd9\u6b21\u6a21\u62df\u9762\u8bd5\u524d\u7684\u51c6\u5907\u6e05\u5355\u3002' }], {
      maxTokens: 2200,
      providerId: getResolvedProviderId('interviewQuestion')
    });
    state.interviewPrep = (prep || '').replace(/^```(?:markdown|md)?\s*/i, '').replace(/```$/i, '').trim();
    state.interviewPrepGeneratedAt = new Date().toISOString();
    saveSessionData();
    renderInterviewPrep();
  } catch (e) {
    if (result) {
      result.classList.remove('hidden');
      result.innerHTML = `<div style="color:#E74C3C;">\u51c6\u5907\u6e05\u5355\u751f\u6210\u5931\u8d25\uff1a${escHtml(e.message || 'unknown error')}</div>`;
    }
  } finally {
    if (loading) loading.classList.add('hidden');
  }
}

// ===================== JSON Extraction Helper =====================
function extractJSON(raw) {
  if (!raw) return null;
  // Try direct parse first
  try { return JSON.parse(raw); } catch {}
  // Strip markdown code fences
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/```\s*$/gm, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  // Try finding first { or [ and last } or ]
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)); } catch {}
  }
  return null;
}

async function startInterview() {
  document.getElementById('interviewSetup').classList.add('hidden');
  document.getElementById('interviewArea').classList.remove('hidden');
  state.interviewActive = true;
  state.interviewQA = [];
  state.scores = [];
  state.questionIndex = 0;
  state.chatHistory = [];
  state.currentQuestion = '';
  state.awaitingAnswer = false;
  state.awaitingInput = false;

  renderChat();
  updateQuestionCounter();
  await askNextQuestionCore();
}

async function askNextQuestionCore() {
  const system = buildInterviewSystem();
  let prompt;
  if (state.questionIndex === 0) {
    prompt = '请给出第一道面试题，只返回 JSON：{"question":"","category":"技术/行为/系统设计/项目"}';
  } else {
    const prev = state.interviewQA[state.interviewQA.length - 1];
    prompt = `继续面试。上一题：${prev.question}\n上一轮情况：${prev.mode === 'user' ? prev.userAnswer : '用户查看了参考答案'}\n\n请给出下一道不重复的问题，只返回 JSON：{"question":"","category":"技术/行为/系统设计/项目"}`;
  }

  try {
    const result = await callLLM(system, [{ role: 'user', content: prompt }],
      { maxTokens: 1024, providerId: getResolvedProviderId('interviewQuestion') });
    const parsed = extractJSON(result);

    const question = parsed ? parsed.question : result.replace(/```/g, '').trim();
    state.currentQuestion = question;
    state.awaitingAnswer = true;

    const cat = parsed && parsed.category ? `[${parsed.category}] ` : '';
    addChatMessage('interviewer', `${cat}**第 ${state.questionIndex + 1} 题：**\n${question}`);
    document.getElementById('interviewActions').classList.remove('hidden');
    document.getElementById('answerInputArea').classList.add('hidden');
    document.getElementById('nextQuestionArea').classList.add('hidden');
  } catch (e) {
    const fallback = '请介绍一个你最有成就感的项目，并说明你在其中解决的关键问题。';
    state.currentQuestion = fallback;
    state.awaitingAnswer = true;
    addChatMessage('interviewer', `**第 ${state.questionIndex + 1} 题：**\n${fallback}`);
    document.getElementById('interviewActions').classList.remove('hidden');
  }
}

function showAnswerInput() {
  if (!state.awaitingAnswer) return;
  state.awaitingAnswer = false;
  state.awaitingInput = true;
  document.getElementById('interviewActions').classList.add('hidden');
  document.getElementById('answerInputArea').classList.remove('hidden');
  document.getElementById('chatInput').focus();
}

function cancelAnswer() {
  state.awaitingAnswer = true;
  state.awaitingInput = false;
  document.getElementById('interviewActions').classList.remove('hidden');
  document.getElementById('answerInputArea').classList.add('hidden');
}

async function sendAnswer() {
  const input = document.getElementById('chatInput');
  const answer = input.value.trim();
  if (!answer || !state.awaitingInput) return;
  input.value = '';
  state.awaitingInput = false;

  addChatMessage('user', answer);
  state.questionIndex++;
  document.getElementById('answerInputArea').classList.add('hidden');
  addChatMessage('system', '正在评估，请稍候...');

  const system = buildInterviewSystem();
  try {
    const result = await callLLM(system, [
      {
        role: 'user',
        content: `问题：${state.currentQuestion}\n\n用户回答：${answer}\n\n请返回 JSON：{"score":7,"detailScores":{"技术深度":7,"表达清晰度":8,"完整性":6},"strengths":"","improvements":"","referenceAnswer":""}`
      }
    ], { maxTokens: 3072, providerId: getResolvedProviderId('interviewEval') });

    const parsed = extractJSON(result);
    state.chatHistory = state.chatHistory.filter(m => !(m.role === 'system' && m.content.startsWith('正在评估')));

    if (!parsed) {
      addChatMessage('system', '评估结果解析失败，请继续下一题。');
      document.getElementById('nextQuestionArea').classList.remove('hidden');
      return;
    }

    const score = parsed.score || 7;
    const detailScores = parsed.detailScores || {};
    const strengths = parsed.strengths || '回答方向基本正确';
    const improvements = parsed.improvements || '可以再补充更多细节与结果';
    const refAnswer = parsed.referenceAnswer || '';
    state.scores.push(score);

    let detailHtml = '';
    if (Object.keys(detailScores).length > 0) {
      detailHtml = '<div class="score-detail-grid">';
      for (const [k, v] of Object.entries(detailScores)) {
        detailHtml += '<div class="score-detail-item"><div class="sd-value">' + v + '/10</div><div class="sd-label">' + k + '</div></div>';
      }
      detailHtml += '</div>';
    }

    const feedbackContent =
      '<div style="margin:8px 0;"><span class="score-badge">' + score + '/10</span></div>' +
      detailHtml +
      '<div class="feedback-box"><div class="fb-label">优点</div>' + marked2(strengths) + '</div>' +
      '<div class="feedback-box" style="border-color:#EF9A9A;background:#FFEBEE;"><div class="fb-label" style="color:#C62828;">改进建议</div>' + marked2(improvements) + '</div>' +
      '<div class="ref-answer-box"><div class="ref-label">参考回答</div>' + marked2(refAnswer) + '</div>';

    addChatMessage('interviewer', feedbackContent);
    state.interviewQA.push({
      question: state.currentQuestion,
      userAnswer: answer,
      referenceAnswer: refAnswer,
      score,
      suggestions: improvements,
      mode: 'user'
    });
    updateQuestionCounter();
    document.getElementById('nextQuestionArea').classList.remove('hidden');
  } catch (e) {
    state.chatHistory = state.chatHistory.filter(m => !(m.role === 'system' && m.content.startsWith('正在评估')));
    addChatMessage('system', `评估失败：${e.message}`);
  }
}

async function showReferenceAnswer() {
  document.getElementById('interviewActions').classList.add('hidden');
  addChatMessage('system', '正在生成参考回答...');

  const system = buildInterviewSystem();
  try {
    const result = await callLLM(system, [
      { role: 'user', content: `问题：${state.currentQuestion}\n\n请返回纯文本格式的参考回答和答题思路。不要用 JSON 包裹，直接以"参考回答："开头，然后以"答题思路："开头列出关键点。` }
    ], { maxTokens: 2048, providerId: getResolvedProviderId('interviewQuestion') });

    state.chatHistory = state.chatHistory.filter(m => !(m.role === 'system' && m.content.startsWith('正在生成参考回答')));

    // Parse structured text response
    const rawText = result || '';
    const refMatch = rawText.match(/参考回答[：:]\s*([\s\S]*?)(?=答题思路[：:]|$)/i);
    const refAnswer = refMatch ? refMatch[1].trim() : rawText;
    const keyMatch = rawText.match(/答题思路[：:]\s*([\s\S]*)/i);
    const keyPoints = keyMatch ? keyMatch[1].trim() : '';

    let display = `<div class="ref-answer-box"><div class="ref-label">参考回答</div>${marked2(refAnswer)}</div>`;
    if (keyPoints) {
      display += `<div class="feedback-box"><div class="fb-label">答题思路</div>${marked2(keyPoints)}</div>`;
    }
    addChatMessage('reference', display);
    state.interviewQA.push({
      question: state.currentQuestion,
      userAnswer: '',
      referenceAnswer: refAnswer,
      score: null,
      suggestions: keyPoints,
      mode: 'reference'
    });
  } catch (e) {
    state.chatHistory = state.chatHistory.filter(m => !(m.role === 'system' && m.content.startsWith('正在生成参考回答')));
    addChatMessage('reference', '<div class="ref-answer-box"><div class="ref-label">参考回答</div>建议从项目背景、技术选型、关键实现和结果复盘几个角度组织回答。</div>');
  }
  document.getElementById('nextQuestionArea').classList.remove('hidden');
  updateQuestionCounter();
}

async function askNextQuestion() {
  document.getElementById('nextQuestionArea').classList.add('hidden');
  state.awaitingAnswer = true;

  if (state.questionIndex >= 5) {
    addChatMessage('system', '已经完成 5 道题，可以结束面试查看总结，或者继续下一题。');
  }
  await askNextQuestionCore();
}

function endInterview() {
  state.interviewActive = false;
  document.getElementById('interviewArea').classList.add('hidden');
  document.getElementById('interviewSetup').classList.add('hidden');
  document.getElementById('interviewSummary').classList.remove('hidden');

  const totalQ = state.interviewQA.length;
  const userAnswered = state.interviewQA.filter(q => q.mode === 'user');
  const avgScore = userAnswered.length > 0
    ? (userAnswered.reduce((sum, q) => sum + (q.score || 0), 0) / userAnswered.length).toFixed(1)
    : '暂无';

  let reviewHtml = '';
  state.interviewQA.forEach((qa, i) => {
    const modeLabel = qa.mode === 'user' ? '自己回答' : '查看参考答案';
    reviewHtml += `
      <div class="qa-review-item">
        <div class="q-number">第 ${i + 1} 题 · ${modeLabel}${qa.score != null ? ' · 评分 ' + qa.score + '/10' : ''}</div>
        <div class="q-text">${qa.question}</div>
        ${qa.userAnswer ? `<div class="a-text"><strong>你的回答：</strong><br>${qa.userAnswer}</div>` : ''}
        ${qa.referenceAnswer ? `<div class="r-text"><strong>参考回答：</strong><br>${qa.referenceAnswer}</div>` : ''}
        ${qa.suggestions ? `<div class="q-meta">${qa.suggestions}</div>` : ''}
      </div>`;
  });

  document.getElementById('summaryContent').innerHTML = `
    <div class="summary-grid">
      <div class="summary-item"><div class="value">${totalQ}</div><div class="label">总题数</div></div>
      <div class="summary-item"><div class="value">${userAnswered.length}</div><div class="label">作答题数</div></div>
      <div class="summary-item"><div class="value">${avgScore}</div><div class="label">平均分</div></div>
      <div class="summary-item"><div class="value">${state.matchChoice || state.userData.target || '未设置'}</div><div class="label">目标方向</div></div>
    </div>
    <div class="feedback-card"><strong>回顾</strong><p>下面是本轮面试的逐题记录。</p></div>
    ${reviewHtml || '<p style="color:var(--text-light);">本轮没有可展示的作答记录。</p>'}
  `;
}

// ===================== Question Sources =====================
function updateQuestionSources() {
  const checked = document.querySelectorAll('#sourceList input[type="checkbox"]:checked:not([value="custom"])');
  state.interviewSources = [];
  checked.forEach(cb => state.interviewSources.push(cb.value));
  const custom = document.getElementById('customSourceField');
  state.customSource = (custom && custom.value.trim()) || '';
}

function toggleCustomSource() {
  const cb = document.querySelector('#sourceList input[value="custom"]');
  const input = document.getElementById('customSourceInput');
  if (cb && cb.checked) {
    input.classList.remove('hidden');
  } else {
    input.classList.add('hidden');
    document.getElementById('customSourceField').value = '';
  }
  updateQuestionSources();
}

function getQuestionSourceInstruction() {
  if (state.interviewSources.length === 0 && !state.customSource) {
    return '从通用面试知识库中出题，覆盖技术深度、项目经验、场景题、行为题和系统设计。';
  }
  const sourceMap = {
    nowcoder: '牛客网面经',
    leetcode: 'LeetCode / 力扣题目与面经',
    zhipin: 'BOSS 直聘面经',
    zhihu: '知乎面经分享'
  };
  const sources = state.interviewSources.map(s => sourceMap[s] || s);
  if (state.customSource) sources.push(`自定义来源：${state.customSource}`);
  return `优先参考这些来源的出题风格和关注重点：${sources.join('、')}。题目要贴近真实面试，但也要结合用户简历和目标岗位做个性化调整。`;
}

// ===================== Project Folder Import =====================
let projectFolderFiles = []; // { path, content, size }
const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '__pycache__', '.next', 'dist', 'build', '.claude', '.vscode', 'target', 'bin', 'obj', 'venv', '.idea']);
const TEXT_EXTS = new Set(['.js','.ts','.jsx','.tsx','.py','.java','.go','.rs','.rb','.php','.c','.cpp','.h','.hpp','.cs','.swift','.kt','.vue','.svelte','.html','.css','.scss','.less','.json','.xml','.yaml','.yml','.toml','.md','.sql','.sh','.bash','.dockerfile','.gradle','.properties','.cfg','.ini','.txt','.conf']);

async function selectProjectFolder() {
  if (!window.showDirectoryPicker) {
    alert('当前浏览器不支持文件夹选择。请使用 Chrome / Edge，或者改为上传 ZIP 文件。');
    document.getElementById('zipUpload').click();
    return;
  }
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    document.getElementById('folderResult').classList.remove('hidden');
    document.getElementById('folderAnalysis').classList.remove('hidden');
    document.getElementById('folderAnalysis').querySelector('span').textContent = '正在扫描文件...';

    projectFolderFiles = [];
    await readAllFiles(dirHandle, '');
    renderFileTree();
    await analyzeProjectFolder();
  } catch (e) {
    if (e.name !== 'AbortError') {
      document.getElementById('folderAnalysis').innerHTML = `<span style="color:#E74C3C;">选择文件夹失败：${e.message}</span>`;
    }
  }
}

async function readAllFiles(dirHandle, path) {
  for await (const entry of dirHandle.values()) {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      if (!SKIP_DIRS.has(entry.name)) {
        await readAllFiles(entry, fullPath);
      }
    } else if (entry.kind === 'file') {
      const ext = '.' + entry.name.split('.').pop().toLowerCase();
      if (TEXT_EXTS.has(ext)) {
        try {
          const file = await entry.getFile();
          if (file.size > 50000) continue;
          const content = await file.text();
          projectFolderFiles.push({ path: fullPath, content, size: file.size });
        } catch (e) { /* skip unreadable */ }
      }
    }
  }
}

async function analyzeProjectFolder() {
  const listContainer = document.getElementById('responsibilityList');
  listContainer.innerHTML = '';
  document.getElementById('responsibilitySelector').classList.add('hidden');

  if (projectFolderFiles.length === 0) {
    document.getElementById('folderAnalysis').innerHTML = '<span style="color:var(--text-light);">没有找到可分析的代码文件。</span>';
    return;
  }

  const fileSummary = projectFolderFiles.slice(0, 15).map(f =>
    `File: ${f.path}\nContent:\n${f.content.substring(0, 800)}...\n`
  ).join('\n---\n');

  const system = '你是技术简历顾问。请根据项目代码概要，提取最多 6 条适合写进简历的贡献点，只返回 JSON 数组：\n' +
    '[{"id":1,"responsibility":"简短贡献标题","category":"架构设计/性能优化/功能开发/工程化/测试/其他","techStack":["技术1"],"detail":"一句话说明"}]';

  try {
    const result = await callLLM(system, [
      { role: 'user', content: `请分析下面的项目文件概要，并提炼可以写进简历的贡献点：\n\n${fileSummary}` }
    ], { maxTokens: 2048 });

    let contributions;
    try { contributions = extractJSON(result) || []; } catch { contributions = []; }

    if (!contributions || contributions.length === 0) {
      document.getElementById('folderAnalysis').innerHTML = '<span style="color:var(--text-light);">暂时没有提炼出清晰贡献点，请手动填写项目经历。</span>';
      return;
    }

    document.getElementById('folderAnalysis').classList.add('hidden');
    document.getElementById('responsibilitySelector').classList.remove('hidden');

    contributions.forEach(c => {
      const item = document.createElement('label');
      item.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:12px;background:#F8F9FD;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all 0.2s;';
      item.innerHTML = `
        <input type="checkbox" data-id="${c.id}" style="margin-top:3px;" checked />
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;">${escHtml(c.responsibility)}</div>
          <div style="font-size:11px;color:var(--text-light);margin:4px 0;">类别：${escHtml(c.category)} | 技术：${(c.techStack || []).join(', ')}</div>
          <div style="font-size:12px;">${escHtml(c.detail)}</div>
        </div>
      `;
      listContainer.appendChild(item);
    });
  } catch (e) {
    document.getElementById('folderAnalysis').innerHTML = `<span style="color:#E74C3C;">分析失败：${e.message}</span>`;
  }
}

function applySelectedResponsibilities() {
  const checked = document.querySelectorAll('#responsibilityList input[type="checkbox"]:checked');
  if (checked.length === 0) {
    alert('请至少选择一项贡献');
    return;
  }

  const contributions = [];
  checked.forEach(cb => {
    const label = cb.closest('label');
    const resp = label.querySelector('div > div:first-child').textContent.trim();
    contributions.push(resp);
  });

  const projContribs = document.querySelectorAll('.f_proj_contribution');
  let filled = false;
  projContribs.forEach(textarea => {
    if (!textarea.value.trim() && !filled) {
      textarea.value = contributions.map((c, i) => `${i+1}. ${c}`).join('\n');
      filled = true;
    }
  });

  const techSet = new Set();
  checked.forEach(cb => {
    const label = cb.closest('label');
    const techText = label.querySelector('div > div:nth-child(2)').textContent;
    const match = techText.match(/技术：(.*?)(?:\||$)/);
    if (match) {
      match[1].split(',').forEach(t => techSet.add(t.trim()));
    }
  });
  if (techSet.size > 0) {
    const projTechs = document.querySelectorAll('.f_proj_tech');
    projTechs.forEach(input => {
      if (!input.value.trim()) {
        input.value = Array.from(techSet).join(', ');
      }
    });
  }
  clearProjectFolder();
  alert('已将所选贡献应用到项目经历，请检查并补充。');
}

function clearProjectFolder() {
  projectFolderFiles = [];
  document.getElementById('folderResult').classList.add('hidden');
  document.getElementById('responsibilitySelector').classList.add('hidden');
  document.getElementById('folderAnalysis').classList.add('hidden');
  document.getElementById('folderAnalysis').querySelector('span').textContent = '正在分析项目内容...';
}

async function handleZipUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  alert('ZIP 解析还没有接进来。请优先使用 Chrome / Edge 直接选择文件夹，或手动填写项目经历。');
  event.target.value = '';
}

// ===================== Application Tracker Actions =====================
function cancelTrackerForm() {
  clearTrackerForm();
  document.getElementById('trackerForm').classList.add('hidden');
}

function clearTrackerForm() {
  document.getElementById('trackerForm').dataset.editId = '';
  document.getElementById('trackerCompany').value = '';
  document.getElementById('trackerPosition').value = '';
  document.getElementById('trackerPlatform').value = '';
  document.getElementById('trackerStatus').value = 'submitted';
  document.getElementById('trackerUrl').value = '';
  document.getElementById('trackerNotes').value = '';
}

function saveTrackerApplication() {
  const company = document.getElementById('trackerCompany').value.trim();
  const position = document.getElementById('trackerPosition').value.trim();
  const platform = document.getElementById('trackerPlatform').value;
  const status = document.getElementById('trackerStatus').value;
  const url = document.getElementById('trackerUrl').value.trim();
  const notes = document.getElementById('trackerNotes').value.trim();
  const editId = document.getElementById('trackerForm').dataset.editId;

  if (!company || !position) {
    alert('请填写公司和职位名称');
    return;
  }

  if (editId) {
    const idx = state.applications.findIndex(a => a.id === editId);
    if (idx > -1) {
      state.applications[idx] = { ...state.applications[idx], company, position, platform, status, url, notes, updatedAt: new Date().toISOString() };
    }
  } else {
    state.applications.push({
      id: 'app-' + Date.now(),
      company, position, platform: platform || '', status, url, notes,
      dateApplied: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString()
    });
  }

  saveApplicationsToStorage();
  cancelTrackerForm();
  renderTrackerSummary();
  renderTrackerList();
}

function editTrackerApplication(id) {
  const app = state.applications.find(a => a.id === id);
  if (!app) return;
  document.getElementById('trackerForm').dataset.editId = id;
  document.getElementById('trackerCompany').value = app.company;
  document.getElementById('trackerPosition').value = app.position;
  document.getElementById('trackerPlatform').value = app.platform || '';
  document.getElementById('trackerStatus').value = app.status;
  document.getElementById('trackerUrl').value = app.url || '';
  document.getElementById('trackerNotes').value = app.notes || '';
  document.getElementById('trackerForm').classList.remove('hidden');
}

function deleteTrackerApplication(id) {
  if (!confirm('确定删除这条申请记录吗？')) return;
  state.applications = state.applications.filter(a => a.id !== id);
  saveApplicationsToStorage();
  renderTrackerSummary();
  renderTrackerList();
}

function saveApplicationsToStorage() {
  try { localStorage.setItem('ai_applications', JSON.stringify(state.applications)); }
  catch (e) { /* ignore */ }
}

function loadApplicationsFromStorage() {
  try {
    const saved = localStorage.getItem('ai_applications');
    if (saved) state.applications = JSON.parse(saved);
  } catch (e) { /* ignore */ }
}

// ===================== Reset =====================
function resetAll() {
  Object.keys(state).forEach(k => {
    if (k === 'providers' || k === 'activeProviderId' || k === 'stepModelMap' || k === 'applications') return;
    if (Array.isArray(state[k])) state[k] = [];
    else if (typeof state[k] === 'object' && state[k] !== null) state[k] = {};
    else if (typeof state[k] === 'number') state[k] = 0;
    else state[k] = '';
  });
  state.currentStep = 0;
  state.hasStarted = true;

  document.getElementById('interviewSummary').classList.add('hidden');
  document.getElementById('interviewSetup').classList.remove('hidden');
  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (!el.closest('.work-entry') && !el.closest('.project-entry') && !el.closest('#setupSection')) {
      el.value = '';
    }
  });

  document.getElementById('workFields').innerHTML = `
    <div class="work-entry" style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div class="form-row">
        <div class="form-group"><label>公司名称</label><input type="text" class="f_work_company" placeholder="公司名称" /></div>
        <div class="form-group"><label>职位</label><input type="text" class="f_work_title" placeholder="职位" /></div>
      </div>
      <div class="form-row single">
        <div class="form-group"><label>工作时间</label><input type="text" class="f_work_time" placeholder="如：2022.03 - 至今" /></div>
      </div>
      <div class="form-group"><label>核心成就</label><textarea class="f_work_achievements tall" rows="4" placeholder="用 STAR 法则+量化数据描述"></textarea></div>
    </div>`;
  document.getElementById('projectFields').innerHTML = `
    <div class="project-entry" style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div class="form-row">
        <div class="form-group"><label>项目名称</label><input type="text" class="f_proj_name" placeholder="项目名称" /></div>
        <div class="form-group"><label>你的角色</label><input type="text" class="f_proj_role" placeholder="如：技术负责人" /></div>
      </div>
      <div class="form-group"><label>技术栈</label><input type="text" class="f_proj_tech" placeholder="如：Spring Boot, Redis" /></div>
      <div class="form-group"><label>你的贡献</label><textarea class="f_proj_contribution" rows="3" placeholder="STAR 法则描述"></textarea></div>
    </div>`;

  document.getElementById('fileList').innerHTML = '';
  const fileList3 = document.getElementById('fileListStep3');
  if (fileList3) fileList3.innerHTML = '';
  const customModules = document.getElementById('customModules');
  if (customModules) customModules.innerHTML = '';
  const customInfoFields = document.getElementById('customInfoFields');
  if (customInfoFields) customInfoFields.innerHTML = '';
  uploadedFiles.length = 0;

  state.mode = '';
  state.existingResume = '';
  state.currentResumeSubstep = 'basic';
  state.resumeTemplate = 'reference';
  state.resumeGeneratedOnce = false;
  state.templateConfirmed = false;
  state.customTemplate = '';
  state.templateDesignerChat = [];
  document.getElementById('resumeInputArea').classList.add('hidden');
  document.getElementById('existingResumeInput').value = '';
  document.getElementById('resumeInputStatus').textContent = '';
  document.getElementById('setupSection').classList.add('hidden');
  setApiNavActive(false);
  setEntryNavEnabled(true);
  document.getElementById('entrySection').classList.remove('hidden');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('entrySection').classList.add('active');
  document.querySelectorAll('.step-dot').forEach(d => { d.classList.remove('active'); d.classList.remove('done'); });
  document.querySelector('.step-dot[data-step="1"]').classList.add('active');
  document.getElementById('progressFill').style.width = '0%';
  resetResumeSubsteps();
  clearSessionData();
}

// ===================== Resume Generation Helpers =====================
function stripResumeOutput(text) {
  if (!text) return text;
  let cleaned = text;
  // Remove markdown code fences
  cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/gm, '').replace(/```\s*$/gm, '');
  // Remove common AI preamble lines
  cleaned = cleaned.replace(/^(?:好的[，,]|以下是|根据你|下面是为|这是|这里)[^\n]*\n?/gmi, '');
  // Remove common AI postamble lines
  cleaned = cleaned.replace(/\n(?:以上就是|以上是|希望这|如果需要|请注意|注意：|提示：)[^\n]*$/gm, '');
  // Remove any remaining leading/trailing blank lines
  cleaned = cleaned.trim();
  return cleaned;
}

function legacyRegenerateResume() {
  document.getElementById('resumeLoading').style.display = 'flex';
  document.getElementById('resumeResult').classList.add('hidden');
  generateResume();
}

function copyResumeMD() {
  const editor = document.getElementById('resumeMDEditor');
  if (!editor) return;
  navigator.clipboard.writeText(editor.value).then(() => {
    showProcessingToast('已复制到剪贴板');
  }).catch(() => {
    editor.select();
    showProcessingToast('请手动 Ctrl+C 复制');
  });
}

let _resumePreviewVisible = false;

function toggleResumePreview() {
  const editMode = document.getElementById('resumeEditMode');
  const previewMode = document.getElementById('resumePreviewMode');
  const btn = document.getElementById('btnTogglePreview');
  if (!editMode || !previewMode) return;
  _resumePreviewVisible = !_resumePreviewVisible;
  if (_resumePreviewVisible) {
    editMode.classList.add('hidden');
    previewMode.classList.remove('hidden');
    if (btn) btn.textContent = '✏️ 编辑';
    updateResumePreview();
  } else {
    editMode.classList.remove('hidden');
    previewMode.classList.add('hidden');
    if (btn) btn.textContent = '👁️ 预览';
    // Sync editor with state
    const editor = document.getElementById('resumeMDEditor');
    if (editor) editor.value = state.resume || '';
  }
}

function updateResumePreview() {
  const previewEl = document.getElementById('resumePreviewContent');
  if (!previewEl) return;
  const editor = document.getElementById('resumeMDEditor');
  const md = (editor ? editor.value : '') || state.resume || '';
  state.resume = md;
  previewEl.innerHTML = renderMarkdown(md);
  saveSessionData();
}

// ===================== Resume HTML Template =====================
function legacyResumeHTML(content, templateKey) {
  const tpl = templateKey || state.resumeTemplate || 'standard';
  const body = renderMarkdown(content || state.resume || '');
  const name = (state.userData && state.userData.name) || '';

  const css = tpl === 'compact' ? `
    @page { size: A4; margin: 15mm 18mm; }
    body { font-family: 'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif; font-size:11pt; line-height:1.35; color:#222; max-width:800px; margin:0 auto; }
    h1 { font-size:16pt; text-align:center; margin:0 0 2pt; letter-spacing:1pt; }
    h1 + p { text-align:center; font-size:9pt; color:#666; margin:0 0 10pt; }
    h2 { font-size:12pt; color:#1a1a1a; border-bottom:1.5pt solid #333; padding-bottom:3pt; margin:14pt 0 6pt; letter-spacing:0.5pt; }
    h3 { font-size:11pt; margin:8pt 0 2pt; color:#333; }
    p { margin:2pt 0; font-size:10pt; }
    ul, ol { margin:3pt 0; padding-left:16pt; }
    li { font-size:10pt; margin:2pt 0; line-height:1.4; }
    hr { border:none; border-top:0.5pt solid #ccc; margin:8pt 0; }
    strong {}
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  ` : `
    @page { size: A4; margin: 18mm 20mm; }
    body { font-family: 'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif; font-size:11.5pt; line-height:1.45; color:#222; max-width:800px; margin:0 auto; }
    h1 { font-size:18pt; text-align:center; margin:0 0 3pt; letter-spacing:1.5pt; font-weight:700; }
    h1 + p { text-align:center; font-size:9.5pt; color:#555; margin:0 0 12pt; }
    h2 { font-size:13pt; color:#1a1a1a; border-bottom:1.5pt solid #444; padding-bottom:4pt; margin:16pt 0 8pt; letter-spacing:0.5pt; font-weight:600; }
    h3 { font-size:11.5pt; margin:8pt 0 3pt; color:#333; font-weight:600; }
    p { margin:3pt 0; font-size:10.5pt; }
    ul, ol { margin:4pt 0; padding-left:18pt; }
    li { font-size:10.5pt; margin:3pt 0; line-height:1.45; }
    hr { border:none; border-top:0.5pt solid #ddd; margin:10pt 0; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  `;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escHtml(name) || '简历'}</title>
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

function legacyDownloadResumePDF() {
  const html = resumeHTML(state.resume, state.resumeTemplate);
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 600);
}

function legacyDownloadResumeDOCX() {
  const name = state.userData.name || '简历';
  const inner = resumeHTML(state.resume, state.resumeTemplate);
  // Insert Word XML namespaces into the html tag for .doc compatibility
  const html = inner.replace('<html lang="zh-CN">',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="zh-CN">');
  const blob = new Blob(['﻿' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-简历.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showProcessingToast('简历已导出为 .doc 文件（可用 Word 打开）');
}

// ===================== Template Upload =====================
function legacyHandleTemplateUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'md', 'docx', 'pdf'].includes(ext)) {
    alert('请上传 .txt、.md、.docx 或 .pdf 格式的模板文件');
    return;
  }
  const statusFn = (msg) => {
    const el = document.getElementById('templateFileName') || document.getElementById('templateFileName2');
    if (el) el.textContent = msg;
  };
  statusFn('⏳ 读取中: ' + file.name);
  const onLoad = (text) => {
    state.customTemplate = text;
    statusFn('✅ 已加载: ' + file.name);
  };
  if (ext === 'pdf') {
    extractPdfText(file).then(onLoad).catch(() => statusFn('❌ PDF 解析失败'));
  } else if (ext === 'docx') {
    extractDocxText(file).then(onLoad).catch(() => statusFn('❌ DOCX 解析失败'));
  } else {
    const reader = new FileReader();
    reader.onload = e => { onLoad(e.target.result || ''); };
    reader.readAsText(file);
  }
}

// ===================== Two-Phase Resume Flow =====================
function legacyGoToTemplatePhase() {
  document.getElementById('contentPhase').classList.add('hidden');
  document.getElementById('templatePhase').classList.remove('hidden');
  document.getElementById('step5Subtitle').textContent = '第二阶段：选择模板格式并导出简历';
  renderExportTemplateCards();
}

function legacyBackToContentPhase() {
  document.getElementById('templatePhase').classList.add('hidden');
  document.getElementById('contentPhase').classList.remove('hidden');
  document.getElementById('step5Subtitle').textContent = '第一阶段：生成简历内容，AI 帮你写出初稿，你可以直接编辑或对话修改';
}

async function chatModifyResume() {
  const input = document.getElementById('resumeChatInput');
  const log = document.getElementById('resumeChatLog');
  const status = document.getElementById('resumeChatStatus');
  const editor = document.getElementById('resumeMDEditor');
  const prompt = input.value.trim();
  if (!prompt || !state.resume) return;

  input.value = '';
  input.disabled = true;
  status.classList.remove('hidden');

  const userDiv = document.createElement('div');
  userDiv.style.cssText = 'background:#F3F0FF;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;';
  userDiv.textContent = '你：' + prompt;
  log.appendChild(userDiv);

  startProcess();
  try {
    const result = await callLLM(
      `你是简历修改助手。根据用户要求修改简历内容，直接输出修改后的完整简历 Markdown，不要任何解释。`,
      [{ role: 'user', content: `当前简历：\n${state.resume}\n\n修改要求：${prompt}\n\n请输出修改后的完整简历：` }],
      { maxTokens: 4096, providerId: getResolvedProviderId('resumeGeneration') }
    );

    if (isProcessCancelled()) return;
    const cleaned = stripResumeOutput(result);
    state.resume = cleaned;
    if (editor) editor.value = cleaned;
    updateResumePreview();
    saveSessionData();

    const aiDiv = document.createElement('div');
    aiDiv.style.cssText = 'background:#E8F5E9;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;';
    aiDiv.textContent = '🤖 已修改';
    log.appendChild(aiDiv);
  } catch (e) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#E74C3C;font-size:11px;padding:4px;';
    errDiv.textContent = '修改失败：' + e.message;
    log.appendChild(errDiv);
  }
  status.classList.add('hidden');
  input.disabled = false;
  input.focus();
  log.scrollTop = log.scrollHeight;
  endProcess();
}

function legacyRenderExportTemplateCards() {
  const container = document.getElementById('exportTemplateCards');
  if (!container) return;
  container.innerHTML = Object.entries(RESUME_TEMPLATES).map(([k, t]) => `
    <div class="template-preview-card" onclick="selectExportTemplate('${k}')" style="cursor:pointer;">
      <div class="tpl-name">📄 ${t.name}</div>
      <div class="tpl-desc">${t.desc}</div>
      <div class="tpl-preview">${escHtml(t.preview)}</div>
    </div>
  `).join('');
}

function legacySelectExportTemplate(key) {
  state.resumeTemplate = key;
  renderExportTemplateCards();
}

function legacyHandleTemplateUpload2(event) {
  // Same as handleTemplateUpload but for the export phase
  handleTemplateUpload(event);
}

function legacyExportResume(format) {
  if (format === 'doc') downloadResumeDOCX();
  else if (format === 'pdf') downloadResumePDF();
  else {
    // Download MD
    const blob = new Blob([state.resume], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.userData.name || '简历'}.md`;
    a.click();
  }
}

// ===================== Resume Workspace =====================
function saveStep5() {
  state.userData.selfEval = document.getElementById('f_self_eval')?.value.trim() || '';

  state.userData.customModules = [];
  document.querySelectorAll('.custom-module').forEach(mod => {
    const name = mod.querySelector('.cm-name')?.value?.trim();
    const items = mod.querySelector('.cm-items')?.value?.trim();
    if (name && items) state.userData.customModules.push({ name, items });
  });

  saveSessionData();
  document.getElementById('contentPhase').classList.remove('hidden');
  document.getElementById('templatePhase').classList.add('hidden');
  document.getElementById('resumeLoading').style.display = 'none';
  document.getElementById('resumeResult').classList.add('hidden');
  goStep(2);
  renderResumeTemplateCards();
  syncResumeWorkspace();
  if (state.resume) updateResumePreview();
}

function getResumeTemplateMeta(templateKey = state.resumeTemplate) {
  if (templateKey === 'custom') {
    return {
      key: 'custom',
      name: '自定义模板',
      desc: '根据上传的模板内容，尽量贴近原有结构与语气。',
      for: '自定义',
      accent: '上传',
      preview: state.customTemplate
        ? state.customTemplate.slice(0, 160)
        : '上传 PDF / DOCX / Markdown 模板后，生成和导出都会优先参考该模板。',
      generationHint: state.customTemplate
        ? `请参考以下模板内容的表达方式、模块顺序和信息颗粒度，但输出必须是新的 Markdown 简历：\n${state.customTemplate.slice(0, 1500)}`
        : '未上传模板时，请保持正式、克制、易打印的一页式中文简历风格。'
    };
  }
  const tpl = RESUME_TEMPLATES[templateKey] || RESUME_TEMPLATES.reference;
  return { key: templateKey, ...tpl };
}

function selectResumeTemplate(key) {
  state.resumeTemplate = key;
  renderResumeTemplateCards();
  renderExportTemplateCards();
  syncResumeWorkspace();
  if (_resumePreviewVisible) updateResumePreview();
  saveSessionData();
}

function legacyRenderResumeTemplateCards() {
  const targets = ['generationTemplateCards', 'exportTemplateCards'];
  const cards = Object.entries(RESUME_TEMPLATES).map(([key, tpl]) => {
    const selected = state.resumeTemplate === key;
    return `
      <button type="button" class="template-preview-card ${selected ? 'selected' : ''}" onclick="selectResumeTemplate('${key}')">
        <div class="check-badge">✓</div>
        <div class="tpl-name">
          <span>${tpl.name}</span>
          <span class="provider-badge ${selected ? 'active-badge' : 'inactive-badge'}">${tpl.accent || '模板'}</span>
        </div>
        <div class="tpl-desc">${tpl.desc}</div>
        <div class="tpl-for">${tpl.for}</div>
        <div class="tpl-preview">${escHtml(tpl.preview)}</div>
      </button>
    `;
  }).join('');

  const customSelected = state.resumeTemplate === 'custom';
  const customCard = `
    <button type="button" class="template-preview-card ${customSelected ? 'selected' : ''}" onclick="selectResumeTemplate('custom')">
      <div class="check-badge">✓</div>
      <div class="tpl-name">
        <span>自定义模板</span>
        <span class="provider-badge ${customSelected ? 'active-badge' : 'inactive-badge'}">上传</span>
      </div>
      <div class="tpl-desc">上传你自己的 PDF / DOCX / Markdown 作为排版和措辞参考。</div>
      <div class="tpl-for">自定义</div>
      <div class="tpl-preview">${escHtml(getResumeTemplateMeta('custom').preview)}</div>
    </button>
  `;

  targets.forEach(id => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = cards + customCard;
  });
}

function legacySyncResumeWorkspace() {
  const hasResume = !!(state.resume || '').trim();
  if (hasResume && !state.resumeGeneratedOnce) state.resumeGeneratedOnce = true;

  const startBtn = document.getElementById('btnStartResumeGenerate');
  const startHint = document.getElementById('resumeStartHint');
  const regenBtn = document.getElementById('btnRegenerateResume');
  const result = document.getElementById('resumeResult');
  const editor = document.getElementById('resumeMDEditor');
  const previewBadge = document.getElementById('currentTemplateBadge');
  const exportLabel = document.getElementById('exportTemplateSummary');
  const meta = getResumeTemplateMeta();

  if (startBtn) startBtn.textContent = state.resumeGeneratedOnce ? '重新生成简历' : '开始生成简历';
  if (startHint) {
    startHint.textContent = state.resumeGeneratedOnce
      ? `当前已选模板：${meta.name}。可以继续编辑，或切换模板后重新生成。`
      : `请先选择模板，再点击开始生成。当前模板：${meta.name}。`;
  }
  if (regenBtn) regenBtn.disabled = !state.resumeGeneratedOnce;
  if (result) result.classList.toggle('hidden', !hasResume);
  if (editor && hasResume) editor.value = state.resume;
  if (previewBadge) previewBadge.textContent = `当前模板：${meta.name}`;
  if (exportLabel) exportLabel.textContent = `导出将使用「${meta.name}」样式`;
}

async function legacyGenerateResume() {
  const loadingEl = document.getElementById('resumeLoading');
  const resultEl = document.getElementById('resumeResult');
  if (loadingEl) {
    loadingEl.innerHTML = '<div class="spinner"></div><span>正在生成简历...</span>';
    loadingEl.style.display = 'flex';
  }
  if (resultEl) resultEl.classList.add('hidden');

  const data = collectAllData();
  const meta = getResumeTemplateMeta();
  const system = `你是一位资深中文简历顾问，请直接输出 Markdown 格式的完整简历正文。
要求：
- 仅输出简历正文，不要解释
- 用 # 作为姓名标题，下一行写联系方式
- 使用 ## 组织模块，使用 ### 组织经历标题
- 经历和项目优先写职责、技术栈、关键成果
- 强调可量化结果，减少空话和套话
- 输出要适合直接导出为正式 PDF

模板风格参考：
${meta.generationHint}`;

  startProcess();
  try {
    let content = await callLLM(system, [
      { role: 'user', content: `请根据以下信息生成简历内容：\n\n${data}` }
    ], { maxTokens: 4096, providerId: getResolvedProviderId('resumeGeneration') });

    if (isProcessCancelled()) return;
    content = stripResumeOutput(content);
    state.resume = content;
    state.resumeGeneratedOnce = true;
    saveSessionData();

    const editor = document.getElementById('resumeMDEditor');
    if (editor) editor.value = content;
    updateResumePreview();
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.classList.remove('hidden');
    syncResumeWorkspace();
  } catch (e) {
    if (loadingEl) {
      loadingEl.innerHTML = `<span style="color:#E74C3C;">生成失败：${e.message}</span>`;
      loadingEl.style.display = 'flex';
    }
  } finally {
    endProcess();
  }
}

function legacyRegenerateResume() {
  legacyGenerateResume();
}

function legacyBuildResumeTemplateCss(templateKey) {
  const activeKey = templateKey === 'custom' ? 'reference' : (templateKey || state.resumeTemplate || 'reference');
  const isCompact = activeKey === 'compact';
  const isReference = activeKey === 'reference';
  return `
    @page { size: A4; margin: ${isCompact ? '13mm 15mm 14mm' : '16mm 18mm 18mm'}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef1f5;
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
      color: #18212f;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .resume-sheet {
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
      background: #ffffff;
      padding: ${isCompact ? '18px 22px 20px' : '26px 30px 28px'};
    }
    .resume-sheet h1 {
      margin: 0;
      text-align: center;
      font-size: ${isCompact ? '24px' : '30px'};
      font-weight: 700;
      letter-spacing: ${isReference ? '0.14em' : '0.06em'};
      color: #111827;
    }
    .resume-sheet h1 + p {
      margin: 8px 0 22px;
      text-align: center;
      font-size: ${isCompact ? '11.5px' : '12.5px'};
      color: #475467;
      letter-spacing: 0.02em;
    }
    .resume-sheet h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: ${isCompact ? '18px' : '22px'} 0 10px;
      font-size: ${isCompact ? '15px' : '16px'};
      font-weight: 700;
      color: #132238;
      letter-spacing: 0.08em;
      text-transform: none;
    }
    .resume-sheet h2::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, #1f3b57, rgba(31, 59, 87, 0.16));
    }
    .resume-sheet h3 {
      margin: 12px 0 6px;
      font-size: ${isCompact ? '13px' : '14px'};
      font-weight: 700;
      color: #1f2937;
    }
    .resume-sheet p,
    .resume-sheet li {
      font-size: ${isCompact ? '11px' : '12px'};
      line-height: ${isCompact ? '1.5' : '1.62'};
      color: #243041;
    }
    .resume-sheet p {
      margin: 4px 0;
    }
    .resume-sheet ul,
    .resume-sheet ol {
      margin: 6px 0 8px;
      padding-left: ${isCompact ? '18px' : '20px'};
    }
    .resume-sheet li {
      margin: 3px 0;
    }
    .resume-sheet strong {
      color: #102033;
      font-weight: 700;
    }
    .resume-photo-banner {
      display: flex;
      justify-content: center;
      margin: 0 0 12px;
    }
    .resume-photo-image {
      width: 86px;
      height: 112px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid rgba(31, 59, 87, 0.12);
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    }
    .resume-sheet hr {
      border: none;
      border-top: 1px solid rgba(31, 59, 87, 0.18);
      margin: 12px 0;
    }
    ${isReference ? `
      .resume-sheet {
        border-top: 6px solid #20364d;
        box-shadow: 0 24px 48px rgba(16, 24, 40, 0.08);
      }
      .resume-sheet h3 + ul li::marker,
      .resume-sheet ul li::marker {
        color: #20364d;
      }
    ` : ''}
  `;
}

function legacyResumeHTML(content, templateKey) {
  const activeKey = templateKey || state.resumeTemplate || 'reference';
  const name = (state.userData && state.userData.name) || '简历';
  const body = renderMarkdown(content || state.resume || '');
  const css = legacyBuildResumeTemplateCss(activeKey);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(name)}</title>
<style>${css}</style>
</head>
<body>
  <main class="resume-sheet resume-template-${activeKey}">
    ${body}
  </main>
</body>
</html>`;
}

function legacyDownloadResumePDFBrowserPrint() {
  const html = legacyResumeHTML(state.resume, state.resumeTemplate);
  const win = window.open('', '_blank', 'width=1100,height=860');
  if (!win) {
    alert('浏览器拦截了导出窗口，请允许弹窗后重试。');
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

function legacyDownloadResumeDOCX() {
  const name = state.userData.name || '简历';
  const inner = legacyResumeHTML(state.resume, state.resumeTemplate);
  const html = inner.replace('<html lang="zh-CN">',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="zh-CN">');
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-简历.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showProcessingToast('简历已导出为 .doc 文件，可用 Word 打开。');
}

function legacyHandleTemplateUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'md', 'docx', 'pdf'].includes(ext)) {
    alert('请上传 .txt、.md、.docx 或 .pdf 格式的模板文件');
    return;
  }

  const statusTargets = ['templateFileName2', 'templateUploadStatus'];
  const setStatus = (msg) => {
    statusTargets.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg;
    });
  };

  setStatus('正在读取模板...');
  const onLoad = (text) => {
    state.customTemplate = text;
    state.resumeTemplate = 'custom';
    saveSessionData();
    legacyRenderResumeTemplateCards();
    legacySyncResumeWorkspace();
    setStatus(`已加载模板：${file.name}`);
  };

  if (ext === 'pdf') {
    extractPdfText(file).then(onLoad).catch(() => setStatus('PDF 模板解析失败'));
  } else if (ext === 'docx') {
    extractDocxText(file).then(onLoad).catch(() => setStatus('DOCX 模板解析失败'));
  } else {
    const reader = new FileReader();
    reader.onload = e => onLoad(e.target.result || '');
    reader.readAsText(file);
  }
}

function legacyGoToTemplatePhase() {
  document.getElementById('contentPhase').classList.add('hidden');
  document.getElementById('templatePhase').classList.remove('hidden');
  document.getElementById('step5Subtitle').textContent = '第二阶段：选择模板并导出最终简历';
  legacyRenderResumeTemplateCards();
  legacySyncResumeWorkspace();
}

function legacyBackToContentPhase() {
  document.getElementById('templatePhase').classList.add('hidden');
  document.getElementById('contentPhase').classList.remove('hidden');
  document.getElementById('step5Subtitle').textContent = '第一阶段：选择模板并生成简历内容，生成后可继续编辑或对话修改';
  legacySyncResumeWorkspace();
}

function legacyRenderExportTemplateCards() {
  legacyRenderResumeTemplateCards();
}

function legacySelectExportTemplate(key) {
  selectResumeTemplate(key);
}

function legacyHandleTemplateUpload2(event) {
  legacyHandleTemplateUpload(event);
}

function legacyExportResume(format) {
  if (format === 'doc') legacyDownloadResumeDOCX();
  else if (format === 'pdf') legacyDownloadResumePDFBrowserPrint();
  else {
    const blob = new Blob([state.resume], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.userData.name || '简历'}.md`;
    a.click();
  }
}

// ===================== Utility =====================
function escHtml(s) {
  return (s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

// ===================== DOM Ready Init =====================
document.addEventListener('DOMContentLoaded', () => {
  try { renderResumeTemplateCards(); } catch (e) {}
  try { syncResumeWorkspace(); } catch (e) {}
  try { if (typeof repairUIStrings === 'function') repairUIStrings(); } catch (e) {}
  try { updateResumePhotoUI(); } catch (e) {}
  try { renderInterviewPrep(); } catch (e) {}
  try {
    const sel = document.getElementById('targetCompanySelect');
    if (sel && state.targetCompany) {
      const presetKeys = ['byte','alibaba','tencent','google','meituan','startup'];
      if (presetKeys.includes(state.targetCompany)) {
        sel.value = state.targetCompany;
      } else {
        sel.value = 'custom';
        const customDiv = document.getElementById('customCompanyInput');
        const customInput = document.getElementById('customCompanyName');
        if (customDiv) customDiv.classList.remove('hidden');
        if (customInput) customInput.value = state.targetCompany;
      }
    }
  } catch (e) {}
  if (state.resume) {
    try { updateResumePreview(); } catch (e) {}
  }
});







// ===================== Resume Workspace Overrides =====================
function getResumeTemplateMeta(templateKey = state.resumeTemplate) {
  if (templateKey === 'custom') {
    const base = RESUME_TEMPLATES.reference;
    return {
      key: 'custom',
      name: '自定义模板',
      desc: '参考上传模板的结构和措辞，沿用默认中文简历的排版骨架。',
      for: '自定义',
      accent: '上传',
      preview: state.customTemplate
        ? state.customTemplate.slice(0, 160)
        : '上传 PDF / DOCX / Markdown 模板后，生成与导出会优先参考该模板内容。',
      generationHint: state.customTemplate
        ? `请参考以下模板内容的模块顺序、措辞和信息颗粒度，但输出必须是新的 Markdown 简历：\n${state.customTemplate.slice(0, 1500)}`
        : base.generationHint,
      pdf: base.pdf
    };
  }
  const tpl = RESUME_TEMPLATES[templateKey] || RESUME_TEMPLATES.reference;
  return { key: templateKey, ...tpl };
}

function getResumeMarkdownSource() {
  const editor = document.getElementById('resumeMDEditor');
  return (editor?.value || state.resume || '').trim();
}

function saveStep5() {
  state.userData.selfEval = document.getElementById('f_self_eval')?.value.trim() || '';
  state.userData.customModules = [];
  document.querySelectorAll('.custom-module').forEach(mod => {
    const name = mod.querySelector('.cm-name')?.value?.trim();
    const items = mod.querySelector('.cm-items')?.value?.trim();
    if (name && items) state.userData.customModules.push({ name, items });
  });

  saveSessionData();
  document.getElementById('contentPhase').classList.remove('hidden');
  document.getElementById('templatePhase').classList.add('hidden');
  document.getElementById('resumeLoading').style.display = 'none';
  goStep(2);
  renderResumeTemplateCards();
  syncResumeWorkspace();
  if (state.resume) updateResumePreview();
}

function renderResumeTemplateCards() {
  const targets = ['generationTemplateCards', 'exportTemplateCards'];
  const cards = Object.entries(RESUME_TEMPLATES).map(([key, tpl]) => {
    const selected = state.resumeTemplate === key;
    return `
      <button type="button" class="template-preview-card ${selected ? 'selected' : ''}" onclick="selectResumeTemplate('${key}')">
        <div class="check-badge">✓</div>
        <div class="tpl-name">
          <span>${tpl.name}</span>
          <span class="provider-badge ${selected ? 'active-badge' : 'inactive-badge'}">${tpl.accent || '模板'}</span>
        </div>
        <div class="tpl-desc">${tpl.desc}</div>
        <div class="tpl-for">${tpl.for}</div>
        <div class="tpl-preview">${escHtml(tpl.preview)}</div>
      </button>
    `;
  }).join('');

  const customSelected = state.resumeTemplate === 'custom';
  const customMeta = getResumeTemplateMeta('custom');
  const customCard = `
    <button type="button" class="template-preview-card ${customSelected ? 'selected' : ''}" onclick="selectResumeTemplate('custom')">
      <div class="check-badge">✓</div>
      <div class="tpl-name">
        <span>自定义模板</span>
        <span class="provider-badge ${customSelected ? 'active-badge' : 'inactive-badge'}">上传</span>
      </div>
      <div class="tpl-desc">${customMeta.desc}</div>
      <div class="tpl-for">${customMeta.for}</div>
      <div class="tpl-preview">${escHtml(customMeta.preview)}</div>
    </button>
  `;

  targets.forEach(id => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = cards + customCard;
  });
}

function selectResumeTemplate(key) {
  state.resumeTemplate = key;
  saveSessionData();
  renderResumeTemplateCards();
  syncResumeWorkspace();
  updateResumePreview();
}

function getJsPdfCtor() {
  return window.jspdf?.jsPDF || window.jsPDF || null;
}

// CJK font loading for Chinese PDF support
var _cjkFontReady = false;
var _cjkFontName = 'NotoSansSC';
var _cjkFontBase64 = null;
var _cjkFontExt = '';

async function ensureCjkFont() {
  if (_cjkFontReady) return _cjkFontName;
  var jsPdf = getJsPdfCtor();
  if (!jsPdf) return null;

  // If we have cached base64 from localStorage, try it first
  if (_cjkFontBase64) {
    try {
      var filename = _cjkFontName + (_cjkFontExt ? '.' + _cjkFontExt : '.ttf');
      jsPdf.addFileToVFS(filename, _cjkFontBase64);
      jsPdf.addFont(filename, _cjkFontName, 'normal');
      _cjkFontReady = true;
      return _cjkFontName;
    } catch (e) { _cjkFontBase64 = null; }
  }

  // Try multiple CDN sources with timeout fallback
  var urls = [
    'https://cdn.jsdelivr.net/npm/@aspect-dev/cjk-fonts@1.0.0/NotoSansSC-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf',
    'https://unpkg.com/@aspect-dev/cjk-fonts@1.0.0/NotoSansSC-Regular.ttf',
    'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf'
  ];

  for (var u = 0; u < urls.length; u++) {
    try {
      var controller = new AbortController();
      var timeout = setTimeout(function() { controller.abort(); }, 12000);
      var resp = await fetch(urls[u], { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) continue;
      var buf = await resp.arrayBuffer();
      var bytes = new Uint8Array(buf);
      var base64 = '';
      for (var i = 0; i < bytes.length; i++) {
        base64 += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(base64);
      var ext = urls[u].split('.').pop();
      var filename = _cjkFontName + '.' + ext;
      jsPdf.addFileToVFS(filename, base64);
      jsPdf.addFont(filename, _cjkFontName, 'normal');
      // Cache for subsequent exports in this session
      _cjkFontBase64 = base64;
      _cjkFontExt = ext;
      _cjkFontReady = true;
      return _cjkFontName;
    } catch (e) {
      continue;
    }
  }
  return null;
}

function getResumePdfLayout(templateKey = state.resumeTemplate, compressionIndex = 0) {
  const meta = getResumeTemplateMeta(templateKey);
  const pdf = meta.pdf || RESUME_TEMPLATES.reference.pdf;
  const preset = pdf.compression[Math.min(compressionIndex, pdf.compression.length - 1)] || pdf.compression[0];
  const font = {};
  Object.entries(pdf.font).forEach(([key, value]) => {
    font[key] = value * preset.fontScale;
  });
  const spacing = {};
  Object.entries(pdf.spacing).forEach(([key, value]) => {
    spacing[key] = value * preset.spacingScale;
  });
  return {
    key: meta.key,
    name: meta.name,
    margins: pdf.margins,
    font,
    spacing,
    lineHeight: {
      body: pdf.lineHeight.body * preset.lineScale,
      tight: pdf.lineHeight.tight * preset.lineScale,
      heading: pdf.lineHeight.heading * preset.lineScale
    },
    compressionIndex,
    pageWidth: 210,
    pageHeight: 297,
    usableWidth: 210 - pdf.margins.left - pdf.margins.right,
    usableHeight: 297 - pdf.margins.top - pdf.margins.bottom,
    bulletIndent: spacing.bulletIndent
  };
}

function parseResumeMarkdownBlocks(markdown) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderMarkdown(markdown || '');
  const blocks = [];
  Array.from(wrapper.children).forEach((node, index) => {
    const tag = node.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      blocks.push({
        type: tag,
        items: Array.from(node.children).map(li => li.textContent.trim()).filter(Boolean)
      });
      return;
    }
    if (tag === 'hr') {
      blocks.push({ type: 'hr' });
      return;
    }
    const text = (node.textContent || '').trim();
    if (!text) return;
    blocks.push({
      type: tag,
      text,
      isContact: tag === 'p' && index === 1 && wrapper.children[0]?.tagName?.toLowerCase() === 'h1'
    });
  });
  return blocks;
}

function getPdfLineHeightMm(fontSize, factor) {
  return fontSize * factor * 0.3528;
}

function getPdfBlockHeight(doc, block, spec) {
  if (block.type === 'h1') {
    const lines = doc.splitTextToSize(block.text, spec.usableWidth);
    return lines.length * getPdfLineHeightMm(spec.font.h1, spec.lineHeight.heading) + spec.spacing.afterH1;
  }
  if (block.type === 'h2') {
    return spec.spacing.beforeH2 + getPdfLineHeightMm(spec.font.h2, spec.lineHeight.heading) + spec.spacing.afterH2;
  }
  if (block.type === 'h3') {
    const lines = doc.splitTextToSize(block.text, spec.usableWidth);
    return spec.spacing.beforeH3 + lines.length * getPdfLineHeightMm(spec.font.h3, spec.lineHeight.heading) + spec.spacing.afterH3;
  }
  if (block.type === 'p') {
    const fontSize = block.isContact ? spec.font.meta : spec.font.body;
    const lines = doc.splitTextToSize(block.text, spec.usableWidth);
    return lines.length * getPdfLineHeightMm(fontSize, spec.lineHeight.body) + (block.isContact ? spec.spacing.afterContact : spec.spacing.afterParagraph);
  }
  if (block.type === 'ul' || block.type === 'ol') {
    let total = 0;
    block.items.forEach(item => {
      const lines = doc.splitTextToSize(item, spec.usableWidth - spec.bulletIndent);
      total += lines.length * getPdfLineHeightMm(spec.font.body, spec.lineHeight.tight) + (spec.spacing.afterParagraph * 0.5);
    });
    return total + spec.spacing.afterList;
  }
  if (block.type === 'hr') return 4;
  return 0;
}

function chooseResumeCompressionIndex(markdown) {
  const blocks = parseResumeMarkdownBlocks(markdown);
  const jsPdfCtor = getJsPdfCtor();
  if (!jsPdfCtor || blocks.length === 0) {
    return { compressionIndex: 0, pageCount: 1, blocks };
  }

  const compressionList = getResumeTemplateMeta().pdf.compression;
  for (let i = 0; i < compressionList.length; i++) {
    const doc = new jsPdfCtor({ unit: 'mm', format: 'a4', compress: true });
    const spec = getResumePdfLayout(state.resumeTemplate, i);
    let pageCount = 1;
    let y = spec.margins.top + (state.userData?.photoDataUrl ? 34 : 0);
    blocks.forEach(block => {
      const height = getPdfBlockHeight(doc, block, spec);
      if (y + height > spec.pageHeight - spec.margins.bottom) {
        pageCount += 1;
        y = spec.margins.top;
      }
      y += height;
    });
    if (pageCount === 1 || i === compressionList.length - 1) {
      return { compressionIndex: i, pageCount, blocks };
    }
  }

  return { compressionIndex: 0, pageCount: 1, blocks };
}

function buildResumeTemplateCss(templateKey, compressionIndex = 0) {
  const spec = getResumePdfLayout(templateKey, compressionIndex);
  const mm = value => `${value.toFixed(2)}mm`;
  const pt = value => `${value.toFixed(2)}pt`;
  return `
    :root {
      --resume-font-h1: ${pt(spec.font.h1)};
      --resume-font-h2: ${pt(spec.font.h2)};
      --resume-font-h3: ${pt(spec.font.h3)};
      --resume-font-body: ${pt(spec.font.body)};
      --resume-font-meta: ${pt(spec.font.meta)};
      --resume-gap-after-h1: ${mm(spec.spacing.afterH1)};
      --resume-gap-after-contact: ${mm(spec.spacing.afterContact)};
      --resume-gap-before-h2: ${mm(spec.spacing.beforeH2)};
      --resume-gap-after-h2: ${mm(spec.spacing.afterH2)};
      --resume-gap-before-h3: ${mm(spec.spacing.beforeH3)};
      --resume-gap-after-h3: ${mm(spec.spacing.afterH3)};
      --resume-gap-after-p: ${mm(spec.spacing.afterParagraph)};
      --resume-gap-after-list: ${mm(spec.spacing.afterList)};
      --resume-line-body: ${spec.lineHeight.body.toFixed(2)};
      --resume-line-tight: ${spec.lineHeight.tight.toFixed(2)};
      --resume-line-heading: ${spec.lineHeight.heading.toFixed(2)};
    }
    @page { size: A4; margin: ${spec.margins.top}mm ${spec.margins.right}mm ${spec.margins.bottom}mm ${spec.margins.left}mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      color: #162033;
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .resume-sheet {
      width: 100%;
      max-width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: ${spec.margins.top}mm ${spec.margins.right}mm ${spec.margins.bottom}mm ${spec.margins.left}mm;
      background: #ffffff;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      border-top: 4px solid #1f3b57;
    }
    .resume-sheet h1 {
      margin: 0 0 var(--resume-gap-after-h1);
      font-size: var(--resume-font-h1);
      line-height: var(--resume-line-heading);
      text-align: center;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #111827;
    }
    .resume-sheet h1 + p {
      margin: 0 0 var(--resume-gap-after-contact);
      font-size: var(--resume-font-meta);
      line-height: var(--resume-line-body);
      text-align: center;
      color: #334155;
    }
    .resume-sheet h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: var(--resume-gap-before-h2) 0 var(--resume-gap-after-h2);
      font-size: var(--resume-font-h2);
      line-height: var(--resume-line-heading);
      font-weight: 700;
      color: #10243a;
      letter-spacing: 0.04em;
    }
    .resume-sheet h2::after {
      content: '';
      flex: 1;
      border-top: 1.25px solid rgba(31, 59, 87, 0.32);
    }
    .resume-sheet h3 {
      margin: var(--resume-gap-before-h3) 0 var(--resume-gap-after-h3);
      font-size: var(--resume-font-h3);
      line-height: var(--resume-line-heading);
      font-weight: 700;
      color: #16263f;
    }
    .resume-sheet p,
    .resume-sheet li {
      margin: 0;
      font-size: var(--resume-font-body);
      line-height: var(--resume-line-body);
      color: #1f2937;
    }
    .resume-sheet p { margin-bottom: var(--resume-gap-after-p); }
    .resume-sheet ul,
    .resume-sheet ol {
      margin: 0 0 var(--resume-gap-after-list);
      padding-left: 18px;
    }
    .resume-sheet li {
      margin-bottom: calc(var(--resume-gap-after-p) * 0.65);
      line-height: var(--resume-line-tight);
    }
    .resume-sheet li::marker { color: #1f3b57; }
    .resume-sheet strong {
      color: #0f172a;
      font-weight: 700;
    }
    .resume-sheet hr {
      margin: 8px 0;
      border: none;
      border-top: 1px solid rgba(31, 59, 87, 0.18);
    }
  `;
}

function buildResumePhotoMarkup() {
  const photoDataUrl = state.userData?.photoDataUrl || '';
  if (!photoDataUrl) return '';
  return `<div class="resume-photo-banner"><img src="${photoDataUrl}" alt="resume photo" class="resume-photo-image" /></div>`;
}

function resumeHTML(content, templateKey, compressionIndex = state.resumeLayoutCompressionIndex || 0) {
  const activeKey = templateKey || state.resumeTemplate || 'reference';
  const name = (state.userData && state.userData.name) || '简历';
  const body = renderMarkdown(content || state.resume || '');
  const css = buildResumeTemplateCss(activeKey, compressionIndex);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(name)}</title>
<style>${css}</style>
</head>
<body class="resume-template-${activeKey}">
  <main class="resume-sheet">
    ${buildResumePhotoMarkup()}
    ${body}
  </main>
</body>
</html>`;
}

function applyResumePreviewTheme(compressionIndex = state.resumeLayoutCompressionIndex || 0) {
  const preview = document.getElementById('resumePreviewContent');
  const previewShell = document.getElementById('resumePreviewMode');
  if (!preview || !previewShell) return;

  const spec = getResumePdfLayout(state.resumeTemplate, compressionIndex);
  previewShell.style.padding = '20px 22px';
  previewShell.style.background = '#f8fafc';
  previewShell.style.border = '1px solid rgba(31,59,87,0.10)';

  preview.style.maxWidth = '794px';
  preview.style.margin = '0 auto';
  preview.style.padding = `${spec.margins.top}mm ${spec.margins.right}mm ${spec.margins.bottom}mm ${spec.margins.left}mm`;
  preview.style.background = '#ffffff';
  preview.style.boxShadow = '0 18px 36px rgba(15,23,42,0.08)';
  preview.style.borderTop = '4px solid #1f3b57';
  preview.style.transformOrigin = 'top center';
  preview.style.transform = 'scale(1)';

  preview.querySelectorAll('h1').forEach(el => {
    el.style.fontSize = `${spec.font.h1 * 1.34}px`;
    el.style.lineHeight = spec.lineHeight.heading.toFixed(2);
    el.style.margin = `0 0 ${spec.spacing.afterH1 * 3.2}px`;
    el.style.textAlign = 'center';
  });
  preview.querySelectorAll('h2').forEach(el => {
    el.style.fontSize = `${spec.font.h2 * 1.34}px`;
    el.style.lineHeight = spec.lineHeight.heading.toFixed(2);
    el.style.margin = `${spec.spacing.beforeH2 * 3.2}px 0 ${spec.spacing.afterH2 * 3.2}px`;
    el.style.paddingBottom = '4px';
    el.style.borderBottom = '1px solid rgba(31,59,87,0.28)';
  });
  preview.querySelectorAll('h3').forEach(el => {
    el.style.fontSize = `${spec.font.h3 * 1.34}px`;
    el.style.lineHeight = spec.lineHeight.heading.toFixed(2);
    el.style.margin = `${spec.spacing.beforeH3 * 3.2}px 0 ${spec.spacing.afterH3 * 3.2}px`;
  });
  preview.querySelectorAll('p').forEach((el, index) => {
    el.style.fontSize = `${(index === 0 ? spec.font.meta : spec.font.body) * 1.34}px`;
    el.style.lineHeight = spec.lineHeight.body.toFixed(2);
    el.style.margin = `0 0 ${(index === 0 ? spec.spacing.afterContact : spec.spacing.afterParagraph) * 3.2}px`;
    if (index === 0) {
      el.style.textAlign = 'center';
      el.style.color = '#334155';
    }
  });
  preview.querySelectorAll('ul,ol').forEach(el => {
    el.style.margin = `0 0 ${spec.spacing.afterList * 3.2}px`;
    el.style.paddingLeft = '18px';
  });
  preview.querySelectorAll('li').forEach(el => {
    el.style.fontSize = `${spec.font.body * 1.34}px`;
    el.style.lineHeight = spec.lineHeight.tight.toFixed(2);
    el.style.margin = `0 0 ${Math.max(spec.spacing.afterParagraph * 2, 4)}px`;
  });

  requestAnimationFrame(() => {
    const targetHeight = 1123;
    const currentHeight = preview.scrollHeight;
    if (currentHeight > targetHeight) {
      const scale = Math.max(0.88, targetHeight / currentHeight);
      preview.style.transform = `scale(${scale.toFixed(3)})`;
    }
  });
}

function updateResumePreview() {
  const previewEl = document.getElementById('resumePreviewContent');
  if (!previewEl) return;
  const markdown = getResumeMarkdownSource();
  state.resume = markdown;
  previewEl.innerHTML = buildResumePhotoMarkup() + renderMarkdown(markdown);
  const fit = chooseResumeCompressionIndex(markdown);
  state.resumeLayoutCompressionIndex = fit.compressionIndex;
  applyResumePreviewTheme(state.resumeLayoutCompressionIndex);
  saveSessionData();
}

function syncResumeWorkspace() {
  const hasResume = !!getResumeMarkdownSource();
  if (hasResume && !state.resumeGeneratedOnce) state.resumeGeneratedOnce = true;

  const startBtn = document.getElementById('btnStartResumeGenerate');
  const startHint = document.getElementById('resumeStartHint');
  const regenBtn = document.getElementById('btnRegenerateResume');
  const result = document.getElementById('resumeResult');
  const editor = document.getElementById('resumeMDEditor');
  const previewBadge = document.getElementById('currentTemplateBadge');
  const exportLabel = document.getElementById('exportTemplateSummary');
  const meta = getResumeTemplateMeta();

  if (startBtn) startBtn.textContent = state.resumeGeneratedOnce ? '\u91cd\u65b0\u751f\u6210\u7b80\u5386' : '\u5f00\u59cb\u751f\u6210\u7b80\u5386';
  if (startHint) {
    startHint.textContent = state.resumeGeneratedOnce
      ? `\u5f53\u524d\u6a21\u677f\uff1a${meta.name}\u3002\u53ef\u4ee5\u7ee7\u7eed\u7f16\u8f91\uff0c\u6216\u5207\u6362\u6a21\u677f\u540e\u91cd\u65b0\u751f\u6210\u3002`
      : `\u5148\u9009\u6a21\u677f\uff0c\u518d\u5f00\u59cb\u751f\u6210\u3002\u5f53\u524d\u9ed8\u8ba4\u6a21\u677f\uff1a${meta.name}\u3002`;
  }
  if (regenBtn) regenBtn.disabled = !state.resumeGeneratedOnce;
  if (result) result.classList.toggle('hidden', !hasResume);
  if (editor && state.resume && editor.value !== state.resume) editor.value = state.resume;
  if (previewBadge) previewBadge.textContent = `\u5f53\u524d\u6a21\u677f\uff1a${meta.name}`;
  if (exportLabel) exportLabel.textContent = `\u5bfc\u51fa\u5c06\u4f7f\u7528\u300c${meta.name}\u300d\u6837\u5f0f`;
}

async function generateResume() {
  const loadingEl = document.getElementById('resumeLoading');
  const resultEl = document.getElementById('resumeResult');
  if (loadingEl) {
    loadingEl.innerHTML = '<div class="spinner"></div><span>\u6b63\u5728\u751f\u6210\u7b80\u5386...</span>';
    loadingEl.style.display = 'flex';
  }
  if (resultEl) resultEl.classList.add('hidden');

  const data = collectAllData();
  const meta = getResumeTemplateMeta();
  const system = `\u4f60\u662f\u4e00\u4f4d\u8d44\u6df1\u4e2d\u6587\u7b80\u5386\u987e\u95ee\uff0c\u8bf7\u76f4\u63a5\u8f93\u51fa Markdown \u683c\u5f0f\u7684\u5b8c\u6574\u7b80\u5386\u6b63\u6587\u3002
\u8981\u6c42\uff1a
- \u53ea\u8f93\u51fa\u7b80\u5386\u6b63\u6587\uff0c\u4e0d\u8981\u89e3\u91ca\u548c\u524d\u540e\u7f00
- \u7528 # \u4f5c\u4e3a\u59d3\u540d\u6807\u9898\uff0c\u4e0b\u4e00\u884c\u5199\u8054\u7cfb\u65b9\u5f0f
- \u4f7f\u7528 ## \u7ec4\u7ec7\u4e3b\u8981\u6a21\u5757\uff0c\u4f7f\u7528 ### \u7ec4\u7ec7\u7ecf\u5386\u6807\u9898
- \u9879\u76ee\u4e0e\u7ecf\u5386\u4f18\u5148\u5199\u6280\u672f\u6808\u3001\u804c\u8d23\u3001\u6210\u679c
- \u6210\u679c\u5c3d\u91cf\u91cf\u5316\uff0c\u51cf\u5c11\u7a7a\u8bdd
- \u751f\u6210\u7ed3\u679c\u8981\u9002\u5408\u4e00\u9875\u5f0f\u4e13\u4e1a\u7b80\u5386

\u6a21\u677f\u98ce\u683c\u53c2\u8003\uff1a
${meta.generationHint}`;

  startProcess();
  try {
    let content = await callLLM(system, [
      { role: 'user', content: `\u8bf7\u6839\u636e\u4ee5\u4e0b\u4fe1\u606f\u751f\u6210\u7b80\u5386\u5185\u5bb9\uff1a\n\n${data}` }
    ], { maxTokens: 4096, providerId: getResolvedProviderId('resumeGeneration') });

    if (isProcessCancelled()) return;
    content = stripResumeOutput(content);
    state.resume = content;
    state.resumeGeneratedOnce = true;
    const fit = chooseResumeCompressionIndex(content);
    state.resumeLayoutCompressionIndex = fit.compressionIndex;
    saveSessionData();

    const editor = document.getElementById('resumeMDEditor');
    if (editor) editor.value = content;
    updateResumePreview();
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.classList.remove('hidden');
    syncResumeWorkspace();
  } catch (e) {
    if (loadingEl) {
      loadingEl.innerHTML = `<span style="color:#E74C3C;">\u751f\u6210\u5931\u8d25\uff1a${e.message}</span>`;
      loadingEl.style.display = 'flex';
    }
  } finally {
    endProcess();
  }
}

function regenerateResume() {
  generateResume();
}

function drawResumeSectionRule(doc, spec, y) {
  doc.setDrawColor(31, 59, 87);
  doc.setLineWidth(0.25);
  doc.line(spec.margins.left + 18, y - 1.1, spec.pageWidth - spec.margins.right, y - 1.1);
}

function renderResumePdf(doc, blocks, spec) {
  const maxY = spec.pageHeight - spec.margins.bottom;
  let y = spec.margins.top;
  let pageCount = 1;
  const photoDataUrl = state.userData?.photoDataUrl || '';
  const photoWidth = 24;
  const photoHeight = 32;
  const ensureSpace = (height) => {
    if (y + height <= maxY) return;
    doc.addPage();
    pageCount += 1;
    y = spec.margins.top;
  };

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'JPEG', (spec.pageWidth - photoWidth) / 2, y, photoWidth, photoHeight, undefined, 'FAST');
    } catch {
      try {
        doc.addImage(photoDataUrl, 'PNG', (spec.pageWidth - photoWidth) / 2, y, photoWidth, photoHeight, undefined, 'FAST');
      } catch {}
    }
    y += photoHeight + 4;
  }

  blocks.forEach((block) => {
    const height = getPdfBlockHeight(doc, block, spec);
    ensureSpace(height);

    if (block.type === 'h1') {
      doc.setFont(_cjkFontReady ? _cjkFontName : 'helvetica', 'bold');
      doc.setFontSize(spec.font.h1);
      doc.splitTextToSize(block.text, spec.usableWidth).forEach(line => {
        doc.text(line, spec.pageWidth / 2, y, { align: 'center' });
        y += getPdfLineHeightMm(spec.font.h1, spec.lineHeight.heading);
      });
      y += spec.spacing.afterH1;
      return;
    }

    if (block.type === 'h2') {
      y += spec.spacing.beforeH2;
      doc.setFont(_cjkFontReady ? _cjkFontName : 'helvetica', 'bold');
      doc.setFontSize(spec.font.h2);
      doc.text(block.text, spec.margins.left, y);
      drawResumeSectionRule(doc, spec, y);
      y += spec.spacing.afterH2;
      return;
    }

    if (block.type === 'h3') {
      y += spec.spacing.beforeH3;
      doc.setFont(_cjkFontReady ? _cjkFontName : 'helvetica', 'bold');
      doc.setFontSize(spec.font.h3);
      doc.splitTextToSize(block.text, spec.usableWidth).forEach(line => {
        doc.text(line, spec.margins.left, y);
        y += getPdfLineHeightMm(spec.font.h3, spec.lineHeight.heading);
      });
      y += spec.spacing.afterH3;
      return;
    }

    if (block.type === 'p') {
      const fontSize = block.isContact ? spec.font.meta : spec.font.body;
      doc.setFont(_cjkFontReady ? _cjkFontName : 'helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.splitTextToSize(block.text, spec.usableWidth).forEach(line => {
        doc.text(line, block.isContact ? spec.pageWidth / 2 : spec.margins.left, y, { align: block.isContact ? 'center' : 'left' });
        y += getPdfLineHeightMm(fontSize, spec.lineHeight.body);
      });
      y += block.isContact ? spec.spacing.afterContact : spec.spacing.afterParagraph;
      return;
    }

    if (block.type === 'ul' || block.type === 'ol') {
      doc.setFont(_cjkFontReady ? _cjkFontName : 'helvetica', 'normal');
      doc.setFontSize(spec.font.body);
      block.items.forEach((item, idx) => {
        const marker = block.type === 'ol' ? `${idx + 1}.` : '\u2022';
        doc.splitTextToSize(item, spec.usableWidth - spec.bulletIndent).forEach((line, lineIndex) => {
          if (lineIndex === 0) doc.text(marker, spec.margins.left, y);
          doc.text(line, spec.margins.left + spec.bulletIndent, y);
          y += getPdfLineHeightMm(spec.font.body, spec.lineHeight.tight);
        });
        y += spec.spacing.afterParagraph * 0.5;
      });
      y += spec.spacing.afterList;
      return;
    }

    if (block.type === 'hr') {
      doc.setDrawColor(180, 190, 201);
      doc.setLineWidth(0.2);
      doc.line(spec.margins.left, y, spec.pageWidth - spec.margins.right, y);
      y += 4;
    }
  });

  return pageCount;
}

async function downloadResumePDF() {
  const markdown = getResumeMarkdownSource();
  if (!markdown) {
    alert('\u8bf7\u5148\u751f\u6210\u6216\u586b\u5199\u7b80\u5386\u5185\u5bb9\u3002');
    return;
  }

  const fontName = await ensureCjkFont();
  const jsPdfCtor = getJsPdfCtor();
  if (!fontName || !jsPdfCtor) {
    alert('PDF \u7ec4\u4ef6\u6216\u4e2d\u6587\u5b57\u4f53\u672a\u6b63\u786e\u52a0\u8f7d\u3002\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u540e\u91cd\u8bd5\uff0c\u6216\u9009\u62e9\u5bfc\u51fa DOC / Markdown \u683c\u5f0f\u3002');
    return;
  }

  try {
    const fit = chooseResumeCompressionIndex(markdown);
    state.resumeLayoutCompressionIndex = fit.compressionIndex;
    const doc = new jsPdfCtor({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
    const spec = getResumePdfLayout(state.resumeTemplate, fit.compressionIndex);
    const pageCount = renderResumePdf(doc, fit.blocks, spec);
    const fileName = (state.userData.name || '\u7b80\u5386') + '-\u7b80\u5386.pdf';
    doc.save(fileName);
    saveSessionData();
    updateResumePreview();
    showProcessingToast(pageCount > 1 ? '\u5df2\u5bfc\u51fa PDF\uff08\u81ea\u52a8\u5206\u9875\uff09' : '\u5df2\u5bfc\u51fa PDF');
  } catch (e) {
    console.error('PDF export failed:', e);
    alert('PDF \u5bfc\u51fa\u5931\u8d25\uff1a' + e.message);
  }
}

function downloadResumeDOCX() {
  const name = state.userData.name || '\u7b80\u5386';
  const html = resumeHTML(getResumeMarkdownSource(), state.resumeTemplate, state.resumeLayoutCompressionIndex).replace(
    '<html lang="zh-CN">',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="zh-CN">'
  );
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-\u7b80\u5386.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showProcessingToast('\u7b80\u5386\u5df2\u5bfc\u51fa\u4e3a DOC \u6587\u4ef6');
}

function handleTemplateUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'md', 'docx', 'pdf'].includes(ext)) {
    alert('\u8bf7\u4e0a\u4f20 .txt\u3001.md\u3001.docx \u6216 .pdf \u683c\u5f0f\u7684\u6a21\u677f\u6587\u4ef6');
    return;
  }

  const setStatus = (msg) => {
    ['templateFileName2', 'templateUploadStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg;
    });
  };

  setStatus(`\u6b63\u5728\u8bfb\u53d6\u6a21\u677f\uff1a${file.name}`);
  const onLoad = (text) => {
    state.customTemplate = text || '';
    state.resumeTemplate = 'custom';
    saveSessionData();
    renderResumeTemplateCards();
    syncResumeWorkspace();
    if (state.resume) updateResumePreview();
    setStatus(`\u5df2\u52a0\u8f7d\u6a21\u677f\uff1a${file.name}`);
  };

  if (ext === 'pdf') {
    extractPdfText(file).then(onLoad).catch(() => setStatus('PDF \u6a21\u677f\u89e3\u6790\u5931\u8d25'));
  } else if (ext === 'docx') {
    extractDocxText(file).then(onLoad).catch(() => setStatus('DOCX \u6a21\u677f\u89e3\u6790\u5931\u8d25'));
  } else {
    const reader = new FileReader();
    reader.onload = e => onLoad(e.target.result || '');
    reader.readAsText(file);
  }
}

function goToTemplatePhase() {
  document.getElementById('contentPhase').classList.add('hidden');
  document.getElementById('templatePhase').classList.remove('hidden');
  document.getElementById('step5Subtitle').textContent = '\u7b2c\u4e8c\u9636\u6bb5\uff1a\u9009\u62e9\u6a21\u677f\u5e76\u5bfc\u51fa\u6700\u7ec8\u7b80\u5386';
  renderResumeTemplateCards();
  syncResumeWorkspace();
}

function backToContentPhase() {
  document.getElementById('templatePhase').classList.add('hidden');
  document.getElementById('contentPhase').classList.remove('hidden');
  document.getElementById('step5Subtitle').textContent = '\u7b2c\u4e00\u9636\u6bb5\uff1a\u9009\u62e9\u6a21\u677f\u5e76\u751f\u6210\u7b80\u5386\u5185\u5bb9\uff0c\u751f\u6210\u540e\u53ef\u7ee7\u7eed\u7f16\u8f91\u6216\u5bf9\u8bdd\u4fee\u6539';
  syncResumeWorkspace();
}

function renderExportTemplateCards() {
  renderResumeTemplateCards();
}

function selectExportTemplate(key) {
  selectResumeTemplate(key);
}

function handleTemplateUpload2(event) {
  handleTemplateUpload(event);
}

function exportResume(format) {
  if (format === 'doc') downloadResumeDOCX();
  else if (format === 'pdf') downloadResumePDF();
  else {
    const blob = new Blob([getResumeMarkdownSource()], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.userData.name || '\u7b80\u5386'}.md`;
    a.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try { renderResumeTemplateCards(); } catch (e) {}
  try { syncResumeWorkspace(); } catch (e) {}
  try { if (typeof repairUIStrings === 'function') repairUIStrings(); } catch (e) {}
  try { updateResumePhotoUI(); } catch (e) {}
  try { renderInterviewPrep(); } catch (e) {}
  try {
    const sel = document.getElementById('targetCompanySelect');
    if (sel && state.targetCompany) {
      const presetKeys = ['byte','alibaba','tencent','google','meituan','startup'];
      if (presetKeys.includes(state.targetCompany)) {
        sel.value = state.targetCompany;
      } else {
        sel.value = 'custom';
        const customDiv = document.getElementById('customCompanyInput');
        const customInput = document.getElementById('customCompanyName');
        if (customDiv) customDiv.classList.remove('hidden');
        if (customInput) customInput.value = state.targetCompany;
      }
    }
  } catch (e) {}
  if (state.resume) {
    try { updateResumePreview(); } catch (e) {}
  }
});