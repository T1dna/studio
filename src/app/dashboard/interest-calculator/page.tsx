import { InterestCalculatorForm } from "@/components/interest-calculator-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InterestCalculatorPage() {
  return (
    <div className="container mx-auto py-4">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold font-headline">AI-Powered Interest Calculator</h1>
        <p className="text-lg text-muted-foreground">
          Use our advanced AI to dynamically adjust interest rates for overdue invoices.
          The model considers customer payment history and current market conditions to suggest an optimal rate,
          balancing revenue generation with customer relationship management.
        </p>
      </div>
      <InterestCalculatorForm />
    </div>
  );
}
