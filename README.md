# Buyinz

This repository contains the **Buyinz mobile app** (Expo / React Native).

## Project location

All application code lives in **`Buyinz/`**.

```bash
cd Buyinz
npm install
npx expo start
```

See `Buyinz/README.md` if present for app-specific notes.

## Automated Dev Spec Runbook

This repository includes two automation workflows:

- [.github/workflows/create-devspec-subissue.yml](.github/workflows/create-devspec-subissue.yml)
- [.github/workflows/auto-dev-spec.yml](.github/workflows/auto-dev-spec.yml)

### One-time setup

1. Create labels in GitHub: `user-story`, `devspec`, `documentation`.
2. Add repository secret: `COPILOT_GITHUB_TOKEN`.
	- Use a fine-grained PAT for a licensed Copilot user with Copilot Requests permission.
3. (Optional) Add repository variable: `COPILOT_ASSIGNEE`.
	- Set to the username that should be auto-assigned on DevSpec issues.

### End-to-end test

1. Create a new GitHub Issue for a user story.
2. Add the `user-story` label.
3. Confirm a linked DevSpec tracking issue is auto-created by [create-devspec-subissue.yml](.github/workflows/create-devspec-subissue.yml).
4. Open a PR that closes the user story issue (`Closes #<issue_number>` in PR body).
5. Get one approval review on the PR.
6. Confirm [auto-dev-spec.yml](.github/workflows/auto-dev-spec.yml) runs and updates or creates:
	- [Buyinz/dev-specs](Buyinz/dev-specs)
7. Confirm a commit is pushed to the PR branch with the updated spec markdown.

### Manual run (debug path)

If needed, run [auto-dev-spec.yml](.github/workflows/auto-dev-spec.yml) from the Actions tab using `workflow_dispatch` and provide `pr_number`.

### Evidence to collect for grading

For each user story, keep:

- Approved PR URL containing DevSpec commit(s) and review
- DevSpec tracking issue URL
- Chat log/shareable URL used for the automated DevSpec process

Prompt sources used by automation:

- [.github/prompts/new-devspec.md](.github/prompts/new-devspec.md)
- [.github/prompts/update-devspec.md](.github/prompts/update-devspec.md)
