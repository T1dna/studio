
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock Data
const mockCustomers = [
  { id: 'CUST-001', name: 'Rohan Sharma', address: '123 Diamond Street, Jaipur', gstin: '08AAAAA0000A1Z5' },
  { id: 'CUST-002', name: 'Priya Patel', address: '456 Ruby Lane, Mumbai', gstin: '' },
  { id: 'CUST-003', name: 'Amit Singh', address: '789 Emerald Road, Delhi', gstin: '07BBBBB0000B1Z4' },
];

const mockBusinessDetails = {
  name: 'GemsAccurate Inc.',
  address: '456 Gold Plaza, Jewel City',
  phone: '+91 9988776655',
  gstin: '29ABCDE1234F1Z5',
};

// Zod Schema for validation
const itemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  hsn: z.string().optional(),
  grossWeight: z.coerce.number().positive('Weight must be positive'),
  purity: z.coerce.number().positive('Purity must be positive'),
  rate: z.coerce.number().positive('Rate must be positive'),
  makingChargeType: z.enum(['percentage', 'flat', 'per_gram']),
  makingChargeValue: z.coerce.number().nonnegative('Making charge must be non-negative'),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  paymentMode: z.string().min(1, 'Please select a payment mode'),
  items: z.array(itemSchema).min(1, 'Please add at least one item'),
  discount: z.coerce.number().nonnegative().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;
type ItemFormData = z.infer<typeof itemSchema>;


