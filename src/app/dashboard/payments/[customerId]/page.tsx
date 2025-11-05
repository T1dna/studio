
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInvoices, Invoice } from '@/contexts/invoices-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, CollectionReference, DocumentData, doc } from 'firebase/firestore';

type Customer = {
  id: string;
  name: string;
  fatherName?: string;
  businessName?: string;
  address?: string;
  number?: string;
  gstin?: string;
};

export default function CustomerPaymentsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
  
  const { invoices, loading: invoicesLoading } = useInvoices();
  const firestore = useFirestore();

  const customersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers') as CollectionReference<DocumentData>;
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Omit<Customer, 'id'>>(customersRef);

  const customer = customers?.find(c => c.id === customerId);

  const customerInvoices = React.useMemo(() => {
    return invoices.filter(inv => inv.customer?.id === customerId && !inv.isDeleted);
  }, [invoices, customerId]);

  const isLoading = invoicesLoading || customersLoading;

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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/payments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Manage Payments for {customer.name}</h1>
            <p className="text-muted-foreground">{customer.address}</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
          <CardDescription>
            Below is a list of all outstanding invoices for {customer.name}.
            Interest calculation and payment application will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Principal Due</TableHead>
                <TableHead className="text-right">Interest Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerInvoices.length > 0 ? (
                customerInvoices.map((invoice: Invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">₹{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">₹{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">₹0.00</TableCell>
                    <TableCell className="text-right">
                       <Button variant="secondary" size="sm" disabled>
                         Record Payment
                       </Button>
                    </TableCell>
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
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    