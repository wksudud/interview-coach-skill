// ===================== Event Binding Framework =====================
// All DOM events are registered here. HTML contains NO inline event handlers.

function bindId(id, event, fn) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(event, fn);
  } else {
    console.warn('init.js: element not found for bindId:', id);
  }
}

function delegate(parent, event, selector, fn) {
  if (typeof parent === 'string') parent = document.getElementById(parent);
  if (!parent) { console.warn('init.js: parent not found for delegate:', parent); return; }
  parent.addEventListener(event, function(e) {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      fn.call(target, e);
    }
  });
}

function bindButtonsByText(textMap) {
  document.querySelectorAll('button').forEach(btn => {
    const text = (btn.textContent || '').trim();
    if (textMap[text] && !btn.id && !btn.dataset.action) {
      btn.addEventListener('click', textMap[text]);
    }
  });
}

// ===================== Initialization =====================
function initEventBindings() {
  // ---- Entry Section ----
  bindId('btnNewResume', 'click', () => { state.mode = 'new'; startResumeCollection(); });
  bindId('btnImportResume', 'click', () => { state.mode = 'import'; startResumeImport(); });
  bindId('btnClearSession', 'click', clearSessionAndReset);

  // ---- Sidebar Navigation ----
  delegate('progressSteps', 'click', '.step-dot', function(e) {
    const step = parseInt(this.dataset.step);
    if (!isNaN(step)) navigateToStep(step);
  });

  // ---- Resume Substep Chips ----
  delegate(document, 'click', '.substep-chip', function(e) {
    const substep = this.dataset.substep;
    if (substep) showResumeSubstep(substep);
  });

  // ---- Resume Form Navigation ----
  bindId('btnSubstepNext', 'click', advanceResumeSubstep);
  bindId('btnSubstepPrev', 'click', prevResumeSubstep);

  // ---- Step 5: Resume Generation ----
  bindId('btnGenerateResume', 'click', generateResume);
  bindId('btnRegenerateResume', 'click', () => generateResume());
  bindId('btnStartOptimize', 'click', startOptimize);
  bindId('btnConfirmTemplate', 'click', confirmTemplate);

  // Template selection
  delegate(document, 'click', '.template-preview-card', function(e) {
    const tplKey = this.dataset.template;
    if (tplKey && RESUME_TEMPLATES[tplKey]) {
      state.resumeTemplate = tplKey;
      renderResumeTemplateCards();
    }
  });

  // PDF export
  bindId('btnExportPdf', 'click', downloadResumePDF);
  bindId('btnExportDoc', 'click', downloadResumeDOC);
  bindId('btnExportMd', 'click', downloadResumeMD);

  // ---- Step 6: Career Match ----
  bindId('btnGenerateMatch', 'click', generateCareerMatch);
  delegate(document, 'click', '[data-action="select-match"]', function(e) {
    const choice = this.dataset.choice;
    if (choice) selectMatchChoice(choice);
  });

  // ---- Step 7: Job Search ----
  bindId('btnSearchJobs', 'click', searchJobs);
  bindId('btnCancelJobSearch', 'click', cancelJobSearch);
  delegate(document, 'click', '.platform-chip', function(e) {
    this.classList.toggle('active');
    updateJobSearchConfig();
  });

  // ---- Step 8: Resume Optimization ----
  bindId('btnRunOptimize', 'click', runOptimize);
  bindId('btnAcceptOptimize', 'click', acceptOptimize);
  delegate(document, 'click', '[data-action="regenerate-optimize"]', 'click', () => regenerateOptimizeResume());

  // ---- Step 9: Interview ----
  bindId('btnStartInterview', 'click', startInterview);
  bindId('btnSendAnswer', 'click', sendInterviewAnswer);
  bindId('btnEndInterview', 'click', endInterview);
  bindId('btnNextQuestion', 'click', nextInterviewQuestion);
  bindId('btnShowReference', 'click', showReferenceAnswer);

  // Interview input - Enter key
  bindId('interviewInput', 'keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendInterviewAnswer();
    }
  });

  // ---- Application Tracker ----
  bindId('btnAddApplication', 'click', addApplication);
  bindId('btnExportApplications', 'click', exportApplicationsCSV);
  delegate(document, 'click', '[data-action="delete-application"]', function(e) {
    const idx = parseInt(this.dataset.index);
    if (!isNaN(idx)) deleteApplication(idx);
  });
  delegate(document, 'click', '[data-action="edit-application"]', function(e) {
    const idx = parseInt(this.dataset.index);
    if (!isNaN(idx)) editApplication(idx);
  });

  // ---- API Provider Selection ----
  delegate(document, 'click', '.provider-card', function(e) {
    const pid = this.dataset.provider;
    if (pid && !this.classList.contains('active')) {
      switchProvider(pid);
    }
  });

  // ---- Global ----
  bindId('btnBackToTop', 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ---- Step model bars (dynamic) ----
  delegate(document, 'change', '.step-model-select', function(e) {
    const stepRole = this.dataset.stepRole;
    const providerId = this.value;
    if (stepRole && providerId) {
      state.stepModelMap[stepRole] = providerId === '__default__' ? null : providerId;
      saveAllProviders();
    }
  });

  // ---- File Upload ----
  const fileInput = document.getElementById('fileUpload');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // ---- Drag & Drop ----
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFileDrop(e);
    });
  }

  // ---- Sidebar Links ----
  delegate('sideLinks', 'click', '.side-link', function(e) {
    const step = parseInt(this.dataset.step);
    if (!isNaN(step)) navigateToStep(step);
  });

  // ---- Provider Test Buttons ----
  delegate(document, 'click', '[data-action="test-provider"]', function(e) {
    const pid = this.dataset.provider;
    if (pid) testProviderConnectivity(pid);
  });

  console.log('init.js: event bindings registered OK');
}

// ===================== Auto-init on DOM ready =====================
document.addEventListener('DOMContentLoaded', function() {
  initEventBindings();

  // Restore session if available
  const saved = promptRestoreSession();
  if (saved && saved.mode) {
    state.hasStarted = true;
    loadSessionData();
    loadProvidersFromStorage();
    renderSidebar();
    navigateToStep(state.currentStep || 1);
  } else {
    loadProvidersFromStorage();
    renderSidebar();
    showEntrySection();
  }
});
