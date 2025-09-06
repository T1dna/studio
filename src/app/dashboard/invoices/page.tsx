
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
import { PlusCircle, Search, MoreHorizontal, FileText, Printer, Trash2, Undo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvoices, Invoice } from '@/contexts/invoices-context';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


const getStatusVariant = (status: Invoice['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Paid': return 'default';
        case 'Pending': return 'secondary';
        case 'Overdue': return 'destructive';
        default: return 'secondary';
    }
}

export default function InvoicesPage() {
  const { invoices, deleteInvoice, recoverInvoice } = useInvoices();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);


  const filteredInvoices = useMemo(() => {
    const term = searchTerm.toLowerCase();

    const visibleInvoices = invoices.filter(invoice => {
        if (showDeleted) {
            return invoice.isDeleted; // Only show deleted
        }
        return !invoice.isDeleted; // Only show non-deleted
    });

    if (!term) return visibleInvoices;

    return visibleInvoices.filter(invoice =>
      invoice.id.toLowerCase().includes(term) ||
      invoice.customerName.toLowerCase().includes(term) ||
      invoice.status.toLowerCase().includes(term)
    );
  }, [searchTerm, invoices, showDeleted]);
  
  const handleViewDetails = (invoiceId: string) => {
    router.push(`/dashboard/invoices/${invoiceId}`);
  }
  
  const handlePrint = (invoiceId: string) => {
    router.push(`/dashboard/invoices/${invoiceId}?print=true`);
  };

  const handleDeleteConfirm = () => {
      if (invoiceToDelete) {
        deleteInvoice(invoiceToDelete);
        toast({
            variant: 'destructive',
            title: 'Invoice Deleted',
            description: `Invoice ${invoiceToDelete} has been moved to the bin.`
        });
        setInvoiceToDelete(null);
      }
  }

  const handleRecover = (invoiceId: string) => {
      recoverInvoice(invoiceId);
      toast({
          title: 'Invoice Recovered',
          description: `Invoice ${invoiceId} has been successfully recovered.`
      });
  }


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <CardTitle>Invoices</CardTitle>
            <div className="flex items-center gap-2">
                {user?.role === 'Developer' && (
                    <div className="flex items-center space-x-2">
                        <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
                        <Label htmlFor="show-deleted">Show Deleted</Label>
                    </div>
                )}
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                 </div>
                <Button asChild>
                    <Link href="/dashboard/invoices/create">
                        <PlusCircle className="mr-2" />
                        Create Invoice
                    </Link>
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className={invoice.isDeleted ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <Badge variant={invoice.isDeleted ? 'outline' : getStatusVariant(invoice.status)}>
                            {invoice.isDeleted ? 'Deleted' : invoice.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                        {invoice.isDeleted ? (
                            <Button variant="outline" size="sm" onClick={() => handleRecover(invoice.id)}>
                                <Undo className="mr-2 h-4 w-4" />
                                Recover
                            </Button>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(invoice.id)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrint(invoice.id)}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="text-destructive" 
                                    onClick={() => setInvoiceToDelete(invoice.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        No invoices found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <AlertDialog open={!!invoiceToDelete} onOpenChange={(isOpen) => !isOpen && setInvoiceToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the invoice to the bin. It can be recovered by a developer.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
            >
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
