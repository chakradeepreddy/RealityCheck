const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

const PrimitiveEnum = z.enum(['BOUNDARY', 'CANARY']);
const BoundaryTypeEnum = z.enum(['NUMERIC_THRESHOLD', 'QUANTITY_DISCOUNT', 'SPEND_TO_SAVE', 'FEE_THRESHOLD']);

const ExperimentSpecSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  primitive: PrimitiveEnum,
  boundaryType: BoundaryTypeEnum.optional(),
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

const jsonSchema = zodToJsonSchema(ExperimentSpecSchema, 'ExperimentSpec');

console.log(JSON.stringify(jsonSchema, null, 2));
