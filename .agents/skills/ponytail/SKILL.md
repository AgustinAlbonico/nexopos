---
name: ponytail
description: Enforce lean, minimalist code implementation without unnecessary abstractions, dependencies, or premature scaffolding.
when-to-use: Always before writing, refactoring, fixing, reviewing, or designing code.
user-invocable: true
---

# Ponytail Skill: Lean Code Implementation

**Purpose:** Ensure every code modification is as simple, direct, and minimal as possible, solving the real problem without bloated abstractions or speculative future-proofing.

---

## Core Principles

1. **Understand the Real Flow First**
   - Deeply analyze the root cause and actual execution path before writing code.
   - Do not make assumptions or write code for hypothetical scenarios.

2. **Smallest Effective Solution**
   - Always choose the minimal implementation that completely solves the issue.
   - Every added line of code must earn its place.

3. **Reuse Before Create**
   - Check if existing functions or utilities in the codebase already satisfy the need.
   - Leverage language standard libraries (stdlib) and native platform APIs first.
   - Utilize existing installed dependencies instead of introducing new packages.

4. **Zero Premature Abstraction**
   - Do NOT add wrapper classes, complex design patterns, extra architectural layers, or speculative scaffolding unless explicitly required.
   - Write code for today's requirements, not imaginary future features.

5. **Uncompromised Quality & Safety**
   - Ponytail minimizes code and complexity, NOT rigor. You MUST still ensure:
     - Strict input/boundary validation and security checks.
     - Data consistency and correct database migrations (registered in index files).
     - Essential unit/integration tests.
     - Empirically verified root-cause fixes.

---

## Checklist Before Implementation

- [ ] Have I identified the root cause and actual execution flow?
- [ ] Is there existing code or a stdlib function that already does this?
- [ ] Am I introducing any unrequested abstractions, layers, or extra dependencies?
- [ ] Is this the absolute smallest change that fixes the problem robustly?
- [ ] Did I verify and test the solution?
