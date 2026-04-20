#!/usr/bin/env node

import { promises as fs } from "node:fs";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function readRequired(path, label) {
  if (!path) {
    throw new Error(`Missing required argument for ${label}`);
  }
  return fs.readFile(path, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);

  const mode = args.mode;
  const outputPath = args.output;

  if (!mode || (mode !== "new" && mode !== "update")) {
    throw new Error("--mode must be either 'new' or 'update'");
  }

  if (!outputPath) {
    throw new Error("Missing required argument --output");
  }

  const userStory = await readRequired(args["user-story"], "--user-story");

  let prompt = "";
  if (mode === "new") {
    const template = await readRequired(args["new-template"], "--new-template");
    prompt = template.replace("{{USER_STORY_DESCRIPTION}}", userStory);
  } else {
    const template = await readRequired(args["update-template"], "--update-template");
    const existingSpec = await readRequired(args["existing-spec"], "--existing-spec");
    const prDiff = await readRequired(args["pr-diff"], "--pr-diff");
    const prNumber = args["pr-number"] ?? "unknown";
    prompt = template
      .replace("{{EXISTING_SPEC_MARKDOWN}}", existingSpec)
      .replace("{{PR_DIFF}}", prDiff)
      .replace("{{UPDATED_USER_STORY}}", `${userStory}\n\nPR Number: ${prNumber}`);
  }

  await fs.writeFile(outputPath, prompt, "utf8");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
