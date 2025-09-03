import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Gem, FileText } from 'lucide-react';

const stats = [
    { title: "Total Revenue", value: "₹1,250,430", icon: DollarSign, change: "+12.5%" },
    { title: "Active Customers", value: "342", icon: Users, change: "+5" },
    { title: "Items in Stock", value: "1,203", icon: Gem, change: "-20" },
    { title: "Invoices Pending", value: "58", icon: FileText, change: "+3" },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {stat.change} from last month
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to GemsAccurate</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This is your main dashboard. Use the sidebar to navigate to different sections of the application.
                        You can manage customers, items, create invoices, and calculate interest on overdue payments.
                    </p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
