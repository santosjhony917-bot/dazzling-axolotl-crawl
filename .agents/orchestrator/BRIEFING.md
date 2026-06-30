# BRIEFING — 2026-06-22T17:06:00-03:00

## Mission
Implement a resilient menu collection pipeline (Extension screenshot + local OCR + AI fallback) and new requirements: Product modal clicks in extension and Instagram bio secondary phone extraction.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\orchestrator
- Original parent: main agent
- Original parent conversation ID: 2e5ea929-1c92-47fd-aa3c-b5de7f119408

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\orchestrator\plan.md
1. **Decompose**: Split scope into: Chrome Extension Capture & Modal Clicking, Backend OCR endpoint, AI fallback & audit, Instagram Additional Phone Extraction, and Frontend integration & verification.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Spawn Explorer, Worker, Reviewer, Challenger, Auditor to implement and verify.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Extension Screen Capture & Modal Clicking [pending]
  2. Backend OCR Local Endpoint [pending]
  3. AI Structuring & Audit Fallback [pending]
  4. Instagram Additional Phone Extraction [pending]
  5. Frontend Integration & Verification [pending]
- **Current phase**: 2
- **Current focus**: Implementing changes via teamwork_preview_worker

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/ folder.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 2e5ea929-1c92-47fd-aa3c-b5de7f119408
- Updated: yes

## Key Decisions Made
- Decomposed the project into 5 clear milestones.
- Will spawn a Worker subagent to implement code modifications across all milestones.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| Worker 1 | teamwork_preview_worker | Implement product modal clicking and Instagram bio phone extraction | failed | 204fe56a-6662-4885-89c8-2990c23c717c |
| Worker 2 | teamwork_preview_worker | Implement product modal clicking and Instagram bio phone extraction | failed | 8abe7ce4-c267-4825-85ef-10a26d0db42d |
| Worker 3 | teamwork_preview_worker | Implement product modal clicking and Instagram bio phone extraction | failed | 92c3c617-6c41-4c78-a378-186b068e2d44 |
| Worker 4 | teamwork_preview_worker | Implement product modal clicking and Instagram bio phone extraction | failed | 54ca98e3-f06c-420f-9873-bc778c0b65ef |
| Worker 5 | teamwork_preview_worker | Implement product modal clicking and Instagram bio phone extraction | pending | 04e8312b-54b8-4192-92fd-d05ff08b9340 |

## Succession Status
- Succession required: no
- Spawn count: 5 / 16
- Pending subagents: 04e8312b-54b8-4192-92fd-d05ff08b9340
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 1d113b58-fe1c-44f3-a123-c18afb71cc75/task-33
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\orchestrator\plan.md — Detailed decomposition and validation criteria
- c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\orchestrator\progress.md — Step-by-step progress checklist
