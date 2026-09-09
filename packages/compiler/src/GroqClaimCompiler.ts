import { ClaimCompiler, ExperimentSpec, ExperimentSpecSchema } from '@realitycheck/contracts';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class GroqClaimCompiler implements ClaimCompiler {
  private apiKey: string;
  private model: string;
  private groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  async compileClaim(claim: string, targetUrl: string): Promise<ExperimentSpec> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY environment variable is missing.');
    }

    // Convert Zod schema to JSON Schema for the LLM
    // @ts-ignore: excessively deep type instantiation error with zodToJsonSchema
    const jsonSchema = zodToJsonSchema(ExperimentSpecSchema, 'ExperimentSpec');

    const systemPrompt = `
You are a claim-to-experiment compiler for RealityCheck.
Your job is to translate a natural language claim into a structured ExperimentSpec JSON.
Return ONLY valid JSON matching the schema.
You must NOT browse, execute code, decide verdicts, or manufacture evidence.
You are generating a TEST PLAN, not a conclusion.
Only BOUNDARY experiments with boundaryType NUMERIC_THRESHOLD are supported.
The user's URL is authoritative and must be preserved exactly.
Propose sensible, numeric, finite, deterministic probe states relative to the claimed threshold.
Include useful values below, at, and above the threshold.
If the claim cannot be represented safely as a supported Boundary v1 experiment, you must fail rather than hallucinating unsupported fields or behavior.

Strictly adhere to this JSON Schema for your output:
${JSON.stringify(jsonSchema)}
`.trim();

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Target URL: ${targetUrl}\nClaim: ${claim}` }
      ],
      response_format: { type: 'json_object' }
    };

    let response: Response;
    try {
      response = await fetch(this.groqEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (e) {
      throw new Error(`Groq request failed: ${e instanceof Error ? e.message : 'Network error'}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq provider failure: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json();
    let parsedContent: any;
    
    try {
      parsedContent = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      throw new Error('Malformed response from LLM: invalid JSON');
    }

    // Step A: Schema Validation
    const validationResult = ExperimentSpecSchema.safeParse(parsedContent);
    if (!validationResult.success) {
      throw new Error(`Zod validation failure: ${validationResult.error.message}`);
    }

    let spec = validationResult.data;

    // Step B: Semantic validation
    if (spec.primitive !== 'BOUNDARY') {
      throw new Error(`Semantic validation failure: primitive must be BOUNDARY, got ${spec.primitive}`);
    }

    if (spec.boundaryType !== 'NUMERIC_THRESHOLD') {
      throw new Error(`Semantic validation failure: boundaryType must be NUMERIC_THRESHOLD, got ${spec.boundaryType}`);
    }

    // Enforce URL preservation (authoritative)
    if (spec.targetUrl !== targetUrl) {
      // Deterministically repair the URL if the LLM attempted to change it
      spec.targetUrl = targetUrl;
    }

    // Validate the threshold exists and is valid
    if (typeof spec.testConditions.cartSubtotalTarget !== 'number' || !Number.isFinite(spec.testConditions.cartSubtotalTarget)) {
      throw new Error('Semantic validation failure: Invalid or missing numeric threshold (cartSubtotalTarget)');
    }

    // The probe states in Boundary v1 are implicit relative to cartSubtotalTarget
    // Note: the Executor handles the actual probe generation or receives it as an array.
    // The prompt requested that the LLM proposes sensible probe states if the contract permits it.
    // Our existing contract does NOT have an explicit "probeStates" array. It only defines 'cartSubtotalTarget'.
    // The instructions say: "The LLM MAY propose probe states... Deterministic code validates and normalizes them... 
    // satisfy the existing ExperimentSpec contract".
    // Since the existing ExperimentSpec contract does NOT contain probe states, the compiler should just return the valid ExperimentSpec.
    // The prompt says: "normalize claims into the existing numeric threshold Boundary representation wherever the existing contract permits."

    return spec;
  }
}
