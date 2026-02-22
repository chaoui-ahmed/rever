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
import {
  Coins,
  LogOut,
  ShoppingCart,
  CreditCard,
  Crown,
  Check as CheckIcon,
  Sparkles,
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number | null;
  planName: string;
}

const SettingsDialog = ({ open, onOpenChange, credits, planName }: SettingsDialogProps) => {
  const { user, signOut } = useAuth();
  const isPro = planName === "Pro";

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

  const proBenefits = [
    "High-quality prompt generation",
    "50 credits included",
    "Priority support",
    "Early access to new features",
  ];

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

            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                    isPro
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-400/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPro && <Crown className="h-3.5 w-3.5" />}
                  {planName}
                </span>
              </div>
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
          <TabsContent value="billing" className="space-y-5 pt-4">
            {/* Credit balance */}
            <div className="rounded-lg border border-border bg-card p-5 text-center space-y-1">
              <Coins className="h-7 w-7 text-primary mx-auto" />
              <p className="text-3xl font-bold text-foreground">
                {credits !== null ? credits : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Available Credits</p>
            </div>

            {/* Current plan section */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Current Plan</h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isPro
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-400/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPro && <Crown className="h-3 w-3" />}
                    {planName}
                  </span>
                </div>
              </div>

              {isPro && (
                <ul className="space-y-2">
                  {proBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upgrade or buy credits */}
            {!isPro && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Upgrade to Pro</h3>
                </div>
                <ul className="space-y-2">
                  {proBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handlePurchase("500")}
                  className="w-full gap-2"
                >
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro — 500 Credits
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buy Credits</p>
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
                variant="outline"
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
