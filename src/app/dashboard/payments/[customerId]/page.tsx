
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInvoices, Invoice } from '@/contexts/invoices-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, CollectionReference, DocumentData, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogFooterComponent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, differenceInMonths, differenceInQuarters, differenceInYears } from 'date-fns';


type Customer = {
  id: string;
  name: string;
  fatherName?: string;
  businessName?: string;
  address?: string;
  number?: string;
  gstin?: string;
};

type Payment = {
    id: string;
    date: any; 
    amount: number;
    allocations: {
        [invoiceId: string]: {
            principal: number;
            interest: number;
        }
    }
}

type CalculatedInvoice = Invoice & {
    principalDue: number;
    interestDue: number;
    totalDue: number;
};

const calculateInterest = (invoice: Invoice, payments: Payment[]): { principalPaid: number, interestPaid: number, interestDue: number } => {
    const principal = invoice.amount;
    const rate = (invoice.interestRate || 0) / 100;
    if (!invoice.dueDate || rate === 0) return { principalPaid: 0, interestPaid: 0, interestDue: 0 };
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    if (today <= dueDate) return { principalPaid: 0, interestPaid: 0, interestDue: 0 };

    // Aggregate payments for this invoice
    let principalPaid = 0;
    let interestPaid = 0;
    payments.forEach(p => {
        if(p.allocations[invoice.id]) {
            principalPaid += p.allocations[invoice.id].principal || 0;
            interestPaid += p.allocations[invoice.id].interest || 0;
        }
    });
    
    const outstandingPrincipal = principal - principalPaid;
    if (outstandingPrincipal <= 0) return { principalPaid, interestPaid, interestDue: 0 };

    const getPeriods = () => {
        switch (invoice.interestCompound) {
            case 'Monthly':
                return differenceInMonths(today, dueDate);
            case 'Quarterly':
                return differenceInQuarters(today, dueDate);
            case 'Half-Yearly':
                return Math.floor(differenceInMonths(today, dueDate) / 6);
            case 'Annually':
                return differenceInYears(today, dueDate);
            default:
                return 0;
        }
    };
    
    const periods = getPeriods();
    if (periods <= 0) return { principalPaid, interestPaid, interestDue: 0 };
    
    // Simple compound interest for now. A more complex implementation would handle payments within periods.
    const totalCompoundInterest = outstandingPrincipal * (Math.pow(1 + rate, periods) - 1);
    const interestDue = Math.max(0, totalCompoundInterest - interestPaid);
    
    return { principalPaid, interestPaid, interestDue };
}


