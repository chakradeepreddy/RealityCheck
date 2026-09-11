RealityCheck
Don't just read the claim. Run it.
RealityCheck is a browser verification system that turns website claims into controlled, replayable experiments and determines whether they are actually true.
AI proposes. Browser observes. Code decides.

💡 The Idea
Websites make claims like:
- “Free shipping above ₹999”
- “Buy 3 and get 10% off”
- “Offer end in 10 mins”
- “Your data stays within the expected boundary”
Instead of simply reading these claims, RealityCheck tests them through a real browser and collects evidence.

🔬 How It Works
CLAIM
  ↓
EXPERIMENT
  ↓
BROWSER
  ↓
EVIDENCE
  ↓
VERDICT
  ↓
REPLAY

🤖 AI converts the claim into a constrained experiment.
🌐 Playwright + Chromium interacts with and observes the website.
⚙️ Deterministic verification produces the final result:
🟢 SUPPORTED
🔴 CONTRADICTED
🟡 INCONCLUSIVE
If reliable evidence cannot be established, RealityCheck fails closed instead of guessing.

🏗️ Tech Stack
React · TypeScript · Vite · Tailwind · Fastify · Zod · Playwright · Chromium · SQLite · Drizzle

🔁 Key Features
- Natural-language claim → experiment
- Adaptive browser interaction
- Boundary & discount verification
- Canary/data-flow experiments
- Evidence capture
- Deterministic verdicts
- Replayable experiments
- Controlled QuickCart benchmark
