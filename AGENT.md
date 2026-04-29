# AGENT.md

This file helps the next agent quickly understand the repo, especially the `web-app` structure, the active resume flow, and the risky edit points.

## Agent Quickstart

1. Main entry is [web-app/index.html](/E:/Documents/interview-coach-skill/web-app/index.html).
2. Core files are `state.js`, `view.js`, `actions.js`, and `api.js`.
3. `state.js` owns constants, template config, and global state.
4. `view.js` owns rendering, navigation, template cards, and light UI fallback text repair.
5. `actions.js` owns uploads, parsing, generation, export, and step transitions.
6. `api.js` owns provider config, model calls, persistence, and session restore.
7. Top-level step order is controlled by `TOP_LEVEL_STEP_IDS`.
8. Resume substeps are controlled by `RESUME_SUBSTEP_IDS`.
9. `step5` is the highest-risk area.
10. `step5` has two phases: `contentPhase` and `templatePhase`.
11. First generation uses `generateResume()`.
12. Re-generation after template switch uses `regenerateResume()`.
13. Unified export entry is `exportResume(format)`.
14. PDF must go through `downloadResumePDF()`, not browser print.
15. PDF layout config comes from `RESUME_TEMPLATES[*].pdf`.
16. Template source of truth is `RESUME_TEMPLATES`.
17. Current template state is `state.resumeTemplate`.
18. Generated-once flag is `state.resumeGeneratedOnce`.
19. One-page compression index is `state.resumeLayoutCompressionIndex`.
20. If UI text looks wrong, check `index.html` first, then `view.js` and `repairUIStrings()`.
21. If buttons do nothing, check `actions.js`, then `api.js`.
22. If PDF output looks wrong, check `downloadResumePDF()`, `renderResumePdf()`, and `getResumePdfLayout()`.
23. Prefer fixing source text directly instead of growing runtime text patches.
24. Template changes should usually start in `state.js`.
25. Workflow changes should usually start in `actions.js`.
26. Minimum verification: `node --check web-app\\assets\\view.js`
27. Then: `node --check web-app\\assets\\state.js`
28. Then: `node --check web-app\\assets\\actions.js`
29. If time is short, protect `step5`, PDF export, and template state consistency first.
30. Avoid writing non-ASCII text through unsafe shell replacement flows.

## File Map

- [web-app/index.html](/E:/Documents/interview-coach-skill/web-app/index.html)
  Single HTML entry. Holds static layout, section markup, and script includes.
- [web-app/assets/state.js](/E:/Documents/interview-coach-skill/web-app/assets/state.js)
  Constants, job platform config, resume templates, and shared state.
- [web-app/assets/view.js](/E:/Documents/interview-coach-skill/web-app/assets/view.js)
  Rendering, step switching, template card UI, file tree UI, and light fallback text fixes.
- [web-app/assets/actions.js](/E:/Documents/interview-coach-skill/web-app/assets/actions.js)
  Business actions for upload, parse, resume generation, template switching, and export.
- [web-app/assets/api.js](/E:/Documents/interview-coach-skill/web-app/assets/api.js)
  Provider calls, persistence helpers, and session restore.

## Active Resume Flow

1. `step1`
   Collect resume content: basics, education, work, projects, self-eval.
2. `step5`
   Choose template, generate resume, edit/preview, then export.
3. `step6`
   Career matching.
4. `step7`
   Job search.
5. `step8`
   Resume optimization.
6. `step9`
   Mock interview.
7. `trackerSection`
   Application tracking.

## Step5 Notes

- `contentPhase`
  Template selection, first generate, regenerate, markdown editing, preview toggle, AI chat edits.
- `templatePhase`
  Final template confirmation and export.
- Export must always use the current template state.
- PDF is now direct text-PDF generation in the browser. Do not reintroduce print fallback.

## Debug Notes

- Text corruption:
  Check `index.html` static text first, then `view.js` fallback text logic.
- Template mismatch:
  Check `state.resumeTemplate`, `state.customTemplate`, and `renderResumeTemplateCards()`.
- PDF issues:
  Check `downloadResumePDF()`, `renderResumePdf()`, and layout config.
- Session restore issues:
  Check local persistence and restore logic in `api.js`.
