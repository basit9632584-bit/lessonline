# Current scope amendment — 14 October 2026

The author explicitly requested removal of image input and offline functionality for now. This supersedes the image/OCR and offline-export requirements and their acceptance gates in the historical plan below. Those gates are cancelled by scope, never marked passed. No further manual offline test is required for the current app.

Current main flow: pasted text → check interpretation → deterministic worked solution → editable values/visual/table → reset. All 17task contracts remain. Remove photo input/review controls and portable-solution download from the main route, plus download controls from the existing teacher route. Preserve the teacher builder, its saved drafts, NIM setup, core build configuration and existing backup files. Retired implementation/assets remain inactive for potential restoration.

123 tests/build and actual browser 17task/variation/error/reset checks pass. The project and source stay local/private, credited to Abdul Basit. Video work stays paused; old screenshots/demo draft are stale for this new scope. Publishing and submission remain separate author decisions. See outputs/simplified-20261014/REPORT.md.

## Historical plan below — superseded where it mentions image/offline requirements

# Mathematics question solver — revised project plan

Updated October 13, 2026, Asia/Karachi. Project: `E:\Hackthon Project\Mathemathics Project`.

## Corrected product direction

The user clarified the intended experience: a person uploads a mathematics question, receives a step-by-step solution, and explores a visualization by changing values. The confirmed first-version inputs are **photo/screenshot plus pasted text**.

The main path is:

**Upload or paste question → inspect/correct its interpretation → solve step by step → change values and explore.**

The existing version 0.9 is a teacher lesson builder and the preserved fallback. R2 implements the new main route: bounded pasted-question recognition, editable interpretation and deterministic worked solutions. R3 connects customizable visuals, answers, worked steps and numeric tables to the same current values, with original interpretation and reset. R4 adds local photo preview and browser OCR. Recognition uses explicit supported question forms; unrestricted question interpretation is not implemented.

The main screen must serve the person asking the question. Teacher title/explanation editing, review badges, quiz creation and lesson packaging must not obstruct solving. Existing lesson examples/export can remain secondary where useful. Do not merely rename teacher controls and claim the product has been corrected.

## Preserve completed work and milestone gates

- Keep [the version 0.9 source package](outputs/expansion/final/lessonline-source-0.9.zip) and its reports/samples intact as the fallback. Its 74 passing tests cover the existing lesson builder, not the proposed solver.
- The previous plan is preserved in [the baseline plan](outputs/revision/baseline/lesson-builder-plan-2026-10-11.md). Original M1–M6 and expansions A–C remain historical work; their approvals do not authorize these new implementation stages.
- This revision has **exactly six milestones, R1–R6**. The user accepted R1–R4 by authorizing their following milestones. R2 passed 86 tests, the build and real browser checks. R3 passed 90 tests, the build, 20 browser synchronization assertions and responsive checks. R4 passed 98 tests, the build and original printed-image OCR/correction checks, with recorded accuracy/startup limits. **R5 is authorized and in progress** after the user's “start” on October 12. On October 13 the user explicitly authorized **R6 final audit, necessary fixes and reviewable submission materials**. That authorization does not waive R5 actual-file offline acceptance or authorize publication/submission. Historical stage counts below remain their dated evidence. Show actual evidence and unresolved requirements before claiming completion.
- Do not implement later milestone features through agents in advance. Within an approved milestone, fix necessary defects autonomously.
- Publication, deployment, submission and contacting others still need separate authorization.
- The earlier probability offline check remains pending: the user said “Not tested yet.” This plan does not mark it passed.
- On October 13 the user explicitly requested **“try add basic mathematics in this”**, authorizing a bounded scope amendment while R5's offline check remains pending. Six new task types are implemented: numeric arithmetic expressions, fraction simplification, percentage-of/increase/decrease and powers. Existing eleven tasks remain, for seventeen total. [Basic expansion evidence](outputs/expansion/basic/REPORT.md) records the historical 117 passing tests, build and browser/photo verification. The later explicit final-audit request authorized R6 validation/materials; it does not waive actual-file offline acceptance; [basic downloads also need their real offline check](outputs/expansion/basic/OFFLINE-CHECK.md). No additional milestone is silently advanced.

