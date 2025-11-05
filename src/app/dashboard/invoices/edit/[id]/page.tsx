
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInvoices } from '@/contexts/invoices-context';
import { useRouter, useParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';

type Customer = {
  id: string;
  name: string;
  fatherName: string;
  businessName?: string;
  address: string;
  number: string;
  gstin?: string;
};

// Zod Schema for validation
const itemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  qty: z.coerce.number().positive('Quantity must be positive'),
  hsn: z.string().optional(),
  grossWeight: z.coerce.number().nonnegative('Weight must be non-negative').optional(),
  netWeight: z.coerce.number().nonnegative('Weight must be non-negative'),
  purity: z.string().optional(),
  rate: z.coerce.number().nonnegative('Rate must be non-negative'),
  makingChargeType: z.enum(['percentage', 'flat', 'per_gram', 'per_item']),
  makingChargeValue: z.coerce.number().nonnegative('Making charge must be non-negative'),
  applyGst: z.boolean().optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  paymentMode: z.string().min(1, 'Please select a payment mode'),
  dueDate: z.string().min(1, "Due date is required"),
  interestRate: z.coerce.number().nonnegative("Interest rate must be non-negative"),
  interestCompound: z.string().min(1, "Please select a compounding method"),
  items: z.array(itemSchema).min(1, 'Please add at least one item'),
  discount: z.coerce.number().nonnegative().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;
type ItemFormData = z.infer<typeof itemSchema>;


const getItemTotal = (item: Partial<ItemFormData>): number => {
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
    
    if(baseAmount === 0 && qty > 0) return makingCharge;
    if(baseAmount === 0) return 0;
    
    return baseAmount + makingCharge;
  };


export default function EditInvoicePage() {
  const { toast } = useToast();
  const { getInvoice, updateInvoice, businessDetails, loading: invoicesLoading } = useInvoices();
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [invoice, setInvoice] = useState<any>(null);

  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const customersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers') as CollectionReference<DocumentData>;
  }, [firestore]);
  
  const { data: customers, isLoading: customersLoading } = useCollection<Omit<Customer, 'id'>>(customersRef);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      paymentMode: 'Cash',
      dueDate: '',
      interestRate: 0,
      interestCompound: 'Monthly',
      items: [],
      discount: 0
    },
     mode: 'onChange',
  });

  const { register, control, handleSubmit, watch, formState: { errors }, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (id && !invoicesLoading) {
      const existingInvoice = getInvoice(id);
      if (existingInvoice) {
        setInvoice(existingInvoice);
        setInvoiceDate(new Date(existingInvoice.date).toLocaleDateString('en-CA'));
        setInvoiceNumber(existingInvoice.id);
        reset({
          customerId: existingInvoice.customer.id,
          paymentMode: existingInvoice.paymentMode,
          dueDate: new Date(existingInvoice.dueDate).toLocaleDateString('en-CA'),
          interestRate: existingInvoice.interestRate,
          interestCompound: existingInvoice.interestCompound || 'Monthly',
          items: existingInvoice.items,
          discount: existingInvoice.totals.discount,
        });
      } else {
        toast({ variant: 'destructive', title: 'Invoice not found' });
        router.push('/dashboard/invoices');
      }
    }
  }, [id, invoicesLoading, getInvoice, reset, toast, router]);


  const watchedItems = watch('items');
  const watchedDiscount = watch('discount') || 0;
  const watchedCustomerId = watch('customerId');
  
  const selectedCustomer = useMemo(() => 
    customers?.find(c => c.id === watchedCustomerId) || null,
    [customers, watchedCustomerId]
  );
  
  const calculateTotals = useCallback((items: Partial<ItemFormData>[], customerGstin?: string | null, discount?: number) => {
    const subtotal = items.reduce((acc, item) => acc + getItemTotal(item), 0);
    const taxableAmount = customerGstin ? items.reduce((acc, item) => {
        if (item.applyGst) {
            return acc + getItemTotal(item);
        }
        return acc;
    }, 0) : 0;
    const gst = taxableAmount * 0.03;
    const total = subtotal + gst - (discount || 0);
    return { subtotal, gst, total };
  }, []);

  const { subtotal, gst, total } = useMemo(() => {
    return calculateTotals(watchedItems, selectedCustomer?.gstin, watchedDiscount);
  }, [watchedItems, selectedCustomer, watchedDiscount, calculateTotals]);

  const cgst = gst / 2;
  const sgst = gst / 2;
  
  const onSubmit = (data: InvoiceFormData) => {
    if (!id) return;
    const updatedInvoiceData = {
        ...invoice,
        ...data,
        id: invoiceNumber,
        date: new Date(invoiceDate).toISOString(),
        amount: total,
        customerName: selectedCustomer?.name || 'N/A',
        dueDate: new Date(data.dueDate).toISOString(),
        customer: selectedCustomer,
        business: businessDetails,
        totals: {
            subtotal,
            discount: watchedDiscount,
            gst,
            total,
        }
    };
    updateInvoice(id, updatedInvoiceData);

    toast({
      title: "Invoice Updated!",
      description: `Invoice ${invoiceNumber} has been successfully updated.`,
    });
    
    router.push(`/dashboard/invoices/${invoiceNumber}`);
  };
  
  if (invoicesLoading || customersLoading || !invoice) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading Invoice...</p>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-bold text-center w-full mb-4">{selectedCustomer?.gstin ? 'TAX Invoice' : 'Cash Memo'}</h1>
              <p className="text-2xl font-bold">{businessDetails.name}</p>
              <p className="text-lg">{businessDetails.address}</p>
              <p className="text-lg">Phone: {businessDetails.phone}</p>
              {businessDetails.gstin && <p className="text-lg">GSTIN / PAN: {businessDetails.gstin}</p>}
            </div>
            <div className="text-right space-y-2">
                <div className="flex items-center justify-end gap-2">
                    <Label htmlFor="invoiceNumber" className="text-right shrink-0">Invoice #:</Label>
                    <Input 
                        id="invoiceNumber"
                        value={invoiceNumber}
                        readOnly
                        className="w-40 text-right bg-muted"
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Label htmlFor="invoiceDate" className="text-right shrink-0">Date:</Label>
                    <Input 
                        id="invoiceDate"
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-40 text-right"
                    />
                </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Customer and Invoice Details */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-lg">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder={"Select a customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedCustomer && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>{selectedCustomer.address}</p>
                  {selectedCustomer.gstin && <p>GSTIN / PAN: {selectedCustomer.gstin}</p>}
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
            <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" {...register('dueDate')} />
                {errors.dueDate && <p className="text-sm text-destructive mt-1">{errors.dueDate.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input id="interestRate" type="number" step="0.01" {...register('interestRate')} />
                    {errors.interestRate && <p className="text-sm text-destructive mt-1">{errors.interestRate.message}</p>}
                 </div>
                 <div>
                    <Label htmlFor="interestCompound">Compounding</Label>
                    <Controller
                        name="interestCompound"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                                <SelectItem value="Annually">Annually</SelectItem>
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.interestCompound && <p className="text-sm text-destructive mt-1">{errors.interestCompound.message}</p>}
                 </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">SN</TableHead>
                  <TableHead className="min-w-[150px]">Item Name</TableHead>
                  <TableHead className="w-[120px]">Qty</TableHead>
                  {selectedCustomer?.gstin && <TableHead className="min-w-[100px]">HSN</TableHead>}
                  <TableHead className="min-w-[120px]">Gross Wt(g)</TableHead>
                  <TableHead className="min-w-[120px]">Net Wt(g)</TableHead>
                  <TableHead className="min-w-[100px]">(Purity)</TableHead>
                  <TableHead className="min-w-[120px]">Rate</TableHead>
                  <TableHead className="min-w-[200px]">Making Charges</TableHead>
                  <TableHead className="min-w-[120px] text-right">Total</TableHead>
                  {selectedCustomer?.gstin && <TableHead className="w-[50px]">Tax?</TableHead>}
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
                    {selectedCustomer?.gstin &&
                        <TableCell>
                            <Input {...register(`items.${index}.hsn`)} placeholder="e.g., 7113" />
                        </TableCell>
                    }
                    <TableCell>
                      <Input type="number" step="0.001" {...register(`items.${index}.grossWeight`)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.001" {...register(`items.${index}.netWeight`)} />
                    </TableCell>
                    <TableCell>
                      <Input type="text" {...register(`items.${index}.purity`)} placeholder="e.g., 22K" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.001" {...register(`items.${index}.rate`)} />
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
                                        <SelectItem value="per_item">/item</SelectItem>
                                    </SelectContent>
                                </Select>
                                )}
                            />
                            <Input type="number" step="0.01" {...register(`items.${index}.makingChargeValue`)} className="flex-1"/>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{getItemTotal(watchedItems[index]).toFixed(2)}</TableCell>
                    {selectedCustomer?.gstin && 
                        <TableCell>
                            <Controller
                                name={`items.${index}.applyGst`}
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </TableCell>
                    }
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

          <Button type="button" variant="outline" onClick={() => append({ itemName: '', qty: 1, hsn: '', grossWeight: 0, netWeight: 0, purity: '91.6', rate: 0, makingChargeType: 'flat', makingChargeValue: 0, applyGst: true })}>
            <PlusCircle className="mr-2" /> Add Item
          </Button>

            {errors.items && !errors.items.root && (
                 <p className="text-sm text-destructive mt-1">Please check item details. All fields except HSN and Purity are required.</p>
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
                <>
                  <div className="flex justify-between">
                    <span>CGST (1.5%):</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (1.5%):</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
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
           <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting || customersLoading}>Save Changes</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