export default function InvoiceGeneratorPage() {
  const { toast } = useToast();
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      paymentMode: 'Cash',
      items: [{
        itemName: '',
        qty: 1,
        hsn: '',
        grossWeight: 0,
        purity: 91.6,
        rate: 5000,
        makingChargeType: 'percentage',
        makingChargeValue: 10
      }],
      discount: 0
    },
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const watchedDiscount = watch('discount') || 0;
  const watchedCustomerId = watch('customerId');
  
  const selectedCustomer = mockCustomers.find(c => c.id === watchedCustomerId) || null;

  useEffect(() => {
    setInvoiceDate(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD format
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
  }, []);

  const calculateTotals = () => {
    let subtotal = 0;
    watchedItems.forEach(item => {
      const baseAmount = item.grossWeight * item.rate * (item.purity / 100);
      let makingCharges = 0;
      if (item.makingChargeType === 'percentage') {
        makingCharges = baseAmount * (item.makingChargeValue / 100);
      } else if (item.makingChargeType === 'flat') {
        makingCharges = item.makingChargeValue;
      } else if (item.makingChargeType === 'per_gram') {
        makingCharges = item.grossWeight * item.makingChargeValue;
      }
      const itemTotal = baseAmount + makingCharges;
      subtotal += itemTotal * item.qty;
    });

    const gst = selectedCustomer?.gstin ? subtotal * 0.03 : 0;
    const total = subtotal + gst - watchedDiscount;

    return { subtotal, gst, total };
  };

  const { subtotal, gst, total } = calculateTotals();

  const onSubmit = (data: InvoiceFormData) => {
    console.log({ ...data, subtotal, gst, total });
    toast({
      title: "Invoice Generated!",
      description: "The invoice has been successfully created and logged.",
    });
    form.reset();
  };
  
  const getItemTotal = (item: ItemFormData) => {
      if (!item.grossWeight || !item.rate || !item.purity || !item.makingChargeValue) return 0;
      const baseAmount = item.grossWeight * item.rate * (item.purity / 100);
      let makingCharges = 0;
      if (item.makingChargeType === 'percentage') {
        makingCharges = baseAmount * (item.makingChargeValue / 100);
      } else if (item.makingChargeType === 'flat') {
        makingCharges = item.makingChargeValue;
      } else if (item.makingChargeType === 'per_gram') {
        makingCharges = item.grossWeight * item.makingChargeValue;
      }
      return (baseAmount + makingCharges) * item.qty;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{selectedCustomer?.gstin ? 'Tax Invoice' : 'Cash Memo'}</h1>
              <p>{mockBusinessDetails.name}</p>
              <p>{mockBusinessDetails.address}</p>
              <p>Phone: {mockBusinessDetails.phone}</p>
              {mockBusinessDetails.gstin && <p>GSTIN: {mockBusinessDetails.gstin}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">Details</h2>
              <p>Invoice #: {invoiceNumber}</p>
              <p>Date: {new Date(invoiceDate).toLocaleDateString()}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Customer and Invoice Details */}
          <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-lg">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedCustomer && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>{selectedCustomer.address}</p>
                  {selectedCustomer.gstin && <p>GSTIN: {selectedCustomer.gstin}</p>}
                </div>
              )}
               {errors.customerId && <p className="text-sm text-destructive mt-1">{errors.customerId.message}</p>}
            </div>
            <div>
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Controller
                name="paymentMode"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
               {errors.paymentMode && <p className="text-sm text-destructive mt-1">{errors.paymentMode.message}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">SN</TableHead>
                  <TableHead className="min-w-[150px]">Item Name</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="min-w-[100px]">HSN</TableHead>
                  <TableHead className="min-w-[120px]">Gross Wt(g)</TableHead>
                  <TableHead className="min-w-[100px]">Purity (%)</TableHead>
                  <TableHead className="min-w-[120px]">Rate</TableHead>
                  <TableHead className="min-w-[200px]">Making Charges</TableHead>
                  <TableHead className="min-w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Input {...register(`items.${index}.itemName`)} placeholder="e.g., Gold Ring" />
                       {errors.items?.[index]?.itemName && <p className="text-sm text-destructive mt-1">Required</p>}
                    </TableCell>
                    <TableCell>
                      <Input type="number" {...register(`items.${index}.qty`)} />
                    </TableCell>
                    <TableCell>
                      <Input {...register(`items.${index}.hsn`)} placeholder="e.g., 7113" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" {...register(`items.${index}.grossWeight`)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" {...register(`items.${index}.purity`)} placeholder="e.g., 92.5" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" {...register(`items.${index}.rate`)} />
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1">
                            <Controller
                                name={`items.${index}.makingChargeType`}
                                control={control}
                                render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="flat">Flat</SelectItem>
                                        <SelectItem value="per_gram">/gm</SelectItem>
                                    </SelectContent>
                                </Select>
                                )}
                            />
                            <Input type="number" step="0.01" {...register(`items.${index}.makingChargeValue`)} className="flex-1"/>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{getItemTotal(watchedItems[index] as ItemFormData).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button type="button" variant="outline" onClick={() => append({ itemName: '', qty: 1, hsn: '', grossWeight: 0, purity: 91.6, rate: 5000, makingChargeType: 'percentage', makingChargeValue: 10 })}>
            <PlusCircle className="mr-2" /> Add Item
          </Button>

            {errors.items && !errors.items.root && (
                 <p className="text-sm text-destructive mt-1">Please check item details. All fields except HSN are required.</p>
            )}
            {errors.items?.root && (
                 <p className="text-sm text-destructive mt-1">{errors.items.root.message}</p>
            )}


          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
               <div className="flex justify-between items-center">
                <Label htmlFor='discount'>Discount:</Label>
                <Input id="discount" type="number" {...register('discount')} className="w-32" placeholder="e.g., 100"/>
              </div>
              {selectedCustomer?.gstin && (
                <div className="flex justify-between">
                  <span>GST (3%):</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
              )}
              <hr/>
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col items-start gap-4">
            <div className='flex justify-between w-full'>
                <div className="text-center">
                    <div className="w-32 h-12 border-b mt-8"></div>
                    <p className="text-sm">Customer Signature</p>
                </div>
                <div className="text-center">
                    <div className="w-32 h-12 border-b mt-8"></div>
                    <p className="text-sm">Authorised Signature</p>
                </div>
            </div>
          <p className="text-center text-muted-foreground text-sm w-full">Thank You! Visit Again.</p>
           <Button type="submit" className="w-full" size="lg">Generate Invoice</Button>
        </CardFooter>
      </Card>
    </form>
  );

    