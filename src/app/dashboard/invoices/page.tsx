import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function InvoicesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText /> Invoice Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section is under construction. Here you will be able to create, view, and manage your invoices. I'm working on this next!
        </p>
      </CardContent>
    </Card>
  );
}
