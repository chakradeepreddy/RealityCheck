# RealityCheck Build Progress

## Current Status
- Current phase: Foundation
- Current step: Step 1
- Overall completion estimate: 5%

## Completed Steps

1. **Step 1: Foundation + Contracts**
   - **What was implemented:**
     - Setup root Monorepo structure using NPM Workspaces.
     - Created `packages/contracts` for shared types and schemas.
     - Implemented `ExperimentSpec` and `Observation` Zod schemas.
     - Defined strict types for `Verdict`, `RunManifest`, `ExecutionMode`, `ClaimCompiler`, and `SiteAdapter`.
     - Established schema versions in `versions.ts`.
     - Wrote deterministic unit tests using Vitest (verified valid and invalid schema parsing).
   - **Files changed:**
     - `package.json`
     - `tsconfig.json`
     - `packages/contracts/package.json`
     - `packages/contracts/src/schemas/versions.ts`
     - `packages/contracts/src/schemas/experiment.ts`
     - `packages/contracts/src/schemas/observation.ts`
     - `packages/contracts/src/types/Verdict.ts`
     - `packages/contracts/src/types/RunManifest.ts`
     - `packages/contracts/src/types/ClaimCompiler.ts`
     - `packages/contracts/src/types/SiteAdapter.ts`
     - `packages/contracts/src/index.ts`
     - `packages/contracts/src/contracts.test.ts`
   - **Verification performed:**
     - Ran `npm install`
     - Ran `npm run typecheck`
     - Ran `npm test`
   - **Result:**
     - All tests passed. Typecheck succeeded. The contracts are strictly typed and robust.

## Architecture Decisions
- **Contract-first monorepo**: Placed contracts in a shared package (`@realitycheck/contracts`) to ensure the frontend, backend, LLM logic, and Playwright execution engines use the exact same truth for schemas.
- **Zod for boundaries**: `ExperimentSpec` and `Observation` are runtime-validated via Zod to enforce the fail-closed nature.
- **Fail-Closed Verdicts**: Explicit `Verdict` enum containing only `SUPPORTED`, `CONTRADICTED`, and `INCONCLUSIVE`.

## Contracts
- **ExperimentSpec**: `1.0.0`
- **Observation**: `1.0.0`
- **RunManifest**: `1.0.0`

## Commands
- **Install**: `npm install`
- **Typecheck**: `npm run typecheck`
- **Test**: `npm test`

## Known Issues
- None at this moment.

## Not Implemented Yet
- LLM Integration for Claim Compiler.
- Playwright Browser Automation.
- Database (SQLite/Drizzle).
- Web application interface.
- Backend API.

## Step 2 — Boundary Engine v1
   - **Objective:** Build a deterministic numeric-threshold Boundary Engine to compute transitions based on raw observations, independent of a browser or LLM.
   - **What was implemented:**
     - Created `packages/engines` package in the monorepo.
     - Implemented `BoundaryEngine` with pure deterministic logic (`analyzeNumericThreshold`).
     - Designed the analysis to evaluate sorting, bounds, transitions, and fail-closed missing data constraints.
     - Wrote deterministic Vitest test fixtures explicitly matching the A, B, C criteria outlined.
   - **Files created/modified:**
     - `packages/engines/package.json`
     - `packages/engines/src/BoundaryEngine.ts`
     - `packages/engines/src/BoundaryEngine.test.ts`
     - `packages/engines/src/index.ts`
     - `docs/ARCHITECTURE.md`
     - `docs/BUILD_PROGRESS.md`
   - **Domain/Data Flow:** `Observation[]` → `BoundaryEngine` → `BoundaryAnalysisResult`.
   - **Supported boundary form:** Numeric-threshold (specifically `cartSubtotal` vs `shippingCost`).
   - **Test fixtures:**
     - Fixture A: Contradictory Shipping (discovers 1050).
     - Fixture B: Honest Shipping (discovers 999).
     - Fixture C: Insufficient Evidence (no transition above).
   - **Test results:** All tests passed perfectly. The logic safely handled edge cases (unsorted, duplicates, missing observations, non-monotonic data).
   - **Typecheck results:** `npm run typecheck` returned 0 errors.
   - **Known limitations:** Only supports `>=` (numeric threshold).
   - **What is intentionally deferred:** Playwright, LLM, Verifier, database, canary.

