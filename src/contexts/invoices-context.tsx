
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const mockBusinessDetails = {
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
  [key: string]: any; // Allow for other properties
}

interface InvoicesContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  getInvoice: (id: string) => Invoice | undefined;
  loading: boolean;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);


const mockInvoices: Invoice[] = [
  { 
    id: 'INV-2024001', customerName: 'Rohan Sharma', date: '2024-07-15', amount: 25750, status: 'Paid',
    items: [{ itemName: 'Gold Ring', qty: 1, grossWeight: 5, rate: 24000, makingChargeType: 'flat', makingChargeValue: 1000 }],
    totals: { subtotal: 25000, discount: 0, gst: 750, total: 25750 },
    customer: { id: 'CUST-001', name: 'Rohan Sharma', address: '123 Diamond Street, Jaipur', gstin: '08AAAAA0000A1Z5' },
    business: mockBusinessDetails,
    paymentMode: 'Cash'
  },
  { 
    id: 'INV-2024002', customerName: 'Priya Patel', date: '2024-07-12', amount: 15000, status: 'Pending',
    items: [{ itemName: 'Silver Chain', qty: 1, grossWeight: 50, rate: 15000, makingChargeType: 'percentage', makingChargeValue: 0 }],
    totals: { subtotal: 15000, discount: 0, gst: 0, total: 15000 },
    customer: { id: 'CUST-002', name: 'Priya Patel', address: '456 Ruby Lane, Mumbai', gstin: '' },
    business: mockBusinessDetails,
    paymentMode: 'Online'
  },
];


export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedInvoicesRaw = localStorage.getItem('gems-invoices');
      let storedInvoices = storedInvoicesRaw ? JSON.parse(storedInvoicesRaw) : null;
      
      if (storedInvoices) {
        // Data repair: Ensure all invoices have business and customer data
        const repairedInvoices = storedInvoices.map((inv: Invoice) => ({
          ...inv,
          business: inv.business || mockBusinessDetails,
          customer: inv.customer || { name: inv.customerName || 'N/A', address: ''},
        }));
        setInvoices(repairedInvoices);
        // Save the repaired data back to localStorage
        localStorage.setItem('gems-invoices', JSON.stringify(repairedInvoices));
      } else {
        // If no invoices in storage, start with mock data
        setInvoices(mockInvoices);
        localStorage.setItem('gems-invoices', JSON.stringify(mockInvoices));
      }
    } catch (error) {
      console.error("Failed to parse invoices from localStorage", error);
      // Fallback to mock data if storage is corrupt
      setInvoices(mockInvoices);
      localStorage.setItem('gems-invoices', JSON.stringify(mockInvoices));
    } finally {
      setLoading(false);
    }
  }, []);

  const addInvoice = (invoice: Invoice) => {
    const updatedInvoices = [...invoices, invoice];
    setInvoices(updatedInvoices);
    localStorage.setItem('gems-invoices', JSON.stringify(updatedInvoices));
  };

  const getInvoice = (id: string): Invoice | undefined => {
    return invoices.find(invoice => invoice.id === id);
  }

  return (
    <InvoicesContext.Provider value={{ invoices, addInvoice, getInvoice, loading }}>
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
