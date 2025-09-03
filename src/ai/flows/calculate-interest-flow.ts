'use server';

/**
 * @fileOverview Calculates interest on overdue invoices, dynamically adjusting rates using an LLM based on customer payment history and market conditions.
 *
 * - calculateInterest - A function that calculates the adjusted interest for overdue invoices.
 * - CalculateInterestInput - The input type for the calculateInterest function.
 * - CalculateInterestOutput - The return type for the calculateInterest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateInterestInputSchema = z.object({
  customerId: z.string().describe('The ID of the customer.'),
  invoiceId: z.string().describe('The ID of the invoice.'),
  invoiceAmount: z.number().describe('The total amount of the invoice.'),
  paymentTermsInDays: z.number().describe('The number of days allowed for payment before interest applies.'),
  daysOverdue: z.number().describe('The number of days the invoice is overdue.'),
  customerPaymentHistory: z.string().describe('A summary of the customer\'s payment history.'),
  currentMarketConditions: z.string().describe('A summary of current market conditions.'),
  baseInterestRate: z.number().describe('The base interest rate to be adjusted.'),
});
export type CalculateInterestInput = z.infer<typeof CalculateInterestInputSchema>;

const CalculateInterestOutputSchema = z.object({
  adjustedInterestRate: z
    .number()
    .describe(
      'The dynamically adjusted interest rate based on customer payment history and market conditions.'
    ),
  reasoning: z
    .string()
    .describe(
      'The LLM\'s reasoning for adjusting the interest rate, considering payment history and market conditions.'
    ),
});
export type CalculateInterestOutput = z.infer<typeof CalculateInterestOutputSchema>;

export async function calculateInterest(input: CalculateInterestInput): Promise<CalculateInterestOutput> {
  return calculateInterestFlow(input);
}

const adjustInterestRatePrompt = ai.definePrompt({
  name: 'adjustInterestRatePrompt',
  input: {schema: CalculateInterestInputSchema},
  output: {schema: CalculateInterestOutputSchema},
  prompt: `You are an expert financial analyst specializing in dynamically adjusting interest rates for overdue invoices.

  Given the following information, determine an appropriate adjusted interest rate and explain your reasoning. Consider the customer\'s payment history and current market conditions to ensure optimal revenue while maintaining customer satisfaction.

  Customer ID: {{{customerId}}}
  Invoice ID: {{{invoiceId}}}
  Invoice Amount: {{{invoiceAmount}}}
  Payment Terms (Days): {{{paymentTermsInDays}}}
  Days Overdue: {{{daysOverdue}}}
  Customer Payment History: {{{customerPaymentHistory}}}
  Current Market Conditions: {{{currentMarketConditions}}}
  Base Interest Rate: {{{baseInterestRate}}}

  Reasoning:
  `, // TODO: make sure that the model output is well-formed. Consider using JSON schema.
});

const calculateInterestFlow = ai.defineFlow(
  {
    name: 'calculateInterestFlow',
    inputSchema: CalculateInterestInputSchema,
    outputSchema: CalculateInterestOutputSchema,
  },
  async input => {
    const {output} = await adjustInterestRatePrompt(input);
    return output!;
  }
);
