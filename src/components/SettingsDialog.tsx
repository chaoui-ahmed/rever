import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Coins, LogOut, ShoppingCart, CreditCard } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number | null;
}

const SettingsDialog = ({ open, onOpenChange, credits }: SettingsDialogProps) => {
  const { user, signOut } = useAuth();

  const handlePurchase = (plan: "50" | "500") => {
    if (!user) return;
    const urls = {
      "50": "https://buy.stripe.com/cNi5kCgI4a5XbiWbqsawo00",
      "500": "https://buy.stripe.com/14A4gy77u91T5YC524awo01",
    };
    const params = new URLSearchParams({
      client_reference_id: user.id,
      prefilled_email: user.email ?? "",
    });
    window.location.href = `${urls[plan]}?${params.toString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
            <TabsTrigger value="billing" className="flex-1">Billing</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.email ?? ""}
                readOnly
                className="bg-muted"
              />
            </div>
            <Button
              variant="destructive"
              onClick={signOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6 pt-4">
            <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
              <Coins className="h-8 w-8 text-primary mx-auto" />
              <p className="text-3xl font-bold text-foreground">
                {credits !== null ? credits : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Available Credits</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handlePurchase("50")}
                variant="outline"
                className="w-full gap-2 justify-start"
              >
                <ShoppingCart className="h-4 w-4" />
                Buy 50 Credits
              </Button>
              <Button
                onClick={() => handlePurchase("500")}
                className="w-full gap-2 justify-start"
              >
                <CreditCard className="h-4 w-4" />
                Buy 500 Credits
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
