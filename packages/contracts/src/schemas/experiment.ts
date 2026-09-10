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
    // Generic numeric target for non-QuickCart adapters (e.g. price, discount%)
    numericTarget: z.number().optional(),
    // The pageState field the BoundaryEngine should analyse (e.g. 'cartSubtotal', 'maxDiscountPercent', 'minPrice')
    observableInputKey: z.string().optional(),
    // The pageState field that signals the threshold crossing (e.g. 'shippingCost', 'discountApplied')
    observableOutputKey: z.string().optional(),
    // The value the output key transitions FROM at the boundary (e.g. shipping cost = 0 means free)
    observableOutputThreshold: z.number().optional(),
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
