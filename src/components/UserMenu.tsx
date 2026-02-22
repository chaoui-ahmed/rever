import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Coins,
  ShoppingCart,
  LogOut,
  CreditCard,
  RefreshCw,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface UserMenuProps {
  credits: number | null;
  refreshing: boolean;
  onRefreshCredits: () => void;
}

const UserMenu = ({ credits, refreshing, onRefreshCredits }: UserMenuProps) => {
  const { user, signOut } = useAuth();

  const getInitials = (email?: string | null) => {
    if (!email) return "?";
    return email.substring(0, 2).toUpperCase();
  };

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* User info */}
        <DropdownMenuLabel className="font-normal py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials(user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground">Free Plan</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Account */}
        <DropdownMenuItem onClick={() => toast.info("Coming soon")} className="gap-2 cursor-pointer">
          <User className="h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("Coming soon")} className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Credits */}
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-primary" />
            <span>Credits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">
              {credits !== null ? credits : "—"}
            </span>
            <button
              onClick={onRefreshCredits}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh credits"
            >
              <RefreshCw
                className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <DropdownMenuItem onClick={() => handlePurchase("50")} className="gap-2 cursor-pointer">
          <ShoppingCart className="h-4 w-4" />
          <span>Buy 50 Credits</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePurchase("500")} className="gap-2 cursor-pointer">
          <CreditCard className="h-4 w-4" />
          <span>Buy 500 Credits</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
