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

**One-time setup (do this once, in the browser):**
1. Push this repo to `main`.
2. Let the `publish` GitHub Action run once (it creates the `gh-pages` branch).
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `gh-pages` / `(root)`**.
4. Site goes live at <https://jacobjameson.github.io/smdm_agentic_ai/>.

## License

Course materials © Jacob Jameson. Reuse for teaching encouraged with attribution.