## One convincing end-to-end example

Input: **Solve 2x + 1 = 7.**

1. Subtract 1 from both sides: `2x = 6`.
2. Divide both sides by 2: `x = 3`.
3. Substitute back: `2 × 3 + 1 = 7`.

The visual shows `y = 2x + 1`, `y = 7`, and their intersection `(3, 7)`. The user changes the constant from 1 to 3. The explored equation becomes `2x + 3 = 7`; the steps become `2x = 4`, then `x = 2`, and the intersection becomes `(2, 7)`.

**The answer, affected solution steps, graph, labels and table must all update from the same current values.** Show that changed values create a variation of the original question. Reset restores the original values and solution. Never place original worked steps beside changed numbers without identifying the distinction.

## Bounded first-version question scope

R1 fixed exact task forms and numeric bounds in [SCOPE.md](outputs/revision/r1/SCOPE.md). R2 implements all 11 tasks with the existing helpers; R3 connects their visuals and exploration controls. Do not promise arbitrary mathematics. Expectation needs n and p only: k is required for exactly-k probability and is never invented for expectation.

| Family | Intended question tasks | Reusable baseline |
|---|---|---|
| Linear algebra | Solve `mx + b = t` for x; evaluate `y = mx + b` at a supplied x | Coefficient validation, line graph lifecycle, formatting, tables |
| Calculus | Differentiate a numeric quadratic; evaluate its derivative at a supplied point; find the tangent there | Quadratic/derivative/tangent helpers and curve visualization |
| Statistics | Compute requested mean, median, range or **population** standard deviation of a short numeric dataset | Ordered dataset validation, numerical summaries, dot plot |
| Probability | Exactly k successes and/or expected count for explicitly independent binomial trials | Binomial distribution, endpoint handling, bars/table |

Keep the existing bounded coefficient/dataset/trial ranges initially where they fit; define the additional linear target/evaluation bounds in R1. A solved x may lie outside the old graph window: fit the relevant solution or clearly show the numeric result and viewing limit. Do not clip away the answer silently.

Identify the **requested operation**, not just the topic. “Find the derivative” differs from “solve f(x)=0”; P(X=k) differs from P(X≤k). If a question does not specify sample versus population standard deviation, ask that specific clarification. Missing values, unclear notation, ambiguous tasks and unsupported forms preserve the question and get a correction route.

Initially exclude arbitrary symbolic functions/integrals, trigonometric proofs, unrestricted word problems, geometric-diagram reasoning, multi-question worksheets, PDF/DOCX ingestion and guaranteed handwriting recognition. Unsupported questions must not receive a plausible-looking fabricated solution. Additional tasks require explicit scope agreement.

## Question input and interpretation

- Pasted text is the reliable first path. A narrow local recognizer can handle supported explicit questions without a provider request.
- The user explicitly chose **Keep images local only** in R4. This supersedes the earlier hosted NVIDIA transcription proposal. Images and recognized question text are not sent to NVIDIA or another provider; no cloud fallback is permitted.
- Accept one PNG/JPEG up to 5 MiB. Check header dimensions before decoding, then decoded dimensions: each side 32–8,192 pixels, at most 16 million pixels. The authorized October 14 fix prepares a white-background lossless PNG once with longest side at most 1,600 pixels and each side at least 32 pixels. Remove the obsolete hosted-upload byte cap, JPEG quality loop and byte-driven shrinking. Show the exact prepared image and a larger inspection view; clearly disclose resizing detail loss. OCR model limitations remain.
- Clicking **Read question** dynamically loads Tesseract.js 7.0.0 and a single browser worker using bundled English LSTM data and same-origin worker/core/language paths. No GPU, Python service, Docker or vision API key is needed. One new direct dependency is justified by the local-only requirement; its prepared assets occupy 13,809,656 bytes. Only one compatible core is selected by the browser. No image/transcript browser persistence or logging is added.
- Preserve raw OCR text in the editable question. Every read requires checking the image, correcting notation and confirming review before **Solve question**. Source edits revoke that confirmation. The strict whole-question recognizer and deterministic solver remain the authority; no automatic sign/exponent correction or invented missing values.
- Printed English is the tested input. OCR can misread mathematical notation: actual tests read superscript ² as `?`, caret `^2` as `42`, and one `= 7` as `=/7`. Headings can require removal or cropping because the recognizer rejects unrelated text. Handwriting, arbitrary word problems, worksheets and guaranteed transcription accuracy are not supported claims.
- Cancel/source edits/replacement/removal/mode exit invalidate obsolete readings. Reading has a 60-second helper timeout and a 90-second UI guard. During startup, Tesseract exposes its worker only after initialization: cancellation returns immediately, prevents duplicate startup and cleans up a late worker. A permanently stalled startup requires reloading. Keep the image/text after errors and retain pasted-text fallback.

