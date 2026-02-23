import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Coins,
  Link as LinkIcon,
  Zap,
  Copy,
  Check,
  Globe,
  Search,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import reverLogo from "@/assets/rever-logo.png";
import UserMenu from "@/components/UserMenu";
import SettingsDialog from "@/components/SettingsDialog";
import { LiquidMetalButton } from "@/components/liquid-metal-button";
import SiteTimeMachine from "@/components/SiteTimeMachine";

interface Site {
  id: number;
  domain: string;
  platform: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string>("Free");
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // États pour le Showcase
  const [sites, setSites] = useState<Site[]>([]);
  const [showcaseFilter, setShowcaseFilter] = useState("all");
  const [showcaseSearch, setShowcaseSearch] = useState("");
  const [loadingShowcase, setLoadingShowcase] = useState(true);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("credits, plan_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load your profile. Please try refreshing.");
      return;
    }
    
    if (data) {
      setCredits(data.credits ?? 0);
      setPlanName(data.plan_name ?? "Free");
    }
  };

  const fetchShowcaseSites = async () => {
    setLoadingShowcase(true);
    const { data } = await supabase
      .from("discovered_sites")
      .select("*")
      .order('created_at', { ascending: false });
    if (data) setSites(data);
    setLoadingShowcase(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchShowcaseSites();

    // LOGIQUE TEMPS RÉEL
    const channel = supabase
      .channel("credits-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as { credits: number; plan_name: string };
          setCredits(newData.credits ?? 0);
          setPlanName(newData.plan_name ?? "Free");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hasCredits = credits !== null && credits > 0;

  const handleGenerate = async () => {
    let finalUrl = url.trim();
    if (!finalUrl) {
      toast.error("Please enter a URL");
      return;
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    if (!hasCredits) return;

    setGenerating(true);
    setGeneratedPrompt(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-prompt", {
        body: { url: finalUrl },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setGeneratedPrompt(data.prompt);
      setCredits(data.creditsRemaining);
      toast.success("Prompt generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate prompt");
    } finally {
      setGenerating(false);
    }
  };

  // LOGIQUE D'ACHAT
  const handlePurchase50 = () => {
    const stripeUrl = import.meta.env.VITE_STRIPE_PAYMENT_URL;
    if (!stripeUrl) {
      toast.error("Payment is not configured. Please contact support.");
      return;
    }
    const params = new URLSearchParams({
      client_reference_id: user?.id ?? "",
      prefilled_email: user?.email ?? "",
    });
    window.location.href = `${stripeUrl}?${params.toString()}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSites = sites.filter(site => {
    const matchesFilter = showcaseFilter === "all" || site.platform === showcaseFilter;
    const matchesSearch = site.domain.toLowerCase().includes(showcaseSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-10 bg-background/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-20">
          <img src={reverLogo} alt="REVER" className="h-10 w-auto filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  planName === "Pro" ? "bg-amber-100 text-amber-800 ring-1 ring-amber-400/30" : "bg-muted text-muted-foreground"
                }`}>
                {planName}
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-foreground">{credits !== null ? credits : "—"}</span>
              </div>
            </div>
            <UserMenu credits={credits} refreshing={refreshing} onRefreshCredits={handleRefresh} onOpenSettings={() => setIsSettingsOpen(true)} planName={planName} />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 relative">
        {/* Glow effect behind the main content */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <Tabs defaultValue="generate" className="w-full space-y-12 relative z-10">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-secondary/50 backdrop-blur-md border border-white/5">
              <TabsTrigger value="generate" className="gap-2 data-[state=active]:bg-white/10">
                <Zap className="h-4 w-4" /> Studio
              </TabsTrigger>
              <TabsTrigger value="showcase" className="gap-2 data-[state=active]:bg-white/10">
                <Globe className="h-4 w-4" /> Showcase
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB GENERATE */}
          <TabsContent value="generate" className="space-y-10 flex flex-col items-center animate-in fade-in duration-700 focus-visible:outline-none">
            <div className="text-center space-y-6 pt-6">
              <img src={reverLogo} alt="REVER" className="h-28 mx-auto filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]" />
              <div className="space-y-3">
                <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                  Forge Your Vision
                </h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto font-light">
                  Input a destination. Extract the essence.
                </p>
              </div>
            </div>

            <div className="w-full max-w-xl space-y-8 flex flex-col items-center">
              <div className="relative w-full group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                  <LinkIcon className="absolute left-4 h-5 w-5 text-muted-foreground/50" />
                  <Input 
                    type="url" 
                    placeholder="https://..." 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    className="h-16 pl-12 pr-4 text-lg bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/30" 
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col items-center scale-110">
                <LiquidMetalButton 
                  label={generating ? "Extracting..." : "Generate Sequence"} 
                  onClick={hasCredits ? handleGenerate : handlePurchase50} 
                  viewMode="text" 
                />
                {!hasCredits && (
                  <p className="text-sm text-destructive mt-6">
                    Insufficient credits. Clicking above will prompt purchase.
                  </p>
                )}
              </div>

              {generatedPrompt && (
                <div className="w-full rounded-xl border border-white/10 bg-card/50 backdrop-blur-md p-6 space-y-4 mt-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Generated Prompt</h2>
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">{generatedPrompt}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB SHOWCASE */}
          <TabsContent value="showcase" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div>
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">The Archive</h2>
                <p className="text-muted-foreground">Inspiration des projets Vercel & Lovable.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher..." 
                    className="pl-9 bg-black/20 border-white/5 focus-visible:ring-1 focus-visible:ring-primary" 
                    value={showcaseSearch} 
                    onChange={(e) => setShowcaseSearch(e.target.value)} 
                  />
                </div>
                <select 
                  className="bg-secondary/50 text-sm rounded-md px-3 border border-white/5 focus:ring-1 ring-primary" 
                  value={showcaseFilter} 
                  onChange={(e) => setShowcaseFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="vercel">Vercel</option>
                  <option value="lovable">Lovable</option>
                </select>
              </div>
            </div>

            {loadingShowcase ? (
              <div className="flex justify-center py-32"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : (
              <div className="mt-8">
                <SiteTimeMachine sites={filteredSites} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} credits={credits} planName={planName} />
    </div>
  );
};

export default Dashboard;