## Step 3 — Deterministic Verifier v1
   - **Objective:** Build the deterministic domain logic that compares the original ExperimentSpec against the established BoundaryAnalysisResult to assign a final Verdict.
   - **What was implemented:**
     - Created `packages/verifier` package in the monorepo.
     - Implemented `DeterministicVerifier.verifyBoundary()`.
     - Architected strict separation between finding the boundary (Engine) vs interpreting it (Verifier).
     - Ensured "fail-closed" semantics: any missing thresholds, invalid primitives, or missing boundary analysis returns `INCONCLUSIVE`.
     - Structured output explicitly including the exact reason generated from deterministic comparison (no LLM).
   - **Files created/modified:**
     - `packages/verifier/package.json`
     - `packages/verifier/src/DeterministicVerifier.ts`
     - `packages/verifier/src/DeterministicVerifier.test.ts`
     - `packages/verifier/src/index.ts`
     - `docs/ARCHITECTURE.md`
     - `docs/BUILD_PROGRESS.md`
   - **Domain/Data Flow:** `ExperimentSpec` + `BoundaryAnalysisResult` → `DeterministicVerifier` → `VerifierResult` (Verdict + Reason).
   - **Supported semantics:** Numeric-threshold exact match validation (`>=` primitive assumption mapped to exact crossover verification).
   - **Test fixtures:**
     - Fixture A: HONEST -> SUPPORTED.
     - Fixture B: CONTRADICTED (observed higher threshold).
     - Fixture C: INCONCLUSIVE (boundary not established).
     - Fixture D: EARLIER OBSERVED BOUNDARY -> CONTRADICTED (rigid mismatch).
     - Edge Cases: INSUFFICIENT_OBSERVATIONS, missing parameters, and unsupported primitive handling to enforce fail-closed design.
   - **Test results:** 10/10 tests passed flawlessly and deterministically.
   - **Typecheck results:** `npm run typecheck` returned 0 errors.
   - **Known limitations:** Only evaluates exact integer match validation for the boundary; tolerances are explicitly skipped right now.
   - **What is intentionally deferred:** Real LLM integration, Playwright execution, actual SiteAdapter creation, Database integration.

## Step 4 — Browser Observation Foundation
   - **Objective:** Build the reusable, Playwright-based browser foundation to map generic boundary experiment requirements into concrete website interactions.
   - **What was implemented:**
     - Created `@realitycheck/browser` package mapping tests to real browser automation.
     - Refactored `SiteAdapter` contract into an interactive, multi-step process (`navigate`, `establishNumericState`, `observeState`) rather than an abstract monolithic execution.
     - Implemented `BrowserRunner` generic execution flow that iterates over required test states and safely wraps failures (fail-closed) without assuming any website structures or specific tests.
     - Implemented `QuickCartAdapter` to map RealityCheck's boundary primitives directly to the QuickCart integration environment (simulating `[data-test="quantity-input"]` additions to establish subtotals).
   - **Files created/modified:**
     - `packages/browser/package.json`
     - `packages/browser/src/BrowserRunner.ts`
     - `packages/browser/src/BrowserRunner.test.ts`
     - `packages/browser/src/QuickCartAdapter.ts`
     - `packages/browser/src/index.ts`
     - `packages/contracts/src/types/SiteAdapter.ts`
   - **Domain/Data Flow:** `ExperimentSpec` + `SiteAdapter` → `BrowserRunner` → `Observation[]`
   - **Supported semantics:** Extensible Playwright runner that interacts securely with target sites, isolates specific numeric boundary conditions, reads target DOM objects, and safely returns Zod-validated `Observation` collections.
   - **Test fixtures:**
     - Created a mocked Architectural integration test proving `BrowserRunner` has zero hardcoded QuickCart knowledge.
     - Simulated bot-protection failure handling (fail-closed architecture).
   - **Test results:** All 26 unit tests passed flawlessly.
   - **Typecheck results:** `npm run typecheck` returned 0 errors across all monorepo packages.
   - **Known limitations:** QuickCart integration lacks the backend (QuickCart not implemented yet).
   - **What is intentionally deferred:** LLM ClaimCompiler, UI, DB persistence.

## Current Status
- Current phase: Browser
- Current step: Step 4
- Overall completion estimate: 40%

## Next Step
Ready for Step 5.
