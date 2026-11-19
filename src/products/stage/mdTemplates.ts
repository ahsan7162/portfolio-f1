// The plugin's eleven document templates, copied as they are from Markwright (templates/documents.ts,
// MIT, (c) Muhammad Ahsan) so the template deck shows the real text a file starts from.
export interface DocumentTemplate {
  id: string;
  label: string;
  description: string;
  markdown: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "readme",
    label: "README",
    description: "Overview, install, usage, configuration",
    markdown: `# Project name

One sentence on what this project does and who it's for.

## Install

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`ts
import { thing } from "project-name";
\`\`\`

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| \`option\` | \`false\` | What it changes |

## Contributing

Open an issue first for larger changes.

## License

MIT
`,
  },
  {
    id: "meeting-notes",
    label: "Meeting notes",
    description: "Attendees, agenda, decisions, action items",
    markdown: `# Meeting notes — {{date}}

**Attendees:**

## Agenda

- [ ] Topic one
- [ ] Topic two

## Notes

## Decisions

-

## Action items

- [ ] Owner — task — due date
`,
  },
  {
    id: "adr",
    label: "Architecture decision record",
    description: "Status, context, decision, consequences",
    markdown: `# ADR: Title of the decision

**Status:** Proposed · **Date:** {{date}}

## Context

What problem are we solving, and what forces are at play?

## Decision

What we decided, in one or two sentences.

## Consequences

What becomes easier, and what becomes harder.

## Alternatives considered

| Option | Pros | Cons |
| --- | --- | --- |
| Option A |  |  |
| Option B |  |  |
`,
  },
  {
    id: "prd",
    label: "PRD / feature spec",
    description: "Problem, goals, requirements, open questions",
    markdown: `# Feature name

## Problem

Who has this problem, and how do we know?

## Goals

-

## Non-goals

-

## User stories

- As a …, I want …, so that …

## Requirements

| # | Requirement | Priority |
| --- | --- | --- |
| 1 |  | Must |

## Open questions

- [ ]
`,
  },
  {
    id: "rfc",
    label: "RFC / design doc",
    description: "Summary, motivation, design with diagram, rollout",
    markdown: `# RFC: Title

**Author:**  · **Date:** {{date}}

## Summary

## Motivation

## Design

\`\`\`mermaid
flowchart LR
  Client --> API --> Store
\`\`\`

## Rollout

1.

## Risks

-
`,
  },
  {
    id: "changelog",
    label: "Changelog entry",
    description: "Keep a Changelog sections",
    markdown: `## [x.y.z] - {{date}}

### Added

-

### Changed

-

### Fixed

-

### Removed

-
`,
  },
  {
    id: "bug-report",
    label: "Bug report",
    description: "Steps, expected, actual, environment",
    markdown: `# Bug: Short description

## Steps to reproduce

1.
2.

## Expected

## Actual

## Environment

| Item | Value |
| --- | --- |
| Version |  |
| OS |  |

## Logs

\`\`\`text
\`\`\`
`,
  },
  {
    id: "runbook",
    label: "Runbook",
    description: "Prerequisites, steps, rollback, contacts",
    markdown: `# Runbook: Task name

> [!NOTE]
> When to use this runbook, and what it changes.

## Prerequisites

- [ ]

## Steps

1.

## Rollback

1.

## Contacts

| Role | Name |
| --- | --- |
| Owner |  |
`,
  },
  {
    id: "pr-description",
    label: "PR description",
    description: "What, why, how to test",
    markdown: `## What

## Why

## How to test

1.

## Checklist

- [ ] Tests added or updated
- [ ] Docs updated
`,
  },
  {
    id: "postmortem",
    label: "Incident postmortem",
    description: "Impact, timeline, root cause, follow-ups",
    markdown: `# Incident postmortem: Title

**Date:** {{date}} · **Severity:**

## Impact

## Timeline

| Time | Event |
| --- | --- |
|  |  |

## Root cause

## What went well

-

## Follow-ups

- [ ]
`,
  },
  {
    id: "weekly-status",
    label: "Weekly status",
    description: "Done, next, risks",
    markdown: `# Weekly status — {{date}}

## Done

-

## Next

-

## Risks and blockers

> [!WARNING]
>
`,
  },
];

export function fillTemplate(markdown: string, now = new Date()): string {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return markdown.replaceAll("{{date}}", date);
}
