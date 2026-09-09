export const VerdictEnum = {
  SUPPORTED: 'SUPPORTED',
  CONTRADICTED: 'CONTRADICTED',
  INCONCLUSIVE: 'INCONCLUSIVE'
} as const;

export type Verdict = typeof VerdictEnum[keyof typeof VerdictEnum];
