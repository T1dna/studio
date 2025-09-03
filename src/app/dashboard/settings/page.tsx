import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings /> Business Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section is under construction. Here the Developer will be able to configure business details.
        </p>
      </CardContent>
    </Card>
  );
}
