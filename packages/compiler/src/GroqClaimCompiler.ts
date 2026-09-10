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
Translate natural language claims into a structured ExperimentSpec JSON object.
Always return valid JSON. Do NOT explain. Do NOT add extra text.

SUPPORTED CLAIM FAMILIES:
A. NUMERIC THRESHOLD / BOUNDARY — QuickCart (e.g. "Free shipping on orders of 999 or more")
   -> primitive: "BOUNDARY", boundaryType: "NUMERIC_THRESHOLD", testConditions.cartSubtotalTarget: <number>

B. QUANTITY / PRODUCT COUNT DISCOUNT (e.g. "Buy 3 products and get 10% off")
   -> primitive: "BOUNDARY", boundaryType: "QUANTITY_DISCOUNT", testConditions.itemsToAdd: [{"quantity": <number>}], expectedObservables.discountApplied: true

C. SPEND-TO-SAVE / FEE THRESHOLD (e.g. "Spend 2000 and get 200 off")
   -> primitive: "BOUNDARY", boundaryType: "SPEND_TO_SAVE", testConditions.cartSubtotalTarget: <number>

D. CANARY / CONTROLLED DATA-LEAK CLAIM (e.g. "Does this form send my information to another website?")
   -> primitive: "CANARY", testConditions.canaryInputTarget: "email_input", testConditions.allowedDestinations: []
   For juice-shop.herokuapp.com, set allowedDestinations: ["juice-shop.herokuapp.com"]

E. PRODUCT PRICE / DISCOUNT % BOUNDARY (for Flipkart, SauceDemo, or Juice Shop):
   - "Every laptop has at least X% discount" / "At least one product has over X% off" (Flipkart)
     -> primitive: "BOUNDARY", boundaryType: "NUMERIC_THRESHOLD",
        testConditions.numericTarget: X (the discount %), 
        testConditions.observableInputKey: "maxDiscountPercent",
        testConditions.observableOutputKey: "maxDiscountPercent",
        testConditions.observableOutputThreshold: X
   - "The cheapest item costs less than $X" / "Minimum price is under $X" (SauceDemo, Juice Shop)
     -> primitive: "BOUNDARY", boundaryType: "NUMERIC_THRESHOLD",
        testConditions.numericTarget: X (the price),
        testConditions.observableInputKey: "minItemPrice",
        testConditions.observableOutputKey: "minItemPrice",
        testConditions.observableOutputThreshold: X
   - For juice-shop.herokuapp.com use observableInputKey: "minPrice" instead

F. UNSUPPORTED / AMBIGUOUS CLAIMS (e.g. "This website is trustworthy", "The product is high quality")
   If the claim cannot be mapped to the above verifiable experiments, set primitive to "UNSUPPORTED".

Rules for properties:
- schemaVersion: "1.0.0"
- targetUrl: exactly as provided by the user.

Strictly adhere to this JSON Schema for your output (except for primitive: "UNSUPPORTED" which you should use for ambiguous claims despite the schema):
${JSON.stringify(jsonSchema)}
`.trim();

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Target URL: ${targetUrl}\nClaim: ${claim}` }
      ]
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
      let rawContent = data.choices[0].message.content;
      // Extract JSON if wrapped in markdown
      const match = rawContent.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        rawContent = match[1];
      }
      parsedContent = JSON.parse(rawContent.trim());
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
    if (spec.primitive !== 'BOUNDARY' && spec.primitive !== 'CANARY') {
      throw new Error(`Semantic validation failure: unsupported primitive ${spec.primitive}`);
    }

    if (spec.primitive === 'BOUNDARY') {
      if (!spec.boundaryType) {
        throw new Error('Semantic validation failure: BOUNDARY primitive requires a boundaryType');
      }

      if (spec.boundaryType === 'NUMERIC_THRESHOLD') {
        // Accept either cartSubtotalTarget (QuickCart) or numericTarget (new adapters)
        const hasTarget = (typeof spec.testConditions.cartSubtotalTarget === 'number' && Number.isFinite(spec.testConditions.cartSubtotalTarget))
          || (typeof spec.testConditions.numericTarget === 'number' && Number.isFinite(spec.testConditions.numericTarget));
        if (!hasTarget) {
          throw new Error('Semantic validation failure: Invalid or missing numeric threshold (cartSubtotalTarget or numericTarget)');
        }
      }

      if (spec.boundaryType === 'QUANTITY_DISCOUNT') {
        if (!spec.testConditions.itemsToAdd || spec.testConditions.itemsToAdd.length === 0) {
          throw new Error('Semantic validation failure: Invalid or missing itemsToAdd for QUANTITY_DISCOUNT');
        }
      }
    }

    if (spec.primitive === 'CANARY') {
      if (typeof spec.testConditions.canaryInputTarget !== 'string') {
        throw new Error('Semantic validation failure: Invalid or missing canaryInputTarget for CANARY');
      }
    }

    // Enforce URL preservation (authoritative)
    if (spec.targetUrl !== targetUrl) {
      // Deterministically repair the URL if the LLM attempted to change it
      spec.targetUrl = targetUrl;
    }

    return spec;
  }
}