The OCR wrapper and language data are official open-source assets. [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md) describes local asset configuration; [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast/tree/87416418657359cb625c412a48b6e1d6d41c29bd) supplies the pinned English data. Build preparation verifies its compressed SHA256 and installed embedded-WASM cores and copies their Apache 2.0 notices. Actual printed-image reads and correction flows, rather than mock responses, establish R4 behavior.

The existing `/api/explanation` endpoint accepts only `{m,b}` and produces teacher-route linear explanation wording. Its contract remains unchanged. The new question/photo flow has no provider endpoint and does not use that API.

## Steps, correctness and lightweight architecture

- Reuse React, TypeScript, Vite, JSXGraph, native controls, SVG charts and current mathematical helpers. Start without new application dependencies; add one only for a demonstrated need and explain the tradeoff.
- Add a small typed problem contract: task, validated original parameters, current explored parameters, source interpretation and solution state. Use direct task dispatch, not a plugin/provider framework.
- Deterministic functions generate numerical results and worked mathematical steps for supported tasks. Examples: subtraction/division/substitution for a linear equation; power rule and point substitution for a quadratic; ordered values/sum/count for mean/median; explicit population formula; binomial combination and probability factors.
- OCR proposes text only. Validate the corrected question against supported forms and the confirmed interpretation. Do not trust extracted prose as verified calculations.
- No `eval`, arbitrary equation/code execution, invented citations or proof badges. Render any model text as escaped text.
- Handle `m=0` explicitly: `b=t` means infinitely many solutions; `b≠t` means none. Handle negative/zero/fractional coefficients, constant curves, duplicate datasets, zero spread, and p=0/1.
- Steps and visuals derive from one current problem state. A stale API reply cannot overwrite a newer question. Invalid draft values keep the last valid solved state with an explanation.
- Reuse graph mounting/resizing, but decouple the solver from lesson objects and immutable authored explanations. Preserve old storage keys; use a separate versioned problem draft if persistence is useful. Do not overwrite saved teacher lessons.
- Keep the existing small Node middleware/server for the teacher fallback, no accounts/database, no local LLM, no video rendering and no general symbolic engine. The question path uses local mathematics and optional browser OCR. The teacher API uses the user's existing NIM provision; no entitlement or zero-latency promise.

## Design requirements

Desktop: compact question/source area, readable answer and numbered reasons, and an exploration panel near the relevant step. Mobile: question, solution, then exploration in a clear reading order; controls remain easy to reach.

Keep the existing mathematics notebook identity, legible equation typography, calm color system, visible labels, focus, and precise spacing. Use graph/table/text equivalents and color plus labels/styles. Show the answer prominently with steps visible or clearly expandable. Use plain labels: Upload photo, Paste question, Read question, Solve question, Change values, Reset to original.

Design empty, file-reading, interpreted, clarification, solving, solved, unsupported, invalid-value, provider-failure and reset states. Preserve input after failures. Make the editable parameter's role obvious; arbitrary sliders must not change a different question without updating the displayed task.

No decorative dashboard, invented metrics, forced animation or chat transcript that buries the mathematics. Respect reduced motion. Test 360/768/1,440-pixel layouts and native keyboard controls. Do not claim physical-device, screen-reader or complete accessibility coverage without corresponding evidence.

## Six gated revision milestones

