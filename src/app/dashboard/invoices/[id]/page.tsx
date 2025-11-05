
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useInvoices, Invoice } from '@/contexts/invoices-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Helper function to format currency
const formatCurrency = (amount: number) => `₹${Number(amount || 0).toFixed(2)}`;
const formatWeight = (weight: number) => Number(weight || 0).toFixed(3);
const formatRate = (rate: number) => `₹${Number(rate || 0).toFixed(3)}`;


export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { getInvoice, loading, businessDetails } = useInvoices();
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
      // Small timeout to ensure content has rendered before printing
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
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

  const { 
    customer = { name: 'N/A', address: '', gstin: '' }, 
    items = [], 
    totals = { subtotal: 0, discount: 0, gst: 0, total: 0 } 
  } = invoice;

  const isTaxInvoice = !!customer?.gstin;
  const showGrossWeightColumn = items.some((item: any) => item.grossWeight && parseFloat(item.grossWeight) > 0);
  const showHsnColumn = isTaxInvoice && items.some((item: any) => item.hsn);
  const cgst = totals.gst / 2;
  const sgst = totals.gst / 2;

  const getItemTotal = (item: any): number => {
    const rate = Number(item.rate) || 0;
    const netWeight = Number(item.netWeight) || 0;
    const qty = Number(item.qty) || 0;
    const makingChargeValue = Number(item.makingChargeValue) || 0;
    const makingChargeType = item.makingChargeType;

    const baseAmount = netWeight * rate;

    let makingCharge = 0;
    if (makingChargeValue > 0) {
        switch (makingChargeType) {
        case 'percentage':
            makingCharge = baseAmount * (makingChargeValue / 100);
            break;
        case 'flat':
            makingCharge = makingChargeValue;
            break;
        case 'per_gram':
            makingCharge = makingChargeValue * netWeight;
            break;
        case 'per_item':
            makingCharge = makingChargeValue * qty;
            break;
        }
    }
  
    return baseAmount + makingCharge;
  };

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
                <div className="text-center mb-4">
                    <h1 className="text-lg font-bold">{isTaxInvoice ? 'TAX Invoice' : 'Cash Memo'}</h1>
                </div>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-2xl">{businessDetails.name}</p>
                        <p className="text-lg">{businessDetails.address}</p>
                        <p className="text-lg">Phone: {businessDetails.phone}</p>
                        {isTaxInvoice && businessDetails.gstin && <p className="text-lg">GSTIN / PAN: {businessDetails.gstin}</p>}
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
                        {customer.gstin && <p>GSTIN / PAN: {customer.gstin}</p>}
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
                            {showHsnColumn && <TableHead>HSN</TableHead>}
                            {showGrossWeightColumn && <TableHead>Gross Wt(g)</TableHead>}
                            <TableHead>Net Wt(g)</TableHead>
                            <TableHead>(Purity)</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Making Charge</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item: any, index: number) => {
                            let chargeText = '-';
                            if (item.makingChargeValue > 0) {
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
                                    case 'per_item':
                                        chargeText = `(₹${item.makingChargeValue}/item)`;
                                        break;
                                }
                            }
                             const itemTotal = getItemTotal(item);

                            return (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{item.itemName}</TableCell>
                                    <TableCell>{item.qty}</TableCell>
                                    {showHsnColumn && <TableCell>{item.hsn || '-'}</TableCell>}
                                    {showGrossWeightColumn && <TableCell>{item.grossWeight ? formatWeight(Number(item.grossWeight)) : '-'}</TableCell>}
                                    <TableCell>{formatWeight(Number(item.netWeight))}</TableCell>
                                    <TableCell>{item.purity || '-'}</TableCell>
                                    <TableCell className="text-right">{formatRate(Number(item.rate))}</TableCell>
                                    <TableCell>{chargeText}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(itemTotal)}
                                        {isTaxInvoice && item.applyGst && <span className="text-xs text-muted-foreground ml-1">(Taxed)</span>}
                                    </TableCell>
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
                        <>
                        <div className="flex justify-between">
                            <span>CGST (1.5%):</span>
                            <span>{formatCurrency(cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>SGST (1.5%):</span>
                            <span>{formatCurrency(sgst)}</span>
                        </div>
                        </>
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
