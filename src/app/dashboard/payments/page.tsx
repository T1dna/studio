
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, CollectionReference, DocumentData, Query } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    date: {
        seconds: number;
        nanoseconds: number;
    };
    amount: number;
    customerName?: string;
    customerId: string;
    isCustomerDeleted?: boolean;
}

export default function PaymentsHistoryPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Fetch all customers to map IDs to names
  const customersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers') as CollectionReference<DocumentData>;
  }, [firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Omit<Customer, 'id'>>(customersRef);

  // Fetch all payments using a collection group query
  const paymentsQuery = useMemoFirebase(() => {
      if(!firestore) return null;
      return collectionGroup(firestore, 'payments') as Query<DocumentData>;
  }, [firestore]);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Omit<Payment, 'id'>>(paymentsQuery);

  const customerMap = useMemo(() => {
      if (!customers) return new Map();
      return new Map(customers.map(c => [c.id, c.name]));
  }, [customers]);

  const processedPayments = useMemo(() => {
    if (!payments) return [];
    
    const paymentsWithDetails = payments.map(p => {
        // The ref is part of the raw doc data from useCollection and gives us the path.
        const ref = (p as any).ref;
        // The path of a subcollection doc is customers/{customerId}/payments/{paymentId}
        const customerId = ref?.parent?.parent?.id || 'unknown';
        const customerName = customerMap.get(customerId);
        
        return {
          ...p,
          customerId: customerId,
          customerName: customerName || 'Unknown Customer',
          isCustomerDeleted: !customerName,
        }
    }).filter(p => !p.isCustomerDeleted); // Filter out payments for deleted customers
    
    // Sort before filtering for consistent order
    const sorted = paymentsWithDetails.sort((a,b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));

    if (!searchTerm) return sorted;

    const term = searchTerm.toLowerCase();
    return sorted.filter(p => 
      p.customerName.toLowerCase().includes(term) ||
      p.amount.toString().includes(term)
    );

}, [payments, customerMap, searchTerm]);

  const handleGoToCustomer = () => {
    if (selectedCustomerId) {
      router.push(`/dashboard/payments/${selectedCustomerId}`);
    }
  };
  
  const isLoading = customersLoading || paymentsLoading;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <CardTitle>Payment History</CardTitle>
            <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                 </div>
                 <Dialog open={isCustomerSelectOpen} onOpenChange={setIsCustomerSelectOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Record Payment
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Select Customer</DialogTitle>
                            <DialogDescription>
                                Choose a customer to record or manage their payments.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                           <Label htmlFor="customer-select">Customer</Label>
                            <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                                <SelectTrigger id="customer-select">
                                    <SelectValue placeholder={customersLoading ? "Loading..." : "Select a customer"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {!customersLoading && customers?.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCustomerSelectOpen(false)}>Cancel</Button>
                            <Button onClick={handleGoToCustomer} disabled={!selectedCustomerId}>Manage Payments</Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading Payments...</p>
          </div>
        ) : (
            <TooltipProvider>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedPayments.length > 0 ? (
                            processedPayments.map((payment) => (
                                <TableRow key={payment.id} className={payment.isCustomerDeleted ? 'opacity-50' : ''}>
                                    <TableCell>
                                        {payment.date ? new Date(payment.date.seconds * 1000).toLocaleDateString() : 'Pending...'}
                                    </TableCell>
                                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                                    <TableCell className="text-right">₹{payment.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {payment.isCustomerDeleted ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="sm" disabled>
                                                        Manage
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Cannot manage payments for a deleted customer.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/payments/${payment.customerId}`)}>
                                                Manage
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    No payments recorded yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TooltipProvider>
        )}
      </CardContent>
    </Card>
    </>
  );
}
