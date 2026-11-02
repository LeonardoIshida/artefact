# Accessibility audit

Scope: task board, task forms, feedback, and shared controls after the UI/UX
polish in FEAT-14. Text contrast uses the WCAG relative-luminance formula and
the CSS token values. Normal-sized text needs at least 4.5:1 contrast.

## Contrast

| Foreground | Background | Contrast |
| --- | --- | ---: |
| `--muted-foreground: oklch(0.54 0 0)` | `--muted: oklch(0.97 0 0)` | 4.64:1 |
| Todo status label | 10% todo tint over white | 5.05:1 |
| In-progress status label | 10% in-progress tint over white | 5.12:1 |
| Done status label (`oklch(0.5 0.15 155)`) | 10% done tint over white | 4.71:1 |
| Destructive text (`oklch(0.577 0.245 27.325)`) | White card | 4.76:1 |
| Focus ring (`oklch(0.42 0 0)`) | White | 8.47:1 |
| Success text (`emerald-900`) | `emerald-50` | 9.23:1 |
| Success icon (`emerald-700`) | `emerald-50` | 5.21:1 |

The muted foreground and done-status token were darkened after the audit. The
destructive alert description no longer applies 90% opacity, which otherwise
reduced its contrast. Focus rings now use the full ring color instead of 50%
opacity. Status-tint values use a conservative 10%-over-white alpha composite.

## Target sizes

- Task-card icon controls use `icon-sm` (`size-7`, 28×28 CSS px).
- Feedback dismissal uses `icon` (`size-8`, 32×32 CSS px).
- Dialog close controls use `icon-sm` (28×28 CSS px); text buttons are at least
  24 CSS px high.

These controls meet WCAG 2.2 SC 2.5.8's 24×24 CSS px minimum target size.
