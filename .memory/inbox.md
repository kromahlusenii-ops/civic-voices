# Memory Inbox

Review periodically. Confirm → move to decisions/patterns. Reject → delete.

---

## BUG: "After Work" HAM logging not treated as mandatory
- **Date:** 2026-03-04
- **Severity:** Process gap — affects all agents using HAM
- **Observed:** After completing a multi-file implementation (keyword chips feature), the agent did not automatically log to `.memory/decisions.md`, `.memory/patterns.md`, or update directory CLAUDE.md files. Only did so when the user explicitly asked.
- **Root cause:** The "After Work" section in CLAUDE.md reads as a checklist of things to do, but agents treat it as optional/nice-to-have rather than as part of the definition of done. There is no enforcement mechanism — nothing in the workflow gates completion on HAM logging.
- **Impact:** Memory system loses value if it depends on the user remembering to ask. Other team members expect this to be automatic. If agents skip it, HAM accumulates gaps and becomes unreliable.
- **Suggested fix for HAM team:**
  1. Strengthen CLAUDE.md language — change "After Work" from a passive checklist to an explicit gate: "Do NOT report task completion to the user until HAM logging is done"
  2. Consider a skill or hook that triggers after implementation tasks complete, prompting the agent to log before closing out
  3. Add a "Definition of Done" section to CLAUDE.md that includes HAM logging as a required step alongside build/lint verification
- **Workaround applied:** Added to auto-memory (`MEMORY.md`) that "After Work" is mandatory, not optional. But this only fixes it for one agent context — project-level enforcement is needed.
