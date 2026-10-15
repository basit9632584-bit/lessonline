# lessonline — pasted mathematics questions

Current scope, 14 October 2026: **paste a question → check the interpretation → solve step by step → change values and see the effect**. Image/photo input and offline HTML downloads have been removed from the active interface at the author's request. The lesson builder remains available, without its download controls.

All 17 bounded maths tasks remain: numeric expressions, fraction simplification, percentage-of/increase/decrease, powers, linear solve/evaluation, quadratic derivative/point/tangent, mean/median/range/population standard deviation, and binomial exactly-k/expectation.

## Run locally

Use Node 24 (verified 24.13.0) and npm (verified 11.6.2):

```powershell
npm ci --include=optional
npm run dev
```

Open the HTTP Local URL printed by Vite. The mathematics solver needs no API key, GPU, Python, database or local model.

```powershell
npm test
npm run build
npm run preview
```

The existing build setup and legacy implementations are retained for possible future restoration. It still prepares archived OCR/export assets; these are not exposed as active features. Do not treat those generated assets as a supported download or image flow. The existing teacher NIM configuration is unchanged and remains optional; it is not used to solve pasted questions.

## Use the app

Paste one complete supported question or choose a sample. Inspect the requested task and values, then choose **Solve question**. Source/interpretation edits clear the previous answer. **Explore these values** opens the controls; valid edits update every requested answer, step, graph/chart and table together. Invalid drafts preserve the complete last valid mathematics with a warning. **Reset to original** restores the confirmed interpretation.

```text
Calculate 1/2 + 3/4.
Simplify 12/18.
What is 20% of 150?
Increase 200 by 15%.
Calculate 2 raised to the power 5.
Solve 2x + 1 = 7.
Evaluate y = -0.5x + 3 at x = 4.
Find the derivative, point and tangent for f(x) = -0.5x² + x + 2 at x₀ = 2.
Find mean, median, range and population SD: 2,4,4,6.
Binomial: n=5, p=0.2, k=1. Find exactly-one probability and expected successes.
```

Support is deliberately bounded; this is not an unrestricted mathematics or word-problem solver. Arithmetic expressions allow +, −, ×, ÷, ^, unary signs and parentheses, with256characters/96tokens/12nested-parentheses and two-decimal literals up to10,000. Exponents must evaluate to integers0–10; reduced numerator/denominator intermediates have48-digit bounds. Division by zero,0^0, factorials, functions and implicit multiplication are rejected. Fraction integers are −100…100 with nonzero denominator; percentage amount0…10,000/rate0…100; standalone base−100…100/exponent0…10. Linear inputs−10…10, calculus coefficients−5…5/x₀−3…3, statistics3–20 observations−100…100, binomial n1–30/p0…1/k0…n. Task hints show the limits. Exact and approximate results are labeled.

## Current evidence and sharing

123 regression tests and the production build pass after this UI simplification. Actual browser checks exercised all 17task answers, synchronized variation/invalid/reset and both routes without image/download controls. Legacy helper tests remain in the suite; passing them does not re-enable removed features. [Simplification report](outputs/simplified-20261014/REPORT.md) records the change.

Author: **Abdul Basit**. Source remains private and UNLICENSED; [CREDITS.md](CREDITS.md) records this choice. No deployment, source publication or submission has occurred. The video work remains paused and its old screenshots describe an earlier interface.

The offline acceptance requirement is **cancelled by the author's scope change**, not marked passed. Previously downloaded files, source ZIPs and audit reports remain historical backups. Earlier ZIPs contain the older feature set and are not the current source snapshot. The pre-simplification README is archived in outputs/simplified-20261014/README-before.md.
