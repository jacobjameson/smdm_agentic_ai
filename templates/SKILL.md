---
name: <short-kebab-case-name>
description: >
  <ONE specific sentence describing what this skill does AND when to use it.
  This line is how the agent decides whether to invoke the skill, so be
  concrete about the trigger. Good: "Build a publication-ready Table 1 of
  baseline characteristics by group from a data frame; use when the user
  asks for a descriptive/baseline table." Bad: "Helps with tables.">
---

# <Skill Title>

<!--
  This is a SKILL.md template. Save it as .claude/skills/<name>/SKILL.md in
  your project (project-level, travels with the repo) or in your personal
  skills folder (reusable everywhere). Delete these comments when done.
  A good skill does ONE job, encodes YOUR standards, states a done-condition,
  and includes guardrails.
-->

## When to use
<!-- The situation that should trigger this skill. -->
<e.g., The user has a cleaned data frame and wants baseline characteristics
compared across a grouping variable such as treatment arm.>

## How to do it
<!-- Numbered steps. Name the packages/functions you prefer. -->
1. <Confirm inputs — e.g., the grouping variable and which covariates.>
2. <Do the work with your preferred tools — e.g., use gtsummary::tbl_summary().>
3. <Formatting rules — e.g., continuous: median [IQR]; categorical: n (%).>
4. <Where the output goes and what it looks like — e.g., a gt table saved to
   tables/table1.html and .docx.>

## Conventions & guardrails
- Match the style defined in the project's `CLAUDE.md`.
- Show me the code and the rendered result **before saving**.
- Never fabricate values — read them from the data.
- <any other standard you always want applied>

## Example invocation
<!-- Optional: a sample request that should trigger this skill. -->
> "I have a cleaned data frame with age, sex, and treatment arm — build me a
> baseline characteristics table."
