import { z } from 'zod';

export const ObservationSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  timestamp: z.string().datetime(),
  url: z.string().url(),
  
  browserConditions: z.object({
    viewport: z.object({
      width: z.number(),
      height: z.number()
    }),
    userAgent: z.string(),
    locale: z.string()
  }).optional(),

  pageState: z.object({
    // QuickCart fields (kept for backwards compatibility)
    cartSubtotal: z.number().optional(),
    shippingCost: z.number().optional(),
    discountApplied: z.boolean().optional(),
    discountValue: z.number().optional(),
    feeApplied: z.boolean().optional(),
    feeValue: z.number().optional(),
    quantities: z.record(z.string(), z.number()).optional(),
    // Flipkart adapter fields
    maxDiscountPercent: z.number().optional(),
    discountCount: z.number().optional(),
    // SauceDemo adapter fields
    minItemPrice: z.number().optional(),
    maxItemPrice: z.number().optional(),
    itemCount: z.number().optional(),
    allPrices: z.array(z.number()).optional(),
    // Juice Shop adapter fields
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    productCount: z.number().optional(),
  }).optional(),

  // Can include raw text extracted from relevant DOM elements
  domObservations: z.record(z.string(), z.string()).optional(), 
  
  // Can include specific markers found by canary test
  canaryMarkers: z.array(z.string()).optional(),
  
  // Can include specific network leaks
  canaryNetworkObservations: z.array(z.object({
    url: z.string().url(),
    method: z.string(),
    markerFound: z.boolean()
  })).optional(),

  // References to evidence stored elsewhere
  evidenceRefs: z.object({
    screenshotPath: z.string().optional(),
    tracePath: z.string().optional(),
    networkLogPath: z.string().optional()
  }).optional()
});

export type Observation = z.infer<typeof ObservationSchema>;
