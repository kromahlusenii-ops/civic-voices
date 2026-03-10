# Inbox — Unverified Observations

> Items here are uncertain inferences from AI agents.
> Do NOT promote to decisions.md or patterns.md without human confirmation.
> Prefix entries with date: `- [YYYY-MM-DD] observation text`

---

<!-- Add observations below -->

- [2026-03-10] **BUG: `.ham/bin/ham-verify` created without executable permission**
  - **Symptom**: Stop hook fails with `Permission denied` on every task completion
  - **Cause**: HAM Pro scaffold writes `ham-verify` with mode `644` (`-rw-r--r--`) instead of `755` (`-rwxr-xr-x`)
  - **Fix**: The scaffold generator should `chmod +x` the file after writing it, or create it with executable permissions
  - **Workaround**: `chmod +x .ham/bin/ham-verify`
  - **Scope**: Affects any new project that runs `ham scaffold` / HAM Pro setup
