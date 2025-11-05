
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInvoices, Invoice } from '@/contexts/invoices-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, CollectionReference, DocumentData, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogFooterComponent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { differenceInMonths, differenceInQuarters, differenceInYears } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    if (!invoice.dueDate || rate === 0) {
        const principalPaid = payments.reduce((sum, p) => sum + (p.allocations[invoice.id]?.principal || 0), 0);
        return { principalPaid, interestPaid: 0, interestDue: 0 };
    }
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    if (today <= dueDate) {
         const principalPaid = payments.reduce((sum, p) => sum + (p.allocations[invoice.id]?.principal || 0), 0);
         return { principalPaid, interestPaid: 0, interestDue: 0 };
    }

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
    const rawInterestDue = totalCompoundInterest - interestPaid;
    const interestDue = Math.max(0, parseFloat(rawInterestDue.toFixed(2)));
    
    return { principalPaid, interestPaid, interestDue };
}


export default function CustomerPaymentsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
  
  const { invoices, loading: invoicesLoading } = useInvoices();
  const firestore = useFirestore();

  // Dialog and Deletion State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [allocations, setAllocations] = useState<{[invoiceId: string]: { principal: string, interest: string } }>({});

  const customer = useMemo(() => {
    if (!invoices || !customerId) return null;
    const invoiceForCustomer = invoices.find(inv => inv.customerId === customerId);
    return invoiceForCustomer ? (invoiceForCustomer.customer as Customer) : null;
  }, [invoices, customerId]);
  
  const paymentsRef = useMemoFirebase(() => {
    if (!firestore || !customerId) return null;
    return collection(firestore, 'customers', customerId, 'payments') as CollectionReference<DocumentData>;
  }, [firestore, customerId]);

  const { data: payments, isLoading: paymentsLoading } = useCollection<Omit<Payment, 'id'>>(paymentsRef);

  const calculatedInvoices = useMemo((): CalculatedInvoice[] => {
    if (!payments || !invoices || !customer) return [];
    
    const customerInvoices = invoices.filter(inv => inv.customerId === customer.id && !inv.isDeleted);
    
    return customerInvoices.map(inv => {
        const { principalPaid, interestDue } = calculateInterest(inv, payments);
        const principalDue = inv.amount - principalPaid;
        const totalDue = principalDue + interestDue;
        return {
            ...inv,
            principalDue: parseFloat(principalDue.toFixed(2)),
            interestDue: parseFloat(interestDue.toFixed(2)),
            totalDue: parseFloat(totalDue.toFixed(2)),
        }
    }).filter(inv => inv.totalDue > 0.01 || (editingPayment && editingPayment.allocations[inv.id])); // Also show invoices related to editing payment
  }, [invoices, payments, customer, editingPayment]);
  
  const totals = useMemo(() => {
    return calculatedInvoices.reduce((acc, inv) => {
        acc.principal += inv.principalDue;
        acc.interest += inv.interestDue;
        acc.total += inv.totalDue;
        return acc;
    }, { principal: 0, interest: 0, total: 0 });
  }, [calculatedInvoices]);

  const unallocatedAmount = useMemo(() => {
    const totalAllocated = Object.values(allocations).reduce((sum, alloc) => {
      const principal = parseFloat(alloc.principal) || 0;
      const interest = parseFloat(alloc.interest) || 0;
      return sum + principal + interest;
    }, 0);
    const result = paymentAmount - totalAllocated;
    return parseFloat(result.toFixed(2));
  }, [paymentAmount, allocations]);


  // --- CRUD Functions ---
  const resetPaymentDialog = () => {
    setPaymentAmount(0);
    setAllocations({});
    setEditingPayment(null);
    setIsPaymentDialogOpen(false);
  };

  const handleOpenNewPaymentDialog = () => {
    resetPaymentDialog();
    setIsPaymentDialogOpen(true);
  }

  const handleOpenEditDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount);
    const stringAllocations = Object.entries(payment.allocations).reduce((acc, [key, value]) => {
      acc[key] = {
        principal: value.principal.toString(),
        interest: value.interest.toString(),
      };
      return acc;
    }, {} as {[invoiceId: string]: { principal: string, interest: string } });
    setAllocations(stringAllocations);
    setIsPaymentDialogOpen(true);
  }

  const handleRecordPayment = async () => {
    if (!firestore || !customerId) return;
    
    const numericAllocations = Object.entries(allocations).reduce((acc, [id, values]) => {
        const principal = parseFloat(values.principal) || 0;
        const interest = parseFloat(values.interest) || 0;
        if (principal > 0 || interest > 0) {
            acc[id] = { principal, interest };
        }
        return acc;
    }, {} as {[invoiceId: string]: { principal: number, interest: number } });

    const totalAllocated = Object.values(numericAllocations).reduce((sum, alloc) => sum + alloc.principal + alloc.interest, 0);

    if (totalAllocated <= 0) {
        toast({ variant: 'destructive', title: "No allocation", description: "Please allocate the payment amount."});
        return;
    }

    if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
        toast({ variant: 'destructive', title: "Allocation mismatch", description: `Allocated amount (₹${totalAllocated.toFixed(2)}) does not match total payment (₹${paymentAmount.toFixed(2)}).`});
        return;
    }
    
    try {
        if (editingPayment) {
            const paymentDocRef = doc(firestore, 'customers', customerId, 'payments', editingPayment.id);
            await updateDoc(paymentDocRef, {
                amount: paymentAmount,
                allocations: numericAllocations,
            });
            toast({ title: "Payment Updated", description: "The payment has been successfully updated."});
        } else {
             await addDoc(collection(firestore, 'customers', customerId, 'payments'), {
                date: serverTimestamp(),
                amount: paymentAmount,
                allocations: numericAllocations,
            });
            toast({ title: "Payment Recorded", description: "The payment has been successfully recorded."});
        }
        resetPaymentDialog();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to save payment." });
    }
  };

  const handleDeletePayment = async () => {
    if (!firestore || !customerId || !paymentToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'customers', customerId, 'payments', paymentToDelete));
        toast({ variant: 'destructive', title: "Payment Deleted", description: "The payment record has been removed."});
        setPaymentToDelete(null);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to delete payment."});
    }
  }

  const handleAllocationChange = (invoiceId: string, type: 'principal' | 'interest', value: string) => {
    const invoice = calculatedInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
  
    // Allow user to clear the input or type a minus sign
    if (value === '' || value === '-') {
      setAllocations(prev => ({
          ...prev,
          [invoiceId]: {
              ...(prev[invoiceId] || { principal: '', interest: '' }),
              [type]: value
          }
      }));
      return;
    }
  
    let maxVal = type === 'principal' ? invoice.principalDue : invoice.interestDue;
    if (editingPayment && editingPayment.allocations[invoiceId]) {
        maxVal += editingPayment.allocations[invoiceId][type] || 0;
    }
    
    // Use a string-based check to avoid floating point issues
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
  
    // Compare with a small tolerance
    if (numericValue > maxVal + 0.001) {
      toast({
          variant: 'destructive',
          title: 'Allocation Exceeded',
          description: `Cannot allocate more than the due amount of ₹${maxVal.toFixed(2)}.`
      });
      // Clamp the value
      setAllocations(prev => ({
          ...prev,
          [invoiceId]: {
              ...(prev[invoiceId] || { principal: '', interest: '' }),
              [type]: String(maxVal)
          }
      }));
    } else {
      setAllocations(prev => ({
          ...prev,
          [invoiceId]: {
              ...(prev[invoiceId] || { principal: '', interest: '' }),
              [type]: value
          }
      }));
    }
  };

  // --- Render ---

  const isLoading = invoicesLoading || paymentsLoading;

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
    <>
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
              if (!isOpen) resetPaymentDialog();
              else setIsPaymentDialogOpen(true);
          }}>
              <DialogTrigger asChild>
                  <Button onClick={handleOpenNewPaymentDialog}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Record Payment
                  </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                  <DialogHeader>
                      <DialogTitle>{editingPayment ? 'Edit Payment' : `Record Payment for ${customer.name}`}</DialogTitle>
                      <DialogDescription>
                          {editingPayment ? 'Adjust the payment amount and re-allocate it.' : 'Enter the total payment amount and allocate it to the outstanding invoices.'}
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                      <div className="flex items-end gap-4">
                          <div className="grid gap-2 flex-1">
                              <Label htmlFor="payment-amount">Total Payment Amount</Label>
                              <Input 
                                  id="payment-amount"
                                  type="text"
                                  value={paymentAmount}
                                  onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^[0-9]*\.?[0-9]{0,2}$/.test(value)) {
                                        setPaymentAmount(value === '' ? 0 : parseFloat(value));
                                      }
                                    }}
                                  className="text-lg"
                              />
                          </div>
                          <div className={`p-2 rounded-md text-sm font-medium ${unallocatedAmount < -0.001 ? 'bg-destructive/20 text-destructive' : 'bg-muted'}`}>
                            {unallocatedAmount.toFixed(2) !== '0.00' ? `Unallocated: ₹${unallocatedAmount.toFixed(2)}` : 'Fully Allocated'}
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
                                                  type="text"
                                                  value={allocations[invoice.id]?.principal || ''}
                                                  onChange={(e) => handleAllocationChange(invoice.id, 'principal', e.target.value)}
                                                  placeholder="0.00"
                                              />
                                          </TableCell>
                                          <TableCell>
                                              <Input
                                                  type="text"
                                                  value={allocations[invoice.id]?.interest || ''}
                                                  onChange={(e) => handleAllocationChange(invoice.id, 'interest', e.target.value)}
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
                      <Button variant="outline" onClick={resetPaymentDialog}>Cancel</Button>
                      <Button onClick={handleRecordPayment}>{editingPayment ? 'Save Changes' : 'Save Payment'}</Button>
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
                  calculatedInvoices.filter(inv => inv.totalDue > 0.01).map((invoice: CalculatedInvoice) => (
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

        <Card>
          <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>A log of all payments recorded for {customer.name}.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount Paid</TableHead>
                          <TableHead>Allocations</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {payments && payments.length > 0 ? (
                          payments.sort((a,b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0)).map(payment => (
                              <TableRow key={payment.id}>
                                  <TableCell>{payment.date ? new Date(payment.date.seconds * 1000).toLocaleDateString() : 'Pending...'}</TableCell>
                                  <TableCell className="text-right font-medium">₹{payment.amount.toFixed(2)}</TableCell>
                                  <TableCell>
                                      <div className="flex flex-col gap-1 text-xs">
                                      {Object.entries(payment.allocations).map(([invoiceId, allocation]) => (
                                          <div key={invoiceId}>
                                              <span className="font-semibold">{invoiceId}:</span>
                                              {` P: ₹${allocation.principal.toFixed(2)} | I: ₹${allocation.interest.toFixed(2)}`}
                                          </div>
                                      ))}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                              <DropdownMenuItem onClick={() => handleOpenEditDialog(payment)}>
                                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                              </DropdownMenuItem>
                                              <DropdownMenuItem className="text-destructive" onClick={() => setPaymentToDelete(payment.id)}>
                                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                              </DropdownMenuItem>
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">No payments recorded yet.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!paymentToDelete} onOpenChange={(isOpen) => !isOpen && setPaymentToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the payment record and update the customer's outstanding balance accordingly.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDeletePayment}
              >
                  Delete Payment
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
