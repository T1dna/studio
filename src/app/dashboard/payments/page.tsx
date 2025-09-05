
"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, Trash2, Edit, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Payment = {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Card' | 'Online';
};

const initialPayments: Payment[] = [
  { id: 'PAY-001', invoiceId: 'INV-2024001', customerName: 'Rohan Sharma', amount: 25750, date: '2024-07-15', paymentMethod: 'Cash' },
  { id: 'PAY-002', invoiceId: 'INV-2024002', customerName: 'Priya Patel', amount: 10000, date: '2024-07-18', paymentMethod: 'Online' },
  { id: 'PAY-003', invoiceId: 'INV-2024002', customerName: 'Priya Patel', amount: 5000, date: '2024-07-20', paymentMethod: 'Card' },
];

// Mock data for dropdowns
const mockInvoices = [
    { id: 'INV-2024001', customerName: 'Rohan Sharma' },
    { id: 'INV-2024002', customerName: 'Priya Patel' },
];


export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invoiceId = formData.get('invoiceId') as string;
    const selectedInvoice = mockInvoices.find(inv => inv.id === invoiceId);

    const newPaymentData: Payment = {
      id: editingPayment?.id || `PAY-00${payments.length + 1}`,
      invoiceId,
      customerName: selectedInvoice?.customerName || 'N/A',
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      paymentMethod: formData.get('paymentMethod') as 'Cash' | 'Card' | 'Online',
    };

    if (editingPayment) {
      setPayments(payments.map(p => p.id === editingPayment.id ? newPaymentData : p));
      toast({ title: "Payment Updated", description: "The payment record has been successfully updated." });
    } else {
      setPayments([...payments, newPaymentData]);
      toast({ title: "Payment Added", description: "A new payment has been successfully recorded." });
    }

    setIsFormOpen(false);
    setEditingPayment(null);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment({
        ...payment,
        date: new Date(payment.date).toISOString().split('T')[0] // Format date for input
    });
    setIsFormOpen(true);
  };
  
  const handleDelete = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId));
    toast({ variant: 'destructive', title: "Payment Deleted", description: "The payment record has been removed." });
  };

  const openNewPaymentForm = () => {
    setEditingPayment(null);
    setIsFormOpen(true);
  }

  const filteredPayments = useMemo(() =>
    payments.filter(payment =>
      payment.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  ), [payments, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <CardTitle>Payment Management</CardTitle>
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
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={openNewPaymentForm}>
                    <PlusCircle className="mr-2" />
                    Add Payment
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
                    <DialogDescription>
                        {editingPayment ? 'Update the details of the payment.' : 'Fill in the details to record a new payment.'}
                    </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="invoiceId" className="text-right">Invoice #</Label>
                             <Select name="invoiceId" defaultValue={editingPayment?.invoiceId} required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select an invoice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockInvoices.map(inv => (
                                        <SelectItem key={inv.id} value={inv.id}>{inv.id} ({inv.customerName})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Amount</Label>
                            <Input id="amount" name="amount" type="number" step="0.01" defaultValue={editingPayment?.amount} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" name="date" type="date" defaultValue={editingPayment?.date || new Date().toISOString().split('T')[0]} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paymentMethod" className="text-right">Method</Label>
                            <Select name="paymentMethod" defaultValue={editingPayment?.paymentMethod || 'Cash'} required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Online">Online</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{editingPayment ? 'Save Changes' : 'Add Payment'}</Button>
                    </DialogFooter>
                    </form>
                </DialogContent>
                </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment ID</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.id}</TableCell>
                <TableCell>{payment.invoiceId}</TableCell>
                <TableCell>{payment.customerName}</TableCell>
                <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                <TableCell>{payment.paymentMethod}</TableCell>
                <TableCell className="text-right">₹{payment.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(payment)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(payment.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
