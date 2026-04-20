# Buyinz Development Specifications

This folder holds **LLM-assisted development specifications** for Buyinz user stories, plus the prompts and automation used to generate and maintain them.

## Layout

```
dev-specs/
├── README.md                              ← this file
├── automation-architecture.md             ← Part 7: automation pipeline summary
├── prompts/
│   ├── dev-spec-generate.md               ← prompt that builds a new spec for a story
│   └── dev-spec-update.md                 ← prompt that updates a spec after code changes
├── automation/
│   └── dev-spec-workflow.yml              ← staging copy of .github/workflows/dev-spec.yml
├── store-profile-and-location.md          ← dev spec: Store profile + address / geocoding
├── distance-aware-explore.md              ← dev spec: Distance-aware explore feed
└── new-items-today-count.md               ← dev spec: New items today count on stores

Older P3 specs (PDF) are kept for reference:
├── messaging-devspecs.pdf
├── profile-devspecs.pdf
└── quicklisting-devspecs.pdf
```

## Automation

When a PR that implements a user story is **approved** on GitHub, the workflow at **`.github/workflows/dev-spec.yml`** (sourced from `automation/dev-spec-workflow.yml` in this folder) runs and:

1. Determines if a spec already exists for the touched story.  
2. Calls an LLM with **`prompts/dev-spec-generate.md`** (new) or **`prompts/dev-spec-update.md`** (existing) plus the PR diff.  
3. Opens a follow-up PR with the generated or updated spec committed to `Buyinz/dev-specs/`.
4. Links that follow-up PR to a tracking **GitHub Issue** (created by the workflow with `gh issue create`) so spec work is visible on the Kanban board.

See **`automation-architecture.md`** for the full pipeline and setup instructions.
