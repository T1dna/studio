
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useInvoices, Invoice } from '@/contexts/invoices-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Helper function to format currency
const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { getInvoice, loading } = useInvoices();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const shouldPrint = searchParams.get('print') === 'true';

  useEffect(() => {
    if (!loading && id) {
      const foundInvoice = getInvoice(id);
      if (foundInvoice) {
        setInvoice(foundInvoice);
      } else {
        router.push('/dashboard/invoices');
      }
    }
  }, [id, getInvoice, loading, router]);
  
  useEffect(() => {
    if (invoice && shouldPrint) {
      setTimeout(() => window.print(), 500); // Timeout to allow content to render
    }
  }, [invoice, shouldPrint]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !invoice) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading invoice...</p>
      </div>
    );
  }

  // Defensive rendering: ensure business, customer, items, and totals exist.
  const { 
    business = { name: 'N/A', address: '', phone: '' }, 
    customer = { name: 'N/A', address: ''}, 
    items = [], 
    totals = { subtotal: 0, discount: 0, gst: 0, total: 0 } 
  } = invoice;

  const isTaxInvoice = !!customer?.gstin;

  return (
    <div className="space-y-4 printable-area">
        <div className="flex justify-between items-center non-printable">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2" /> Back
            </Button>
            <Button onClick={handlePrint}>
                <Printer className="mr-2" /> Print / Save PDF
            </Button>
        </div>

        <Card className="w-full max-w-4xl mx-auto print:shadow-none print:border-none">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold">{isTaxInvoice ? 'TAX Invoice' : 'Cash Memo'}</h1>
                        <p className="font-bold text-lg">{business.name}</p>
                        <p>{business.address}</p>
                        <p>Phone: {business.phone}</p>
                        {isTaxInvoice && business.gstin && <p>GSTIN: {business.gstin}</p>}
                    </div>
                    <div className="text-right space-y-1">
                        <p><span className="font-semibold">Invoice #:</span> {invoice.id}</p>
                        <p><span className="font-semibold">Date:</span> {new Date(invoice.date).toLocaleDateString()}</p>
                    </div>
                </div>
                <hr className="my-4"/>
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">Billed To:</p>
                        <p className="font-bold">{customer.name}</p>
                        <p>{customer.address}</p>
                        {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
                    </div>
                    <div className="text-right">
                         <p className="font-semibold">Payment Mode:</p>
                         <p>{invoice.paymentMode}</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">SN</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>HSN</TableHead>
                            <TableHead>Gross Wt(g)</TableHead>
                            <TableHead>(Purity)</TableHead>
                            <TableHead>Making Charge</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item: any, index: number) => {
                            let chargeText = '-';
                            switch (item.makingChargeType) {
                                case 'percentage':
                                    chargeText = `(${item.makingChargeValue}%)`;
                                    break;
                                case 'flat':
                                    chargeText = `(Flat)`;
                                    break;
                                case 'per_gram':
                                    chargeText = `(₹${item.makingChargeValue}/gm)`;
                                    break;
                            }

                            return (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{item.itemName}</TableCell>
                                    <TableCell>{item.qty}</TableCell>
                                    <TableCell>{item.hsn || '-'}</TableCell>
                                    <TableCell>{item.grossWeight.toFixed(2)}</TableCell>
                                    <TableCell>{item.purity || '-'}</TableCell>
                                    <TableCell>{chargeText}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.qty * item.rate)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>

            <CardFooter className="flex-col items-end gap-4">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>- {formatCurrency(totals.discount)}</span>
                    </div>
                    {isTaxInvoice && (
                        <div className="flex justify-between">
                        <span>GST (3%):</span>
                        <span>{formatCurrency(totals.gst)}</span>
                        </div>
                    )}
                    <hr className="my-2"/>
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(totals.total)}</span>
                    </div>
                </div>

                <div className='flex justify-between w-full mt-16 pt-8 border-t'>
                    <div className="text-center">
                        <div className="w-40 h-12 border-b"></div>
                        <p className="text-sm">Customer Signature</p>
                    </div>
                    <div className="text-center">
                        <div className="w-40 h-12 border-b"></div>
                        <p className="text-sm">Authorised Signature</p>
                    </div>
                </div>
                <p className="text-center text-muted-foreground text-sm w-full pt-4">Thank You! Visit Again.</p>
            </CardFooter>
        </Card>
    </div>
  );
}
