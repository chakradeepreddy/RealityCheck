# RealityCheck Architecture

## System Purpose
RealityCheck is a hackathon-grade claim-first browser experimentation system. Its goal is to take a natural-language claim (e.g., "Free shipping on orders over $50"), run controlled experiments against a real browser environment, and output a deterministic verdict supported by empirical evidence.

## Core Loop
The core philosophy is:
**PROMISE → EXPERIMENT → BROWSER → EVIDENCE → VERDICT → REPLAY**

1. **AI Proposes**: A ClaimCompiler (powered by an LLM) translates a natural-language claim into a strictly structured `ExperimentSpec`.
2. **Browser Observes**: A SiteAdapter uses Playwright to execute the experiment in Chromium and gathers raw `Observation` data (network, DOM state, screenshots).
3. **Deterministic Code Decides**: A purely deterministic verifier analyzes the `Observation` against the `ExperimentSpec` and issues a `Verdict`.

## Architecture Boundaries
To enforce safety and correctness, the system explicitly separates LLM logic from browser automation and verdict generation:

- **The LLM must NEVER decide the verdict.**
- **The LLM must NEVER directly manipulate the browser.**
- **The deterministic verifier owns SUPPORTED / CONTRADICTED / INCONCLUSIVE.**

By isolating the LLM behind the `ClaimCompiler` boundary, we guarantee that the LLM cannot hallucinate successes or manipulate the browser in unsafe ways.

### Boundary Engine vs Verifier Responsibilities
A critical architectural separation exists between observation processing and final decision making:
- **Boundary Engine**: "Where did the observed transition occur?" (Purely analyzes raw browser data into a boundary result).
- **Verifier**: "Does that observed transition satisfy the claim?" (Strictly compares the engine's result against the original ExperimentSpec).

### Fail-Closed Behavior
RealityCheck operates with strict fail-closed philosophy. If evidence is missing, boundary analysis is inconclusive, or fields do not match, the Verifier defaults to **INCONCLUSIVE**. It never guesses or assumes missing context.

## Major Modules
Conceptually, the system is organized into the following areas:

### 1. Claim Compiler (`@realitycheck/compiler`)
The entry point of the pipeline. It takes natural language claims (e.g. "Free shipping over ₹999") and compiles them into a structured `ExperimentSpec`.
- Powered by Groq's `openai/gpt-oss-120b` via structured outputs (Zod to JSON Schema).
- Performs strict schema validation and deterministic semantic validation.
- Does NOT execute browser actions, manufacture evidence, or determine verdicts.
- Fails closed on invalid inputs or malformed LLM responses.

### 2. Orchestration Layer (`@realitycheck/executor`)
The Experiment Executor connects the contracts, browser layer, engines, and verifier deterministically into a single end-to-end pipeline.
- It operates with zero LLM involvement.
- It is structurally website-agnostic (QuickCart details are injected via SiteAdapters).
- It safely fails closed: if inputs are invalid or the browser crashes, it generates an `INCONCLUSIVE` verdict without manufacturing evidence or faking data.

### 3. Browser Runner & SiteAdapters (`@realitycheck/browser`)
The browser layer runs Playwright against live websites to generate deterministic `Observation`s. It is composed of two boundaries:
- **`BrowserRunner`**: A generic execution engine that iterates through required test states, launches Chromium contexts, manages the observation loop, and fails closed safely if things go wrong. It has **no** knowledge of specific sites.
- **`SiteAdapter`**: The site-specific bridge (e.g. `QuickCartAdapter`) that translates generic RealityCheck instructions (e.g. "navigate to start", "establish numeric subtotal 1050", "read shipping DOM") into specific Playwright interactions (`locator.fill`, `locator.click`). Real-world authorized websites simply implement this adapter to plug into the engine safely without bypassing security layers.

### 4. Boundary Engine (`@realitycheck/engines`)
Responsible for isolating transition points from an array of `Observation` objects. Purely functional.

### 5. Deterministic Verifier (`@realitycheck/verifier`)
Strict rule-engine that validates the `BoundaryAnalysisResult` against the original `ExperimentSpec` and issues a `Verdict`.

### 6. Contracts (`@realitycheck/contracts`)
Zod schemas defining the universal vocabulary: `ExperimentSpec` (the claim to test), `Observation` (the raw browser data), and `RunManifest` (the execution plan).

- **Frontend**: React + Vite + Tailwind for the user dashboard.
- **Backend**: Node.js + Fastify for the API.
- **Persistence & Evidence**: SQLite + Drizzle, storing structured JSON and file-system paths for traces/screenshots.

## Contract-First Approach
We strictly freeze the data models (Contracts) before implementing the engines. By defining `ExperimentSpec` and `Observation` early, we ensure that:
1. The LLM can produce what we expect.
2. The browser can consume the spec.
3. Tests can be written without requiring either side to be fully implemented.

## What is Implemented NOW
- Fundamental TypeScript contracts (`ExperimentSpec`, `Observation`, `RunManifest`).
- Interfaces for `ClaimCompiler` and `SiteAdapter`.
- Zod runtime validation logic to ensure fail-closed boundaries.
- Monorepo package structure for contracts.

## What is Deliberately Deferred
- Actual LLM connectivity (OpenAI/Anthropic).
- Playwright/Chromium engine implementation.
- Express/Fastify API servers.
- Frontend dashboard.
- Database schemas (Drizzle/SQLite).
