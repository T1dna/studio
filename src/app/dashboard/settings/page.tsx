
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Loader2 } from "lucide-react";
import { useInvoices, BusinessDetails } from '@/contexts/invoices-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

const businessDetailsSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  gstin: z.string().optional(),
});

export default function SettingsPage() {
  const { businessDetails, updateBusinessDetails, loading: invoicesLoading } = useInvoices();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BusinessDetails>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: businessDetails
  });

  useEffect(() => {
    if (!authLoading && user?.role !== 'Developer') {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (businessDetails) {
      reset(businessDetails);
    }
  }, [businessDetails, reset]);

  const onSubmit = (data: BusinessDetails) => {
    updateBusinessDetails(data);
    toast({
      title: 'Settings Saved',
      description: 'Your business details have been updated.',
    });
  };

  const isLoading = authLoading || invoicesLoading;

  if (isLoading) {
      return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (user?.role !== 'Developer') {
      return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings /> Business Settings
        </CardTitle>
        <CardDescription>
          Configure your business details here. These details will appear on your invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div>
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN (optional)</Label>
            <Input id="gstin" {...register('gstin')} />
            {errors.gstin && <p className="text-sm text-destructive mt-1">{errors.gstin.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
