# Lessonline

### See how the answer happens.

Turn a supported mathematics question into worked steps and an interactive visual. Change one value and follow the effect through the answer, reasoning, graph, and table.

**[Try the app](https://lessonline-gamma.vercel.app/)** · **[Watch the demo](https://youtu.be/6rGK_u6bctY)** · **[Devpost submission](https://devpost.com/software/lessonline)**

Created by **Abdul Basit** for **Hyperbloom October — UI/UX and Web Design**.

## Why Lessonline?

A correct answer can show the result without explaining how a change affects it.

Start with:

```text
2x + 1 = 7
x = 3
```

Change only the constant from 1 to 3:

```text
2x + 3 = 7
x = 2
```

Lessonline connects that change to the updated algebra, graph intersection, and numeric table.

## How it works

1. **Paste** a supported question or choose an example.
2. **Check** the interpreted task and values.
3. **Solve** and read the worked steps.
4. **Explore** by changing values.

The original confirmed question remains distinguishable from the current variation. Incomplete exploration inputs display a warning and retain the last valid solution. **Reset to original** restores the starting values.

## Supported mathematics

Lessonline supports **17 bounded task types**:

| Area | Supported tasks |
|---|---|
| Basic mathematics | Arithmetic expressions, fraction simplification, percentage of an amount, percentage increase, percentage decrease, powers |
| Linear equations | Solve for x, evaluate a line |
| Quadratic calculus | Derivative, point evaluation, tangent line |
| Population statistics | Mean, median, range, population standard deviation |
| Binomial probability | Exactly-k probability, expected successes |

Fraction arithmetic uses exact reduced fractions. Decimal approximations are labeled separately.

### Example questions

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

## Design decisions

- **Visible interpretation:** inspect the app’s understanding before solving.
- **Connected representations:** worked steps, visuals, and tables follow the same valid values.
- **Original versus current:** explore changes without losing the starting question.
- **Predictable recovery:** invalid drafts retain the complete last valid mathematical state.
- **Clear controls:** labeled inputs, keyboard focus, and readable layouts.

These are implemented design choices, not a claim of formal accessibility certification.

## Technology

- React
- TypeScript
- Vite
- CSS
- JSXGraph
- Vercel

The main question solver uses **deterministic calculations in the browser**. It does not require an AI API key, GPU, Python installation, database, or local language model.

## Run locally

Use **Node.js 24** and npm.

```bash
npm ci --include=optional
npm run dev
```

Open the local URL printed by Vite.

### Test

```bash
npm test
```

### Build

```bash
npm run build
npm run preview
```

The current implementation passed **123 regression tests** and the production build during final verification. Browser checks exercised all 17 supported task types, synchronized value changes, invalid-input feedback, and reset behavior.

## Scope and limits

Lessonline is a focused prototype, not an unrestricted mathematics or word-problem solver.

- Arithmetic expressions support `+`, `−`, `×`, `÷`, parentheses, unary signs, and `^` powers.
- Arithmetic inputs have expression-length, nesting, numeric, and precision limits.
- Powers require integer exponents from 0 to 10.
- Division by zero, `0^0`, factorials, unsupported functions, and implicit multiplication are rejected.
- Calculus support is limited to quadratic functions.
- Statistics support population measures for bounded datasets.
- Probability support is limited to the implemented binomial tasks.

Task-specific hints show the accepted input limits.

### Current interface

The active question-solving experience accepts **pasted text**. Image/photo input and offline-download controls were removed to keep the workflow focused.

Some earlier OCR and export implementations, dependencies, assets, and tests remain in the repository for possible future restoration. Their presence does not mean those features are supported in the current interface.

The lesson builder remains available. Its optional NVIDIA NIM integration is separate from the main solver and requires a configured server. The static Vercel deployment does not provide that server endpoint.

## Environment variables

No API key is needed for the main mathematics solver.

For optional server-side features, consult `.env.example`. Keep real credentials in a local `.env` file and out of Git.

Never put a private API key in a `VITE_*` variable: those variables can be included in browser-delivered code.

## Project status

- Public source repository
- Live application deployed on Vercel
- Demo video published on YouTube
- Submitted to Hyperbloom October on Devpost

Historical reports and archived packages may describe earlier versions. The current interface and scope are described above.

## What’s next

- Gather feedback from students and teachers.
- Improve explanations where users find the reasoning unclear.
- Expand supported question types only alongside verified calculations, clear limits, and useful visualizations.

## Credits and AI assistance

**Abdul Basit** — solo creator responsible for the concept, UI/UX direction, mathematics workflows, implementation, testing, deployment, and demo narration.

AI-assisted tools supported planning, development, testing, and video editing. The demonstration uses the creator’s own voice, enhanced with Adobe Podcast.

See [CREDITS.md](CREDITS.md) and the bundled third-party notices for dependency acknowledgments.

## License

The project is currently **UNLICENSED**. Publishing the repository does not grant an open-source license to the original project code.

Third-party libraries and assets retain their respective licenses.