| Milestone | Deliverables | Completion evidence and gate |
|---|---|---|
| **R1 — Question-first scope and design** | Lock exact supported tasks/bounds and input policy. Produce desktop/mobile question → interpretation → solution → exploration designs, including the linear example and uncertainty states. Map reuse/gaps and the image-provider verification approach. | User reviews the actual design and scope. Report that image recognition is still unimplemented. Ask permission for R2. |
| **R2 — Pasted questions and worked solutions** | Build pasted-question recognition, editable interpretation, requested-operation dispatch and deterministic worked solutions. Deliver the linear slice first, then the agreed quadratic/statistics/binomial tasks. No teacher review/editing hurdle in the main route. | Known examples, zero/no/infinite solution cases, decimals/signs, missing values, ambiguous operations and unsupported questions behave correctly. Results/steps follow confirmed input; do not rely on AI answers. Ask permission for R3. |
| **R3 — Synchronized customizable visualization** | Connect current parameters to the worked steps, answer, graph/chart, annotations and table. Add linear target/intersection; reuse curve/dot/binomial visuals. Preserve original question and reset. | Change each supported value and independently verify affected steps and visuals update together. Test invalid values, zero cases, off-screen results, keyboard and responsive layouts. Ask permission for R4. |
| **R4 — Photo/screenshot question input** | Add bounded local upload/preview/inspection, real browser OCR, editable recognized text, mandatory notation review and text fallback. The user's local-only preference replaces hosted extraction. Route corrected supported questions through the same solver. | Read original printed PNG/JPEG images in the app. Check raw transcription errors/correction, all four solver families, local asset paths, file limits, blank/unsupported/missing inputs, cancellation and obsolete replies. Report startup and accuracy limits. No handwriting/general-maths claim. Ask permission for R5. |
| **R5 — Polish, accessibility and portable worked solutions** | Refine the full student flow, keyboard/mobile/error states, focused measured optimization and safe optional saving. Adapt portable HTML to the new problem/steps/visual contract only if it fits the remaining reserve; keep fallback export intact. | Check all supported task flows. If the new export is delivered, test the actual download with internet off and server stopped; values must recompute steps as well as visuals. Offline interpretation/AI generation is not promised. Report participant/device limits. Ask permission for R6. |
| **R6 — Final validation and submission refresh** | Recheck text/photo → solve → customize/reset, prior-feature regression, fresh setup, source privacy and package. Refresh screenshots, demo, submission description and official requirements. | Claims match exact shipped task/image capabilities and actual offline evidence. Resolve or list publication/identity/form gaps. Show reviewable materials; ask separately before publishing or submitting. |

Do not silently drop an approved acceptance requirement to meet the deadline. If optional export or a task cannot fit, present the concrete tradeoff for the user's decision before changing committed scope. Reserve final time for validation/demo; do not add new mathematics just because a provider can generate prose.

## Agent review and current next action

All three existing agents reviewed the correction. Design emphasized a direct question screen, editable transcription and clear original/explored values. Engineering identified the current endpoint/input gap, immutable-explanation mismatch and zero-slope cases; it recommended one typed problem state with deterministic steps. Milestone review proposed the six-stage question-first revision and keeping the completed package as fallback.

**Current next action: complete the authorized final audit/package validation while retaining R5's pending actual-file offline acceptance.** R5 implementation passed 104 tests, the build and final responsive/browser checks on October 12; [the report](outputs/revision/r5/REPORT.md) records scope and limits. Revised export is **committed** and implemented for all seventeen supported tasks across five families after the authorized October 13 basic-mathematics amendment, following the user's acceptance of the R5 portable-solutions proposal. Downloaded HTML starts with current valid values and preserves original confirmed values for Reset. It includes local worked steps, controls, visuals and tables, with all assets inline; it cannot interpret a new question/photo or request AI. Invalid exploration drafts prevent download. Question text is excluded by default and included only through an explicit opt-in; photos are always excluded. No draft saving, accounts, practice or provider feature is added. The separately authorized October 13 amendment adds the six documented basic task types. The existing teacher export remains separate. Actual downloaded files must be checked with the server stopped and internet off before R5 is marked complete, as required by [the R1 acceptance gate](outputs/revision/r1/ACCEPTANCE.md). Follow [the offline check](outputs/revision/r5/OFFLINE-CHECK.md). R6 validation/materials are authorized by the user's explicit October 13 final-audit request; clean-package validation has passed; actual-file offline acceptance remains pending. Publication/submission require separate authorization.

