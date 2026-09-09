import { z } from 'zod';

export const PrimitiveEnum = z.enum(['BOUNDARY', 'CANARY']);
export type Primitive = z.infer<typeof PrimitiveEnum>;

export const ExecutionModeEnum = z.enum(['CONTROLLED', 'AUTHORIZED_LIVE']);
export type ExecutionMode = z.infer<typeof ExecutionModeEnum>;

// Represents the types of Boundary tests supported
export const BoundaryTypeEnum = z.enum(['NUMERIC_THRESHOLD', 'QUANTITY_DISCOUNT', 'SPEND_TO_SAVE', 'FEE_THRESHOLD']);
export type BoundaryType = z.infer<typeof BoundaryTypeEnum>;

export const ExperimentSpecSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  primitive: PrimitiveEnum,
  boundaryType: BoundaryTypeEnum.optional(), // Only applicable for BOUNDARY
  targetUrl: z.string().url(),
  testConditions: z.object({
    itemsToAdd: z.array(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      quantity: z.number().int().positive()
    })).optional(),
    cartSubtotalTarget: z.number().positive().optional(),
    canaryInputTarget: z.string().optional(),
    allowedDestinations: z.array(z.string()).optional()
  }),
  expectedObservables: z.object({
    shippingCost: z.number().optional(),
    discountApplied: z.boolean().optional(),
    discountValue: z.number().optional(),
    feeApplied: z.boolean().optional(),
    feeValue: z.number().optional(),
    markerLeakObserved: z.boolean().optional()
  })
});

export type ExperimentSpec = z.infer<typeof ExperimentSpecSchema>;
