
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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
  loading: boolean;
  businessDetails: BusinessDetails;
  updateBusinessDetails: (details: BusinessDetails) => void;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);


const mockInvoices: Invoice[] = [
  { 
    id: 'INV-2024001', customerName: 'Rohan Sharma', date: '2024-07-15', amount: 25750, status: 'Paid',
    items: [{ itemName: 'Gold Ring', qty: 1, netWeight: 5, rate: 24000, makingChargeType: 'flat', makingChargeValue: 1000 }],
    totals: { subtotal: 25000, discount: 0, gst: 750, total: 25750 },
    customer: { id: 'CUST-001', name: 'Rohan Sharma', address: '123 Diamond Street, Jaipur', gstin: '08AAAAA0000A1Z5' },
    paymentMode: 'Cash'
  },
  { 
    id: 'INV-2024002', customerName: 'Priya Patel', date: '2024-07-12', amount: 15000, status: 'Pending',
    items: [{ itemName: 'Silver Chain', qty: 1, netWeight: 50, rate: 15000, makingChargeType: 'percentage', makingChargeValue: 0 }],
    totals: { subtotal: 15000, discount: 0, gst: 0, total: 15000 },
    customer: { id: 'CUST-002', name: 'Priya Patel', address: '456 Ruby Lane, Mumbai', gstin: '' },
    paymentMode: 'Online'
  },
];


export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(defaultBusinessDetails);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Load business details
      const storedBusinessDetailsRaw = localStorage.getItem('gems-business-details');
      const storedBusinessDetails = storedBusinessDetailsRaw ? JSON.parse(storedBusinessDetailsRaw) : null;
      if (storedBusinessDetails) {
        setBusinessDetails(storedBusinessDetails);
      } else {
        localStorage.setItem('gems-business-details', JSON.stringify(defaultBusinessDetails));
      }
      
      // Load invoices
      const storedInvoicesRaw = localStorage.getItem('gems-invoices');
      let storedInvoices = storedInvoicesRaw ? JSON.parse(storedInvoicesRaw) : null;
      
      const finalBusinessDetails = storedBusinessDetails || defaultBusinessDetails;

      if (storedInvoices) {
        // Data repair: Ensure all invoices have necessary data
        const repairedInvoices = storedInvoices.map((inv: Invoice) => ({
          ...inv,
          isDeleted: inv.isDeleted || false,
          business: inv.business || finalBusinessDetails,
          customer: inv.customer || { name: inv.customerName || 'N/A', address: ''},
          items: Array.isArray(inv.items) ? inv.items : [],
          totals: inv.totals || { subtotal: inv.amount || 0, discount: 0, gst: 0, total: inv.amount || 0 },
        }));
        setInvoices(repairedInvoices);
        localStorage.setItem('gems-invoices', JSON.stringify(repairedInvoices));
      } else {
        // If no invoices in storage, start with mock data and add business details
        const initialInvoices = mockInvoices.map(inv => ({...inv, business: finalBusinessDetails, isDeleted: false}));
        setInvoices(initialInvoices);
        localStorage.setItem('gems-invoices', JSON.stringify(initialInvoices));
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      // Fallback to mock data if storage is corrupt
      const initialInvoices = mockInvoices.map(inv => ({...inv, business: defaultBusinessDetails, isDeleted: false}));
      setInvoices(initialInvoices);
      localStorage.setItem('gems-invoices', JSON.stringify(initialInvoices));
      localStorage.setItem('gems-business-details', JSON.stringify(defaultBusinessDetails));
    } finally {
      setLoading(false);
    }
  }, []);

  const addInvoice = (invoice: Invoice) => {
    const updatedInvoices = [...invoices, { ...invoice, isDeleted: false }];
    setInvoices(updatedInvoices);
    localStorage.setItem('gems-invoices', JSON.stringify(updatedInvoices));
  };
  
  const updateInvoice = (id: string, invoice: Invoice) => {
    const updatedInvoices = invoices.map(i => i.id === id ? invoice : i);
    setInvoices(updatedInvoices);
    localStorage.setItem('gems-invoices', JSON.stringify(updatedInvoices));
  };

  const deleteInvoice = (id: string) => {
    const updatedInvoices = invoices.map(invoice => 
        invoice.id === id ? { ...invoice, isDeleted: true } : invoice
    );
    setInvoices(updatedInvoices);
    localStorage.setItem('gems-invoices', JSON.stringify(updatedInvoices));
  };

  const recoverInvoice = (id: string) => {
    const updatedInvoices = invoices.map(invoice =>
        invoice.id === id ? { ...invoice, isDeleted: false } : invoice
    );
    setInvoices(updatedInvoices);
    localStorage.setItem('gems-invoices', JSON.stringify(updatedInvoices));
  };

  const getInvoice = (id: string): Invoice | undefined => {
    return invoices.find(invoice => invoice.id === id);
  }
  
  const updateBusinessDetails = useCallback((details: BusinessDetails) => {
      setBusinessDetails(details);
      localStorage.setItem('gems-business-details', JSON.stringify(details));
  }, []);

  return (
    <InvoicesContext.Provider value={{ invoices, addInvoice, updateInvoice, deleteInvoice, recoverInvoice, getInvoice, loading, businessDetails, updateBusinessDetails }}>
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
