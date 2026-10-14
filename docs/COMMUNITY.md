# Community setup for the repository owner

The repository is already public and Issues are enabled. Files in this change
provide onboarding and report templates; they do not change GitHub account settings.

1. Settings → General → Features: enable **Discussions** for questions, ideas and
   community testing. Until enabled, use Issues; do not advertise a working forum.
2. Settings → Code security: enable **Private vulnerability reporting**, then verify
   the private report link in SECURITY.md. Supply a monitored private contact.
3. Add labels: `good first issue` (small scoped onboarding tasks), `help wanted`,
   `translation`, `accessibility`, `android`, `ocr`, `documentation` and `bug`.
   Labels are suggestions, not an assertion that they already exist.
4. Configure a main-branch ruleset with PR review and successful web/native checks.
   Select exact check names shown by current Actions; native checks run API 35/36.
   Keep emergency recovery possible without force-pushing shared history.
5. Publish a short pinned introduction linking CONTRIBUTING.md and the roadmap.
   This preparation does not post messages or invite contributors on your behalf.

Suggested starter tasks: test long translated labels on a real phone; document
reproducible low-light crop cases with synthetic samples; improve keyboard/screen
reader navigation; expand OCR fixtures with properly licensed non-private documents.

Do not ask contributors to share real ID cards, signatures or passwords. Official
releases and signing keys stay under the owner's control; forks use their own identity.
