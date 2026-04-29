# AI Job Search Copilot

Open-source job search workspace with:

- a full web app for resume building, job matching, job search, resume optimization, and mock interviews
- reusable skills for Claude Code and OpenAI Codex
- direct PDF export, interview prep, and application tracking

## Open Source Website

This project is open source and ready to be deployed as a website on Netlify.

- Repository: [wksudud/interview-coach-skill](https://github.com/wksudud/interview-coach-skill)
- Publish directory: `web-app`
- Entry page: `web-app/index.html`

Once Netlify deployment is connected, this README should also show the public site URL.

## Project Structure

```text
.
|-- AGENT.md
|-- README.md
|-- SKILL.md
|-- prompt-standalone.md
|-- .agents/
|-- .claude/
`-- web-app/
    |-- index.html
    |-- assets/
    `-- templates/
```

## Web App

The web app includes:

- guided resume intake
- personal photo upload
- AI resume generation with template switching
- direct PDF export
- job direction matching
- real job search workflow
- interview preparation before mock interviews
- mock interview chat and scoring
- application tracker

## Local Run

Open the app directly:

```bash
start web-app/index.html
```

Or serve it locally:

```bash
npx http-server web-app -c-1
```

## Netlify Deploy

This repository is prepared for Netlify static deployment.

- Build command: none
- Publish directory: `web-app`

If you deploy from the Netlify UI, set the publish directory to `web-app`.

## License / Source

This website is open source. If you use or fork it, please keep the repository link visible in the deployed site.
