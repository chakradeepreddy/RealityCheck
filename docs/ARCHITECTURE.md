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

- **Frontend**: React + Vite + Tailwind for the user dashboard.
- **Backend**: Node.js + Fastify for the API.
- **Contracts**: Zod-based typed schemas for `ExperimentSpec` and `Observation`.
- **Experiment Engines**: The Boundary Engine computes deterministic transitions from observations. It operates on a coarse-to-fine probe strategy and does NOT determine the final verdict.
- **Browser Automation**: Playwright + Chromium.
- **Verifier**: Deterministic typescript logic to analyze boundary engine outputs against the original claim.
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
