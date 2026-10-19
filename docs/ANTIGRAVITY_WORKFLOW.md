# Antigravity Implementation & Engineering Workflow

## 1. Collaborative Operating Principles

To maintain world-class engineering standards, zero code rot, and seamless collaboration during development, all subsequent implementation tasks must adhere to these governing rules:

1. **One Controlled Phase at a Time**: Never attempt to scaffold or implement multiple phases in a single prompt. Each phase must be explicitly reviewed, tested, and approved before moving forward.
2. **Never Invent Undocumented Business Logic**: When encountering ambiguous edge cases (e.g., regional tax rounding, tips distribution), document the assumption in code comments or ask for user confirmation rather than inventing silent assumptions.
3. **Atomic, Test-Backed Commits**: Every functional feature must be accompanied by its corresponding unit, integration, or E2E test.
4. **Git Branching Discipline**: Never push directly to `main` or `dev`. Always state: "Create a new branch" and work within isolated feature branches (e.g., `feat/phase2-design-system`).
5. **No Blind Dependency Installations**: Review packages for bundle footprint, security advisories, and maintenance health before proposing additions to `package.json`.

---

## 2. Standard Prompt Structure for Future Implementation Phases

When requesting implementation of future phases or components, structure prompts using this template:

```markdown
### Phase [X]: [Module Name] Implementation Task
- **Target Deliverable**: [Specific component, service, or migration]
- **Relevant Docs**: docs/[DATABASE_DESIGN.md / UI_UX_SPECIFICATION.md / etc.]
- **Scope Boundary**: Implement ONLY [feature list]. Do not implement [future features].
- **Acceptance Criteria**:
  1. [Specific criteria 1]
  2. [Specific criteria 2]
- **Verification Plan**:
  - Unit tests to run: `npm run test`
  - Visual verification path: `/route-name`
```

---

## 3. Code Generation & Review Checklist

Before any code modification is committed or declared complete, verify:

- [ ] **Type Safety**: Zero `any` types. All domain models adhere to TypeScript interfaces generated from the PostgreSQL schema.
- [ ] **Tenant Safety**: Every database query includes verified tenant context or relies on tested RLS policies. No raw `tenant_id` parameters accepted blindly from frontend input.
- [ ] **Financial Precision**: All monetary calculations use `NUMERIC(12, 4)` precision or equivalent integer/scaled decimal math. Never use standard floating-point numbers (`0.1 + 0.2 !== 0.3`).
- [ ] **Error Handling**: Graceful error boundaries, stable low-cardinality error logs, and descriptive user-facing alerts.
- [ ] **Responsive Design**: Tested across 360px mobile viewport, 768px tablet, and 1280px+ desktop. Touch targets strictly $\ge 48\text{px}$.
- [ ] **Performance Budgets**: Bundle size verified against route budgets; no unused imports or oversized dependencies.
