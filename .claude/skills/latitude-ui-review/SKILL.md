---
name: latitude-ui-review
description: Review a Latitude product's UI code for design-system compliance and fix the drift — hardcoded colors, Tailwind palette colors, bold text, raw font sizes, off-scale spacing or radius, dark-mode overrides, icons imported straight from Lucide, local copies of components, missing labels or alt text. Use this whenever the user asks to review, audit, check, clean up or "make consistent" UI code, before opening a PR that touches UI, after a large UI change, or when something "looks off" compared to other Latitude products — even if they don't say "design system".
---

# Reviewing UI for design-system compliance

Products drift one hardcoded value at a time. Each raw `#fff` or `font-bold` works today but breaks dark mode,
ignores brand updates and makes this product look slightly different from the others. This review finds that drift
and replaces it with the design system's tokens and components.

## 1. Run the audit

```bash
node .claude/skills/latitude-ui-review/scripts/audit.mjs src
```

It scans `.svelte`, `.ts`, `.js` and `.css` files and prints `file:line`, the offending snippet and the fix. Errors
(exit code 1) are clear violations; warnings need judgment. Use `--json` if you want to process the results.

What it checks: arbitrary/hex/rgb colors, Tailwind palette colors (`bg-gray-100`), `dark:` color overrides, weights
above 500, raw Tailwind font sizes, arbitrary font sizes/radius/spacing, Tailwind shadows, direct Lucide imports,
local `ui/` component copies, and `<img>` without `alt`.

## 2. Review what the script can't see

Read the changed or relevant components and check:

- **Hand-rolled components.** A `<button class="…">`, styled `<input>`, card-like `div` with shadow and radius, or a
  custom avatar/chat bubble that duplicates `Button`, `Input`, `Card`, `ChatMessage`, `Avatar`. Replace with the
  design-system component. (The component list is in the `latitude-ui` skill.)
- **Hierarchy.** More than one primary (`default`) button in a view; headings not using `text-heading`/`text-title`;
  secondary text not using `text-muted-foreground`.
- **Accessibility.** Fields without a visible `Label`; icon-only buttons without `aria-label`; errors without
  `aria-invalid` and a linked message; destructive actions without the `destructive` variant or a confirmation.
- **Brand gradient misuse.** `bg-brand` anywhere other than the AI avatar or a deliberate brand moment.
- **Borders around cards.** Cards are separated by `shadow-hairline`, not borders.

## 3. Fix

Fix errors directly; they have unambiguous replacements. For warnings, pick the closest token:

| Found | Replace with |
| --- | --- |
| `bg-white`, `bg-[#fff]` | `bg-card` (surfaces) or `bg-background` (page) |
| `text-gray-500`, `text-[#6a6a6a]` | `text-muted-foreground` |
| `text-black`, `text-gray-900` | `text-foreground` |
| `bg-black text-white` | `bg-primary text-primary-foreground` |
| `text-red-600`, `bg-red-50` | `text-destructive`, `bg-destructive/10` |
| `border-gray-200` | `border-border` |
| `text-sm` / `text-base` / `text-lg` / `text-2xl` | `text-body` / `text-body-lg` / `text-title` / `text-heading` |
| `font-semibold`, `font-bold` | `font-medium` |
| `shadow-md` on a card | `shadow-hairline`; floating panel → `shadow-raised` |
| `rounded-[10px]` | nearest of `rounded-sm` 8 · `md` 12 · `lg` 16 · `xl` 24 |
| `import X from '@lucide/svelte/icons/x'` | `import { X } from '@latitudelabs/design-system/icons'` |

If a value has no sensible token (a chart series color, a third-party embed), leave it and add `// audit-ignore` on
that line with a short reason, so the next review doesn't flag it again.

Re-run the audit until it reports no errors, then run the app's `check` and `build` scripts.

## 4. Report

Summarize for the user:

```
## Design-system review
- Fixed: <n> issues (<grouped by kind, e.g. "12 hardcoded colors → roles, 3 bold → medium">)
- Replaced hand-rolled components: <which, where>
- Left as-is (audit-ignore): <what and why>
- Suggest for the design system: <anything genuinely missing, e.g. "a Select component">
```

Anything genuinely missing from the design system is worth reporting to the design system team rather than building
locally. That's how the system grows.
