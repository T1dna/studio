"use server";

import { calculateInterest, CalculateInterestInput, CalculateInterestOutput } from "@/ai/flows/calculate-interest-flow";
import { z } from "zod";

const CalculateInterestInputSchema = z.object({
  customerId: z.string(),
  invoiceId: z.string(),
  invoiceAmount: z.number(),
  paymentTermsInDays: z.number(),
  daysOverdue: z.number(),
  customerPaymentHistory: z.string(),
  currentMarketConditions: z.string(),
  baseInterestRate: z.number(),
});


export async function runInterestCalculation(input: CalculateInterestInput): Promise<CalculateInterestOutput> {
    try {
        const validatedInput = CalculateInterestInputSchema.parse(input);
        const result = await calculateInterest(validatedInput);
        if (!result || !result.adjustedInterestRate || !result.reasoning) {
            throw new Error("AI model returned an invalid response.");
        }
        return result;
    } catch (error) {
        console.error("Error in runInterestCalculation:", error);
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error("Failed to calculate interest due to a server error.");
    }
}
