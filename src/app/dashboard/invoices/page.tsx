
"use client";

import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, isValid } from 'date-fns';

type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue';

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
};

const initialInvoices: Invoice[] = [
  { id: 'INV-001', invoiceNumber: 'INV-2024-050', customerName: 'Rohan Sharma', invoiceDate: '2024-05-15', dueDate: '2024-06-14', amount: 150000, status: 'Paid' },
  { id: 'INV-002', invoiceNumber: 'INV-2024-051', customerName: 'Priya Patel', invoiceDate: '2024-05-20', dueDate: '2024-06-19', amount: 75000, status: 'Unpaid' },
  { id: 'INV-003', invoiceNumber: 'INV-2024-042', customerName: 'Amit Singh', invoiceDate: '2024-04-10', dueDate: '2024-05-10', amount: 220000, status: 'Overdue' },
  { id: 'INV-004', invoiceNumber: 'INV-2024-052', customerName: 'Sunita Williams', invoiceDate: '2024-05-25', dueDate: '2024-06-24', amount: 98000, status: 'Unpaid' },
];

const formatDate = (dateString: string) => {
    try {
        const date = parseISO(dateString);
        if (isValid(date)) {
            return format(date, 'PPP');
        }
        return "Invalid Date";
    } catch (error) {
        return "Invalid Date";
    }
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invoiceData: Invoice = {
      id: editingInvoice?.id || `INV-00${invoices.length + 1}`,
      invoiceNumber: formData.get('invoiceNumber') as string,
      customerName: formData.get('customerName') as string,
      invoiceDate: formData.get('invoiceDate') as string,
      dueDate: formData.get('dueDate') as string,
      amount: parseFloat(formData.get('amount') as string),
      status: formData.get('status') as InvoiceStatus,
    };

    if (editingInvoice) {
      setInvoices(invoices.map(i => i.id === editingInvoice.id ? invoiceData : i));
      toast({ title: "Invoice Updated", description: "The invoice has been successfully updated." });
    } else {
      setInvoices([...invoices, invoiceData]);
      toast({ title: "Invoice Created", description: "A new invoice has been successfully created." });
    }

    setIsFormOpen(false);
    setEditingInvoice(null);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };
  
  const handleDelete = (invoiceId: string) => {
    setInvoices(invoices.filter(i => i.id !== invoiceId));
    toast({ variant: 'destructive', title: "Invoice Deleted", description: "The invoice has been removed." });
  };

  const openNewInvoiceForm = () => {
    setEditingInvoice(null);
    setIsFormOpen(true);
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchTermLower) ||
      invoice.customerName.toLowerCase().includes(searchTermLower) ||
      invoice.status.toLowerCase().includes(searchTermLower) ||
      invoice.amount.toString().includes(searchTermLower)
    );
  });

  const getStatusVariant = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Unpaid': return 'secondary';
      case 'Overdue': return 'destructive';
      default: return 'outline';
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <CardTitle>Invoice Management</CardTitle>
            <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                 </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={openNewInvoiceForm}>
                    <PlusCircle className="mr-2" />
                    Create Invoice
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
                    <DialogDescription>
                        {editingInvoice ? 'Update the details of the invoice.' : 'Fill in the details for the new invoice.'}
                    </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="invoiceNumber" className="text-right">Invoice #</Label>
                            <Input id="invoiceNumber" name="invoiceNumber" defaultValue={editingInvoice?.invoiceNumber || `INV-2024-0${invoices.length + 50}`} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="customerName" className="text-right">Customer</Label>
                            <Input id="customerName" name="customerName" defaultValue={editingInvoice?.customerName} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="invoiceDate" className="text-right">Invoice Date</Label>
                            <Input id="invoiceDate" name="invoiceDate" type="date" defaultValue={editingInvoice?.invoiceDate} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                            <Input id="dueDate" name="dueDate" type="date" defaultValue={editingInvoice?.dueDate} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Amount (₹)</Label>
                            <Input id="amount" name="amount" type="number" defaultValue={editingInvoice?.amount} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">Status</Label>
                             <Select name="status" defaultValue={editingInvoice?.status || 'Unpaid'}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                                    <SelectItem value="Overdue">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{editingInvoice ? 'Save Changes' : 'Create Invoice'}</Button>
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
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(invoice.id)}>
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

    