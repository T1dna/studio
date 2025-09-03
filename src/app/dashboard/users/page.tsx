import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users /> User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section is under construction. Here Admins and Developers will be able to manage user accounts and roles.
        </p>
      </CardContent>
    </Card>
  );
}
