# Component styles live in co-located CSS Modules; global CSS is reserved for tokens, base, and shared primitives

FukuFlow's styling moves to a two-layer model, adopted **incrementally**:

- **Global layer** (imported once, plain `.css`): design tokens (`styles/variables.css` + `styles/themes/*`), the base reset (`styles/base.css`), app-shell layout (`styles/layout.css`), and a small set of **shared UI primitives** reused across unrelated features (today: the `.btn-*` button family). These are the things that are *supposed* to be shared.
- **Component layer** (co-located `Component.module.css`): every component or feature owns its styles in a CSS Module next to its `.tsx`. Class names are camelCase and referenced through the imported `styles` object; media queries live inside the module. The bundler hashes these names, so they cannot collide with or leak into any other component.

The decision rule for new styles: a token, a reset, app-shell layout, or a primitive reused across ≥3 unrelated features → global; **everything else → the component's module.**

Migration is incremental, not big-bang. **Settings is the pilot** (it already has its own dedicated stylesheets, so it converts cleanly and proves the pattern end-to-end); the dashboard, heatmap, modals, asset-detail, and login screens stay global until they are migrated opportunistically.

## Why

- **Every styling bug we have hit came from global selectors.** `.btn-primary`/`.btn-secondary`/`.btn-danger` were defined three times and the Settings copies silently won the cascade in modals via stylesheet import order; the Settings stylesheet overrode `index.css` purely by load order. Module scoping makes this class of bug structurally impossible — a class in `Settings.module.css` cannot affect anything outside Settings.
- **"If I change this, what else breaks?" gets a reliable answer: nothing outside this component.** That is the single most important property for confidently modifying styles later, which is the stated goal.
- **Co-location and monolith breakup come for free.** The 4,457-line `index.css` dissolves into per-component files small enough to hold in your head, sitting next to the component they style.
- **Tokens stay global on purpose.** Theme-ability lives entirely in CSS variables; modules consume `var(--…)` and never hardcode. The token layer is already the healthy part of the system and is untouched.
- **Zero new tooling.** Vite supports `*.module.css` out of the box and the repo already has working examples (`ConfirmationModal.module.css`).

## Rejected alternatives

- **Split the global `index.css` into per-feature global files** (`dashboard.css`, `heatmap.css`, …). Improves navigability but leaves global selectors in place, so the collision/leakage/cascade-order failures — the actual source of our bugs — remain. Rejected as treating the symptom, not the cause.
- **Big-bang migration of the whole app at once.** Reaches the clean end-state fastest but produces an enormous, high-risk diff requiring exhaustive visual QA across every screen and theme simultaneously. Rejected in favor of an incremental, component-by-component path with contained blast radius.
- **A full design-system component layer (a `<Button>` component, etc.) now.** The right long-term home for shared primitives, but far larger than this decision needs. Deferred: primitives stay as global CSS classes for now; promoting them to components can happen later without reversing this decision.
- **Keep three coexisting paradigms (legacy global + page-scoped global + a half-adopted CSS Modules layer with four dead files).** This is the status quo that produced the drift; the dead module files (`Card`, `Form`, `Header`, `Modal`) are deleted as part of committing to one direction.

## Consequence

- **Conventions are now fixed**: co-located `*.module.css`, camelCase locals, `styles.*` references, modifier classes composed via a tiny local `cx()` helper rather than hand-built template strings, media queries inside the module, and `:global(...)` used only to reference the sanctioned shared primitives.
- **Tests must not depend on hashed class names.** The unit/component suites already select by `data-testid`/role. The Playwright Settings page object (`e2e/pages/SettingsPage.ts`) is the one exception — it matches `.settings-group` and `[class*="custom-select-*"]` — so migrating Settings includes adding stable `data-testid`s to `CustomSelect` and rewriting those selectors. Class-substring selectors are disallowed in e2e going forward.
- **The Settings migration deletes `settings_styles.css` and `settings-responsive.css` outright**, re-localizes the dashboard classes Settings was borrowing (`movers-*` section headers), folds the now-redundant `[data-theme='light'] .input-dark/…` overrides into token-driven base styles, and removes the duplicate legacy `.settings-page`/`.settings-section h2` block left in `index.css`.
- **The global surface shrinks over time.** Each future migration moves more out of `index.css`; the long-run end-state is a global layer of only tokens, base, layout, and primitives. A migration checklist is tracked so the remaining features (dashboard, heatmap, modals, asset-detail, login) follow the same path.
