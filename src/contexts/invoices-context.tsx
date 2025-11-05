
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, setDoc, updateDoc, collectionGroup, Query, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface BusinessDetails {
  name: string;
  address: string;
  phone: string;
  gstin?: string;
}

const defaultBusinessDetails: BusinessDetails = {
  name: 'Bhagya Shree Jewellers',
  address: 'JP Market, In Front of High School Gate No. 01, Bherunda (Nasrullaganj)',
  phone: '+91 9988776655',
  gstin: '29ABCDE1234F1Z5',
};

// This is a simplified version of the full invoice data for listing purposes.
export interface Invoice {
  id: string;
  customerName: string;
  customerId: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  isDeleted?: boolean;
  [key: string]: any; // Allow for other properties
}

interface InvoicesContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  recoverInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  generateInvoiceNumber: (isTaxInvoice: boolean) => string;
  loading: boolean;
  businessDetails: BusinessDetails;
  updateBusinessDetails: (details: BusinessDetails) => void;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);


export function InvoicesProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Fetch Business Details from Firestore
  const businessSettingsRef = useMemoFirebase(() => {
      if (!firestore) return null;
      // There's only one settings doc, with a known ID.
      return doc(firestore, 'business_settings', 'shop_details');
  }, [firestore]);
  
  const { data: businessDetailsData, isLoading: businessLoading } = useDoc<BusinessDetails>(businessSettingsRef);
  const businessDetails = businessDetailsData || defaultBusinessDetails;
  
  
  // Fetch All Invoices using a Collection Group query
   const invoicesQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return collectionGroup(firestore, 'invoices') as Query<DocumentData>;
   }, [firestore]);

   const { data: rawInvoices, isLoading: invoicesLoading, error } = useCollection<Invoice>(invoicesQuery);

   const invoices = useMemo(() => {
       if (!rawInvoices) return [];
       return rawInvoices.map(inv => {
           // The ref is part of the raw doc data from useCollection and gives us the path.
           const ref = (inv as any).ref;
           // The path of a subcollection doc is customers/{customerId}/invoices/{invoiceId}
           const customerId = ref?.parent?.parent?.id || 'unknown';
           return {
            ...inv,
            customerId: customerId,
        }
       });
   }, [rawInvoices]);


  const generateInvoiceNumber = useCallback((isTaxInvoice: boolean): string => {
    const prefix = isTaxInvoice ? 'INV' : 'CSH';
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const seriesPrefix = `${prefix}-${year}${month}`;

    const relevantInvoices = invoices.filter(inv => inv.id.startsWith(seriesPrefix));

    let nextNumber = 1;
    if (relevantInvoices.length > 0) {
        const lastInvoice = relevantInvoices.sort((a, b) => {
            const numA = parseInt(a.id.split(seriesPrefix)[1], 10);
            const numB = parseInt(b.id.split(seriesPrefix)[1], 10);
            return numA - numB;
        }).pop();
        
        if (lastInvoice) {
            const lastNum = parseInt(lastInvoice.id.split(seriesPrefix)[1], 10);
            nextNumber = lastNum + 1;
        }
    }
    
    return `${seriesPrefix}${nextNumber.toString().padStart(5, '0')}`;
  }, [invoices]);


  const addInvoice = (invoice: Invoice) => {
    if (!firestore || !invoice.customer?.id) {
        toast({variant: 'destructive', title: 'Error', description: 'Could not save invoice. Customer ID is missing.'});
        return;
    }
    const invoiceRef = doc(firestore, 'customers', invoice.customer.id, 'invoices', invoice.id);
    // Using non-blocking update for instant UI feedback
    setDocumentNonBlocking(invoiceRef, { ...invoice, isDeleted: false }, {merge: false});
  };
  
  const updateInvoice = (id: string, invoice: Invoice) => {
    if (!firestore || !invoice.customer?.id) {
        toast({variant: 'destructive', title: 'Error', description: 'Could not update invoice. Customer ID is missing.'});
        return;
    }
    const invoiceRef = doc(firestore, 'customers', invoice.customer.id, 'invoices', id);
    // Using non-blocking update for instant UI feedback
    setDocumentNonBlocking(invoiceRef, invoice, { merge: true });
  };

  const deleteInvoice = (id: string) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!firestore || !invoice || !invoice.customerId) return;
    const invoiceRef = doc(firestore, 'customers', invoice.customerId, 'invoices', id);
    updateDocumentNonBlocking(invoiceRef, { isDeleted: true });
  };

  const recoverInvoice = (id: string) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!firestore || !invoice || !invoice.customerId) return;
    const invoiceRef = doc(firestore, 'customers', invoice.customerId, 'invoices', id);
    updateDocumentNonBlocking(invoiceRef, { isDeleted: false });
  };

  const getInvoice = (id: string): Invoice | undefined => {
    return invoices.find(invoice => invoice.id === id);
  }
  
  const updateBusinessDetails = useCallback((details: BusinessDetails) => {
      if (!businessSettingsRef) return;
      // Non-blocking update for UI responsiveness
      updateDocumentNonBlocking(businessSettingsRef, details);
  }, [businessSettingsRef]);

  return (
    <InvoicesContext.Provider value={{ invoices, addInvoice, updateInvoice, deleteInvoice, recoverInvoice, getInvoice, generateInvoiceNumber, loading: invoicesLoading || businessLoading, businessDetails, updateBusinessDetails }}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoicesContext);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoicesProvider');
  }
  return context;
}
