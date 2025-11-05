
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
import { Search, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, CollectionReference, DocumentData } from 'firebase/firestore';

type Customer = {
  id: string;
  name: string;
  fatherName?: string;
  businessName?: string;
  address?: string;
  number?: string;
  gstin?: string;
};

export default function PaymentsLandingPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  const customersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers') as CollectionReference<DocumentData>;
  }, [firestore]);

  const { data: customers, isLoading: loading } = useCollection<Omit<Customer, 'id'>>(customersRef);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!customers) return [];
    if (!term) return customers;
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      (customer.fatherName && customer.fatherName.toLowerCase().includes(term)) ||
      (customer.businessName && customer.businessName.toLowerCase().includes(term)) ||
      (customer.number && customer.number.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  const handleManagePayments = (customerId: string) => {
    router.push(`/dashboard/payments/${customerId}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <CardTitle>Payments</CardTitle>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading Customers...</p>
          </div>
        ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Father's Name</TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Contact Number</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>{customer.fatherName || '-'}</TableCell>
                                <TableCell>{customer.businessName || '-'}</TableCell>
                                <TableCell>{customer.number || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleManagePayments(customer.id)}>
                                        Manage Payments <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                No customers found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}

    