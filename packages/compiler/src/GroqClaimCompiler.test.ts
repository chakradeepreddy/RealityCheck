import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqClaimCompiler } from './GroqClaimCompiler';

describe('GroqClaimCompiler', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let globalFetchStub: any;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.GROQ_API_KEY = 'test_key';
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b';

    globalFetchStub = vi.fn();
    globalThis.fetch = globalFetchStub;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function mockGroqResponse(content: any, status = 200) {
    globalFetchStub.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => JSON.stringify(content),
      json: async () => ({
        choices: [
          {
            message: {
              content: typeof content === 'string' ? content : JSON.stringify(content)
            }
          }
        ]
      })
    });
  }

  it('A. Valid compilation: outputs a valid ExperimentSpec', async () => {
    mockGroqResponse({
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    });

    const compiler = new GroqClaimCompiler();
    const result = await compiler.compileClaim('Free shipping over 999', 'https://example.com');

    expect(result.schemaVersion).toBe('1.0.0');
    expect(result.primitive).toBe('BOUNDARY');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.testConditions.cartSubtotalTarget).toBe(999);
  });

  it('B. URL preservation: compiler enforces authoritative user URL', async () => {
    mockGroqResponse({
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://hacked-url.com/changed',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {}
    });

    const compiler = new GroqClaimCompiler();
    const result = await compiler.compileClaim('Free shipping over 999', 'https://example.com/authoritative');

    expect(result.targetUrl).toBe('https://example.com/authoritative');
  });

  it('C. Invalid schema: fails safely on malformed JSON', async () => {
    mockGroqResponse('this is not json');

    const compiler = new GroqClaimCompiler();
    await expect(compiler.compileClaim('x', 'https://example.com')).rejects.toThrow(/invalid JSON/);
  });

  it('C2. Invalid schema: fails safely on bad Zod structure', async () => {
    mockGroqResponse({
      schemaVersion: '9.9.9', // invalid
      primitive: 'BOUNDARY',
      targetUrl: 'https://example.com',
      testConditions: {}
    });

    const compiler = new GroqClaimCompiler();
    await expect(compiler.compileClaim('x', 'https://example.com')).rejects.toThrow(/Zod validation failure/);
  });

  it('D. Wrong primitive: rejects CANARY since Step 5B is BOUNDARY only', async () => {
    mockGroqResponse({
      schemaVersion: '1.0.0',
      primitive: 'CANARY', // Valid Zod, but invalid semantically for this step
      targetUrl: 'https://example.com',
      testConditions: {},
      expectedObservables: {}
    });

    const compiler = new GroqClaimCompiler();
    await expect(compiler.compileClaim('x', 'https://example.com')).rejects.toThrow(/primitive must be BOUNDARY/);
  });

  it('E. Invalid threshold: rejects missing cartSubtotalTarget', async () => {
    mockGroqResponse({
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com',
      testConditions: {
        // missing cartSubtotalTarget
      },
      expectedObservables: {}
    });

    const compiler = new GroqClaimCompiler();
    await expect(compiler.compileClaim('x', 'https://example.com')).rejects.toThrow(/Invalid or missing numeric threshold/);
  });

  it('G. Missing API key: fails clearly without request', async () => {
    delete process.env.GROQ_API_KEY;

    const compiler = new GroqClaimCompiler();
    await expect(compiler.compileClaim('x', 'https://example.com')).rejects.toThrow(/GROQ_API_KEY environment variable is missing/);
    expect(globalFetchStub).not.toHaveBeenCalled();
  });

  it('H. Groq provider failure: clean typed failure', async () => {
    mockGroqResponse({ error: 'Rate limited' }, 429);

    const compiler = new GroqClaimCompiler();
    await expect(compiler.compileClaim('x', 'https://example.com')).rejects.toThrow(/Groq provider failure: 429/);
  });

  it('I. No verdict authority: returns ExperimentSpec, no execution', async () => {
    mockGroqResponse({
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: {}
    });

    const compiler = new GroqClaimCompiler();
    const result = await compiler.compileClaim('claim', 'https://example.com');
    
    // Validates we get an ExperimentSpec and the compiler finishes without calling browser code
    expect(result).toHaveProperty('schemaVersion');
    expect(globalFetchStub).toHaveBeenCalledTimes(1);
    // There are no imports to playwright, verifier, or engine in the compiler
  });
});
