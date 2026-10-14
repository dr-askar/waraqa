# Waraqa project instructions

## Product constraints
- Keep Waraqa a website/PWA at its existing URL; preserve Android wrapper compatibility.
- Keep processing local unless the user explicitly authorizes a cloud service. Preserve offline use, Arabic RTL, encryption, and existing document data.

## Reviewable and reversible code changes
- Work on a dedicated feature/fix/docs branch. Open a pull request targeting main; do not push implementation changes directly to main.
- Keep each PR focused, with a clear problem, behavior change, validation, and rollback instructions. Prefer one squash commit per completed PR so it can be reverted independently.
- Complete appropriate checks before marking a PR ready. Merge only within the user's authorization and after required checks pass.
- Never force-push main or reset shared history. Roll back published changes using a new revert commit/PR, preserving later unrelated work.
- Record the deployed commit when deploying. A code rollback must also handle the PWA cache version coherently; do not reuse a cache version for different assets.
- Storage changes must be backward compatible or have a tested migration and recovery path. Reverting code alone does not undo user data migrations; document that limitation.
- These are project workflow instructions, not a claim that GitHub branch protection is configured.

## Non-destructive document editing
- Follow [the editing and recovery requirements](docs/EDITING-AND-RECOVERY.md) for every editing feature.
- Preserve originals, separate derived pages, and support coherent undo/redo. Preview/cancel must not silently modify saved documents.
- State actual recovery limits honestly. The current three-image-edit history is not global document undo.
- When changing an editor, test relevant recovery behavior, including original preservation, cancellation, undo/redo, and stale-save rejection where applicable.

## Open-source identity and release preparation
- Preserve attribution to founder Mohammad Askar (GitHub: dr-askar), established in 2026; do not claim sole ownership of third-party or contributor work.
- Original project source uses Apache-2.0. Preserve LICENSE/NOTICE, upstream license texts, and contributor rights when changing or distributing code.
- New assets/dependencies need documented provenance and compatible terms. Keep official signing keys, passwords and private user documents outside Git and public issue reports.
- Google Play preparation is distinct from a submitted or approved release. Verify current target API requirements, signing continuity, support contact and Data safety against actual behavior before submission.
