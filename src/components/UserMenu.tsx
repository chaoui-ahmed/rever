import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "./NavLink";
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
  LogOut,
  CreditCard,
  RefreshCw,
  Settings,
  LayoutGrid,
  Zap,
  Crown
} from "lucide-react";

interface UserMenuProps {
  credits: number | null;
  refreshing: boolean;
  onRefreshCredits: () => void;
  onOpenSettings: () => void;
  planName: string;
}

const UserMenu = ({ credits, refreshing, onRefreshCredits, onOpenSettings, planName }: UserMenuProps) => {
  const { user, signOut } = useAuth();

  const getInitials = (email?: string | null) => {
    if (!email) return "?";
    return email.substring(0, 2).toUpperCase();
  };

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
              <p className="text-xs text-muted-foreground">{planName} Plan</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Account */}
        <DropdownMenuItem onClick={onOpenSettings} className="gap-2 cursor-pointer">
          <User className="h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <NavLink to="/showcase">
            <LayoutGrid className="h-4 w-4" />
            <span>Showcase</span>
          </NavLink>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onOpenSettings} className="gap-2 cursor-pointer">
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

        <DropdownMenuItem onClick={() => handlePurchase("starter")} className="gap-2 cursor-pointer">
          <CreditCard className="h-4 w-4" />
          <span>Starter (1000 Crédits) - 9,99€</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePurchase("pro")} className="gap-2 cursor-pointer">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Pro (1500 Crédits) - 19,99€</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePurchase("pro_plus")} className="gap-2 cursor-pointer font-medium text-amber-600">
          <Crown className="h-4 w-4" />
          <span>Pro+ (5000 Crédits) - 49,99€</span>
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