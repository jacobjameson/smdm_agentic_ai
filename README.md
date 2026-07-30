# Agentic Coding for Research — SMDM Short Course

Course website and slides for **"Introduction to Agentic Coding, Git, and Custom Research Workflows"** (SMDM short course, 28 June 2026). Built with [Quarto](https://quarto.org) and deployed to GitHub Pages.

**Faculty:** Jacob Jameson, MS — PhD Student, Health Policy / Decision Sciences, Harvard University.

## What's here

| Path | Purpose |
|------|---------|
| `index.qmd` | Landing page + agenda at a glance |
| `setup.qmd` | Pre-course setup guide (git, GitHub, Claude Code) |
| `agenda.qmd` | Detailed run-of-show |
| `foundations.qmd`, `prompting.qmd`, `git-github.qmd`, `skills.qmd`, `build-session.qmd` | The five lecture modules |
| `exercises/` | Five hands-on exercises |
| `resources.qmd` | Cheat sheets, glossary, links |
| `instructor.qmd` | Facilitator notes (opening demo, timing, fallbacks) |
| `slides/` | reveal.js decks for the lecture modules |
| `templates/` | `CLAUDE.md` and `SKILL.md` starters participants copy |
| `assets/theme.scss` | Custom site theme |

## Render locally

Requires the [Quarto CLI](https://quarto.org/docs/get-started/) (not currently installed on this machine):

```bash
# macOS
brew install quarto

# live-reloading preview of the whole site
quarto preview

# one-off full render into _site/
quarto render

# render a single slide deck
quarto render slides/foundations.qmd
```

## Deploy

Pushing to `main` triggers `.github/workflows/publish.yml`, which renders the site in CI and publishes to the `gh-pages` branch — **no local Quarto install needed for deployment.**

The site is live at <https://jacobjameson.com/smdm_agentic_ai/> (the account's custom domain; `jacobjameson.github.io/smdm_agentic_ai` redirects there). Note: the `gh-pages` branch had to exist before the first CI publish — it was initialized once with an empty orphan commit.

## License

Course materials © Jacob Jameson. Reuse for teaching encouraged with attribution.
