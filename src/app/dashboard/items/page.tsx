import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem } from "lucide-react";

export default function ItemsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gem /> Item Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section is under construction. Here you will be able to add, edit, and manage your jewelry items and their HSN codes.
        </p>
      </CardContent>
    </Card>
  );
}
