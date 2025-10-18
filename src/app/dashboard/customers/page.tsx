
"use client";

import React, { useState, useEffect } from 'react';
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

type Customer = {
  id: string;
  name: string;
  fatherName: string;
  businessName?: string;
  address: string;
  number: string;
  gstin?: string;
};

const initialCustomers: Customer[] = [
  { id: 'CUST-001', name: 'Rohan Sharma', fatherName: 'Rajesh Sharma', businessName: 'Sharma Gems', address: '123 Diamond Street, Jaipur', number: '9876543210', gstin: '08AAAAA0000A1Z5' },
  { id: 'CUST-002', name: 'Priya Patel', fatherName: 'Mahesh Patel', businessName: 'Patel Diamonds', address: '456 Ruby Lane, Mumbai', number: '8765432109' },
  { id: 'CUST-003', name: 'Amit Singh', fatherName: 'Suresh Singh', address: '789 Emerald Road, Delhi', number: '7654321098', gstin: '07BBBBB0000B1Z4' },
  { id: 'CUST-004', name: 'Sunita Williams', fatherName: 'John Williams', businessName: 'Galaxy Ornaments', address: '101 Sapphire Avenue, Bangalore', number: '6543210987' },
];

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

   useEffect(() => {
    try {
      const storedCustomersRaw = localStorage.getItem('gems-customers');
      if (storedCustomersRaw) {
        setCustomers(JSON.parse(storedCustomersRaw));
      } else {
        setCustomers(initialCustomers);
        localStorage.setItem('gems-customers', JSON.stringify(initialCustomers));
      }
    } catch (error) {
      console.error("Failed to parse customers from localStorage", error);
      setCustomers(initialCustomers);
    }
  }, []);

  const updateCustomersStateAndStorage = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    localStorage.setItem('gems-customers', JSON.stringify(newCustomers));
  };


  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomerData: Customer = {
      id: editingCustomer?.id || `CUST-00${customers.length + 1}`,
      name: formData.get('name') as string,
      fatherName: formData.get('fatherName') as string,
      businessName: formData.get('businessName') as string || undefined,
      address: formData.get('address') as string,
      number: formData.get('number') as string,
      gstin: formData.get('gstin') as string || undefined,
    };

    if (editingCustomer) {
      const updatedCustomers = customers.map(c => c.id === editingCustomer.id ? newCustomerData : c);
      updateCustomersStateAndStorage(updatedCustomers);
      toast({ title: "Customer Updated", description: "The customer's details have been successfully updated." });
    } else {
      const updatedCustomers = [...customers, newCustomerData];
      updateCustomersStateAndStorage(updatedCustomers);
      toast({ title: "Customer Added", description: "A new customer has been successfully added." });
    }

    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };
  
  const handleDelete = (customerId: string) => {
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    updateCustomersStateAndStorage(updatedCustomers);
    toast({ variant: 'destructive', title: "Customer Deleted", description: "The customer has been removed." });
  };

  const openNewCustomerForm = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  }

  const filteredCustomers = customers.filter((customer) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchTermLower) ||
      customer.fatherName.toLowerCase().includes(searchTermLower) ||
      (customer.businessName && customer.businessName.toLowerCase().includes(searchTermLower)) ||
      customer.address.toLowerCase().includes(searchTermLower) ||
      customer.number.toLowerCase().includes(searchTermLower) ||
      (customer.gstin && customer.gstin.toLowerCase().includes(searchTermLower))
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <CardTitle>Customer Management</CardTitle>
            <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                 </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={openNewCustomerForm}>
                    <PlusCircle className="mr-2" />
                    Add Customer
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                        {editingCustomer ? 'Update the details of the customer.' : 'Fill in the details for the new customer.'}
                    </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" defaultValue={editingCustomer?.name} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fatherName" className="text-right">Father's Name</Label>
                        <Input id="fatherName" name="fatherName" defaultValue={editingCustomer?.fatherName} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="businessName" className="text-right">Business Name</Label>
                        <Input id="businessName" name="businessName" defaultValue={editingCustomer?.businessName} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Address</Label>
                        <Input id="address" name="address" defaultValue={editingCustomer?.address} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="number" className="text-right">Number</Label>
                        <Input id="number" name="number" defaultValue={editingCustomer?.number} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="gstin" className="text-right">GSTIN</Label>
                        <Input id="gstin" name="gstin" defaultValue={editingCustomer?.gstin} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{editingCustomer ? 'Save Changes' : 'Add Customer'}</Button>
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
              <TableHead>Name</TableHead>
              <TableHead>Father's Name</TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.fatherName}</TableCell>
                <TableCell>{customer.businessName || '-'}</TableCell>
                <TableCell>{customer.address}</TableCell>
                <TableCell>{customer.number}</TableCell>
                <TableCell>{customer.gstin || '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(customer)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(customer.id)}>
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
