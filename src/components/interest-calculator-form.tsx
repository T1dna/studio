"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalculateInterestInput, CalculateInterestOutput } from "@/ai/flows/calculate-interest-flow";
import { runInterestCalculation } from "@/app/dashboard/interest-calculator/actions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required."),
  invoiceId: z.string().min(1, "Invoice ID is required."),
  invoiceAmount: z.coerce.number().positive("Invoice amount must be positive."),
  paymentTermsInDays: z.coerce.number().int().nonnegative("Payment terms must be a non-negative integer."),
  daysOverdue: z.coerce.number().int().nonnegative("Days overdue must be a non-negative integer."),
  customerPaymentHistory: z.string().min(10, "Please provide some payment history."),
  currentMarketConditions: z.string().min(10, "Please describe market conditions."),
  baseInterestRate: z.coerce.number().min(0, "Base interest rate cannot be negative."),
});

export function InterestCalculatorForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculateInterestOutput | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "CUST-001",
      invoiceId: "INV-2024-042",
      invoiceAmount: 10000,
      paymentTermsInDays: 30,
      daysOverdue: 90,
      customerPaymentHistory: "Consistently pays invoices 15-20 days late. No major defaults in the last 2 years.",
      currentMarketConditions: "Stable market with a slight increase in lending rates. Competitors are offering similar credit terms.",
      baseInterestRate: 2.5,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const output = await runInterestCalculation(values as CalculateInterestInput);
      if (output) {
        setResult(output);
        toast({
          title: "Calculation Successful",
          description: "The adjusted interest rate has been calculated.",
        });
      } else {
        throw new Error("The calculation returned no output.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice & Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CUST-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., INV-2024-042" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentTermsInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="daysOverdue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Overdue</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 90" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Analysis Factors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                      control={form.control}
                      name="baseInterestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Interest Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 2.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPaymentHistory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Payment History</FormLabel>
                          <FormControl>
                            <Textarea rows={4} placeholder="Describe the customer's payment patterns..." {...field} />
                          </FormControl>
                          <FormDescription>e.g., Consistently pays late, always on time, etc.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentMarketConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Market Conditions</FormLabel>
                          <FormControl>
                            <Textarea rows={4} placeholder="Describe the current economic environment..." {...field} />
                          </FormControl>
                          <FormDescription>e.g., High inflation, stable market, etc.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </CardContent>
            </Card>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Calculating..." : "Calculate Adjusted Interest"}
            </Button>
          </div>
        </form>
      </Form>

      {result && (
        <Card className="bg-accent/20 border-accent">
          <CardHeader>
            <CardTitle className="text-primary">Calculation Result</CardTitle>
            <CardDescription>The AI has suggested the following interest rate adjustment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">Adjusted Interest Rate</h3>
                <p className="text-4xl font-bold text-primary">{result.adjustedInterestRate.toFixed(2)}%</p>
            </div>
            <div>
                <h3 className="text-lg font-semibold">Reasoning</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{result.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
