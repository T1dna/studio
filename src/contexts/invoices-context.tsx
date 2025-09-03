
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// This is a simplified version of the full invoice data for listing purposes.
export interface Invoice {
  id: string;
  customerName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

interface InvoicesContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  loading: boolean;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

const mockInvoices: Invoice[] = [
  { id: 'INV-2024001', customerName: 'Rohan Sharma', date: '2024-07-15', amount: 25000, status: 'Paid' },
  { id: 'INV-2024002', customerName: 'Priya Patel', date: '2024-07-12', amount: 15000, status: 'Pending' },
  { id: 'INV-2024003', customerName: 'Amit Singh', date: '2024-06-20', amount: 45000, status: 'Overdue' },
  { id: 'INV-2024004', customerName: 'Sunita Williams', date: '2024-07-18', amount: 7500, status: 'Paid' },
  { id: 'INV-2024005', customerName: 'Rohan Sharma', date: '2024-07-20', amount: 32000, status: 'Pending' },
];


export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedInvoices = localStorage.getItem('gems-invoices');
      if (storedInvoices) {
        setInvoices(JSON.parse(storedInvoices));
      } else {
        // If no invoices in storage, start with mock data
        setInvoices(mockInvoices);
      }
    } catch (error) {
      console.error("Failed to parse invoices from localStorage", error);
      // Fallback to mock data if storage is corrupt
      setInvoices(mockInvoices);
      localStorage.removeItem('gems-invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  const addInvoice = (invoice: Invoice) => {
    const updatedInvoices = [...invoices, invoice];
    setInvoices(updatedInvoices);
    localStorage.setItem('gems-invoices', JSON.stringify(updatedInvoices));
  };

  return (
    <InvoicesContext.Provider value={{ invoices, addInvoice, loading }}>
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

    