export default function CustomerPaymentsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
  
  const { invoices, loading: invoicesLoading } = useInvoices();
  const firestore = useFirestore();

  const customersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers') as CollectionReference<DocumentData>;
  }, [firestore]);
  
  const paymentsRef = useMemoFirebase(() => {
    if (!firestore || !customerId) return null;
    return collection(firestore, 'customers', customerId, 'payments') as CollectionReference<DocumentData>;
  }, [firestore, customerId]);


  const { data: customers, isLoading: customersLoading } = useCollection<Omit<Customer, 'id'>>(customersRef);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Omit<Payment, 'id'>>(paymentsRef);

  const customer = customers?.find(c => c.id === customerId);

  const calculatedInvoices = useMemo((): CalculatedInvoice[] => {
    if (!payments || !invoices) return [];
    
    const customerInvoices = invoices.filter(inv => inv.customer?.id === customerId && !inv.isDeleted);
    
    return customerInvoices.map(inv => {
        const { principalPaid, interestDue } = calculateInterest(inv, payments);
        const principalDue = inv.amount - principalPaid;
        const totalDue = principalDue + interestDue;
        return {
            ...inv,
            principalDue,
            interestDue,
            totalDue,
        }
    }).filter(inv => inv.totalDue > 0.01); // Filter out paid invoices
  }, [invoices, payments, customerId]);
  
  const totals = useMemo(() => {
    return calculatedInvoices.reduce((acc, inv) => {
        acc.principal += inv.principalDue;
        acc.interest += inv.interestDue;
        acc.total += inv.totalDue;
        return acc;
    }, { principal: 0, interest: 0, total: 0 });
  }, [calculatedInvoices]);


  // Payment Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [allocations, setAllocations] = useState<{[invoiceId: string]: { principal: number, interest: number } }>({});

  const unallocatedAmount = useMemo(() => {
    const totalAllocated = Object.values(allocations).reduce((sum, alloc) => sum + (alloc.principal || 0) + (alloc.interest || 0), 0);
    return paymentAmount - totalAllocated;
  }, [paymentAmount, allocations]);

  const handleAllocationChange = (invoiceId: string, type: 'principal' | 'interest', value: number) => {
    const invoice = calculatedInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const maxVal = type === 'principal' ? invoice.principalDue : invoice.interestDue;
    const clampedValue = Math.max(0, Math.min(value, maxVal));
    
    setAllocations(prev => ({
        ...prev,
        [invoiceId]: {
            ...(prev[invoiceId] || { principal: 0, interest: 0 }),
            [type]: clampedValue
        }
    }));
  };
  
  const resetPaymentDialog = () => {
    setPaymentAmount(0);
    setAllocations({});
  };
  
  const handleRecordPayment = async () => {
    if (!firestore || !customerId) return;
    
    const totalAllocated = Object.values(allocations).reduce((sum, alloc) => sum + alloc.principal + alloc.interest, 0);
    if (totalAllocated <= 0) {
        toast({ variant: 'destructive', title: "No allocation", description: "Please allocate the payment amount."});
        return;
    }

    if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
        toast({ variant: 'destructive', title: "Allocation mismatch", description: `Allocated amount (₹${totalAllocated.toFixed(2)}) does not match total payment (₹${paymentAmount.toFixed(2)}).`});
        return;
    }
    
    // Filter out zero allocations
    const finalAllocations = Object.entries(allocations).reduce((acc, [id, values]) => {
        if(values.principal > 0 || values.interest > 0) {
            acc[id] = values;
        }
        return acc;
    }, {} as {[invoiceId: string]: { principal: number, interest: number } });
    
    try {
        await addDoc(collection(firestore, 'customers', customerId, 'payments'), {
            date: serverTimestamp(),
            amount: paymentAmount,
            allocations: finalAllocations,
        });
        toast({ title: "Payment Recorded", description: "The payment has been successfully recorded."});
        setIsPaymentDialogOpen(false);
        resetPaymentDialog();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to record payment." });
    }
  };


  const isLoading = invoicesLoading || customersLoading || paymentsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading Customer Details...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center">
        <p className="mb-4">Customer not found.</p>
        <Button onClick={() => router.push('/dashboard/payments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/payments')}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Manage Payments for {customer.name}</h1>
                <p className="text-muted-foreground">{customer.address}</p>
            </div>
        </div>
        <Dialog open={isPaymentDialogOpen} onOpenChange={(isOpen) => {
            setIsPaymentDialogOpen(isOpen);
            if (!isOpen) resetPaymentDialog();
        }}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Record Payment for {customer.name}</DialogTitle>
                    <DialogDescription>
                        Enter the total payment amount and allocate it to the outstanding invoices.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="flex items-end gap-4">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="payment-amount">Total Payment Amount</Label>
                            <Input 
                                id="payment-amount"
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                className="text-lg"
                            />
                        </div>
                        <div className={`p-2 rounded-md text-sm font-medium ${unallocatedAmount < -0.01 ? 'bg-destructive/20 text-destructive' : 'bg-muted'}`}>
                           {unallocatedAmount > 0.01 ? `Unallocated: ₹${unallocatedAmount.toFixed(2)}` : 'Fully Allocated'}
                        </div>
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto pr-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Principal Due</TableHead>
                                    <TableHead>Interest Due</TableHead>
                                    <TableHead className="w-[150px]">Apply to Principal</TableHead>
                                    <TableHead className="w-[150px]">Apply to Interest</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calculatedInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            <p className="font-medium">{invoice.id}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(invoice.date).toLocaleDateString()}</p>
                                        </TableCell>
                                        <TableCell>₹{invoice.principalDue.toFixed(2)}</TableCell>
                                        <TableCell>₹{invoice.interestDue.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={allocations[invoice.id]?.principal || ''}
                                                onChange={(e) => handleAllocationChange(invoice.id, 'principal', parseFloat(e.target.value))}
                                                max={invoice.principalDue}
                                                min={0}
                                                placeholder="0.00"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={allocations[invoice.id]?.interest || ''}
                                                onChange={(e) => handleAllocationChange(invoice.id, 'interest', parseFloat(e.target.value))}
                                                max={invoice.interestDue}
                                                min={0}
                                                placeholder="0.00"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                </div>
                <DialogFooterComponent>
                    <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRecordPayment}>Save Payment</Button>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
          <CardDescription>
            Below is a list of all outstanding invoices for {customer.name}, with calculated interest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Original Amount</TableHead>
                <TableHead className="text-right">Principal Due</TableHead>
                <TableHead className="text-right">Interest Due</TableHead>
                <TableHead className="text-right font-semibold">Total Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculatedInvoices.length > 0 ? (
                calculatedInvoices.map((invoice: CalculatedInvoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">₹{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{invoice.principalDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive">₹{invoice.interestDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">₹{invoice.totalDue.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    This customer has no outstanding invoices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold text-base">
                    <TableCell colSpan={4}>Total Outstanding</TableCell>
                    <TableCell className="text-right">₹{totals.principal.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive">₹{totals.interest.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{totals.total.toFixed(2)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
