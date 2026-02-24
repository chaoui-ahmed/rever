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
  Crown,
  Zap,
  CreditCard
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

  const handlePurchase = (plan: "starter" | "pro" | "pro_plus") => {
    if (!user) return;
    
    // 🛑 À CHANGER 🛑 : Remplace ce qui est entre les guillemets par tes vrais liens Stripe
    const urls = {
      "starter": "https://buy.stripe.com/aFaeVc2Regul0Ei1PSawo02",     // 🛑 À CHANGER 🛑
      "pro": "https://buy.stripe.com/3cI7sKbnKgul3Qu668awo03",       // 🛑 À CHANGER 🛑
      "pro_plus": "https://buy.stripe.com/4gM4gy2Re7XPbiW1PSawo04"    // 🛑 À CHANGER 🛑
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
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground`}
                  >
                    {planName}
                  </span>
                </div>
              </div>
            </div>

            {/* Buy Credits Section */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buy Credits</p>
              
              <Button
                onClick={() => handlePurchase("starter")}
                variant="outline"
                className="w-full gap-2 justify-between"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Starter — 1000 Credits</span>
                </div>
                <span className="font-semibold text-primary">9,99 €</span>
              </Button>

              <Button
                onClick={() => handlePurchase("pro")}
                className="w-full gap-2 justify-between bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Pro — 1500 Credits</span>
                </div>
                <span className="font-semibold">19,99 €</span>
              </Button>

              <Button
                onClick={() => handlePurchase("pro_plus")}
                className="w-full gap-2 justify-between bg-amber-500 hover:bg-amber-600 text-white"
              >
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  <span>Pro+ — 5000 Credits</span>
                </div>
                <span className="font-semibold">49,99 €</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;