The three agents are handling live flow/design, the portable runtime/shared validation and independent acceptance review. Root verifies browser behavior, privacy, asset costs and downloads. See [the R5 acceptance checklist](outputs/revision/r5/ACCEPTANCE-REVIEW.md). R4 [report](outputs/revision/r4/REPORT.md), [browser evidence](outputs/revision/r4/browser-observations.json) and [independent review](outputs/revision/r4/ACCEPTANCE-REVIEW.md) remain historical evidence. The existing teacher builder remains secondary at `?view=teacher`, with preserved saved lessons and the v0.9 source ZIP.

R1's [report](outputs/revision/r1/REPORT.md), [scope](outputs/revision/r1/SCOPE.md), [design](outputs/revision/r1/DESIGN.md), [feasibility](outputs/revision/r1/FEASIBILITY.md) and [acceptance gates](outputs/revision/r1/ACCEPTANCE.md) remain the foundation, with the R4 local-only privacy decision superseding their hosted extraction proposal. Its port 5183 prototype is a historical fixed-example design. R6 is now separately authorized for validation/materials; completing R5 will not authorize publication or submission.

Earlier submission copy remains a description of the existing lesson builder. Update public claims only after the corresponding solver/photo behavior has been built and verified.

## October 14 follow-up fixes

The user requested “now fix all of these,” authorizing the audit follow-up. Current working-checkout evidence is **123 passing tests and a successful build**. Remove avoidable upload-era photo compression through one bounded lossless PNG encode; keep the OCR model, raw text and mandatory review. Prepared-image inspection and correction guidance are explicit. Starting a new pasted question clears the old transcript/review and focuses a blank text field; switching tabs or editing a photo transcript alone retains review.

Author credit is **Abdul Basit**. The author chose private source for now, so package metadata is `private: true` / `UNLICENSED`; no license grant or publication is inferred. [CREDITS.md](CREDITS.md) records that choice. Prepare a local captioned HyperFrames walkthrough from actual browser captures, clearly labeled as captured UI states; do not represent edited stills as continuous screen recording or fabricate OCR/graph results. Keep video tooling outside the app dependency tree.

The new private source package and clean-install verification are documented in [the follow-up report](outputs/audit-fixes-20261014/REPORT.md). Preserve the October 13 package/evidence and the older teacher fallback. The five-file actual offline check remains pending after “Not tested yet”; do not mark R5/R6 acceptance complete or publish/submit without the remaining user actions. Public rules still do not enumerate country exceptions; no Pakistan-specific guarantee is inferred.

## October 13 final-audit update (historical)

Current regression evidence is 119 passing tests and a successful build after strict factorial rejection, beginner mathematics wording/labels, Explore focus/navigation and photo-preparation recovery refinements. Earlier 86/90/98/104/117 counts are historical stage evidence, not current totals. Fresh archive verification has passed: 97 allowlisted files, every manifest hash matched after extraction, clean npm ci --include=optional, 119 tests and full build on Node 24.13/npm 11.6.2. No full R6 completion claim while required offline acceptance remains pending. Actual saved-file/server-stopped/internet-off checks remain required for R5/basic exports. Identity, eligibility-country details, license/public URLs/form/media and publication/submission decisions remain explicit readiness gaps.


Final audit confirms all 17 task routes in the actual UI, fresh five-family portable downloads plus text opt-in, exact-asset served previews and responsive checks. These are root-produced browser checks, not proof of local-file offline operation. Both owned audit servers are stopped and host unreachability was confirmed. The user answered “Not tested yet” for the five saved files on October 13, so actual Edge/Chrome saved-file/internet-off acceptance remains pending. See [final audit](outputs/audit-final/REPORT.md) and [offline acceptance](outputs/audit-final/OFFLINE-CHECK.md). The final source ZIP includes these documentation-only updates; see outputs/audit-final/SOURCE-MANIFEST.json for its final SHA256 and all source-file hashes. Code and lockfile were unchanged, so the successful clean tests/build remain applicable. Publication/submission remain separately gated.

