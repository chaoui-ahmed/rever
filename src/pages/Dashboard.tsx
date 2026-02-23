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
  Sparkles,
  Terminal
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import reverLogo from "@/assets/rever-logo.png";
import reverIcon from "@/assets/rever-icon.png";
import UserMenu from "@/components/UserMenu";
import SettingsDialog from "@/components/SettingsDialog";
import { LiquidMetalButton } from "@/components/liquid-metal-button";
import SiteTimeMachine from "@/components/SiteTimeMachine";

interface Site {
  id: number;
  domain: string;
  platform: string;
}

// Fonction utilitaire pour mélanger un tableau (Fisher-Yates shuffle)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- EXEMPLES STATIQUES POUR MONTRER LE PRODUIT ---
const VISION_EXAMPLES = [
  {
    domain: "linear.app",
    title: "Productivity Tool",
    prompt: "A dark-themed workspace dashboard featuring deep blacks, neon purple glowing accents, intricate bento-box grid layouts, and sharp sans-serif typography with subtle metallic borders.",
  },
  {
    domain: "stripe.com",
    title: "Fintech Landing",
    prompt: "A modern, trustworthy landing page utilizing dynamic mesh gradients in vibrant colors, crisp typography, complex animated micro-interactions, and a clean, developer-focused aesthetic.",
  },
  {
    domain: "vercel.com",
    title: "Developer Platform",
    prompt: "A sleek high-contrast monochrome interface with subtle neon glowing borders, floating terminal windows, minimalist geometric shapes, and a stark futuristic design language.",
  }
];

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
      .select("*"); 
      
    if (data) {
      setSites(shuffleArray(data));
    }
    setLoadingShowcase(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchShowcaseSites();

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

  const handleCopyExample = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Prompt d'exemple copié !");
  };

  const filteredSites = sites.filter(site => {
    const matchesFilter = showcaseFilter === "all" || site.platform === showcaseFilter;
    const matchesSearch = site.domain.toLowerCase().includes(showcaseSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <header className="border-b border-white/10 sticky top-0 z-10 bg-background/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-20">
          <img src={reverLogo} alt="REVER" className="h-14 w-auto filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <Tabs defaultValue="generate" className="w-full space-y-12 relative z-10">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-secondary/50 backdrop-blur-md border border-white/5">
              <TabsTrigger value="generate" className="gap-2 data-[state=active]:bg-white/10">
                <Zap className="h-4 w-4" /> Generator
              </TabsTrigger>
              <TabsTrigger value="showcase" className="gap-2 data-[state=active]:bg-white/10">
                <Globe className="h-4 w-4" /> Showcase
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="generate" className="space-y-10 focus-visible:outline-none flex flex-col items-center animate-in fade-in duration-700">
            <div className="text-center space-y-6 pt-6">
              <img src={reverIcon} alt="REVER" className="h-28 mx-auto filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] animate-in zoom-in duration-700" />
              <div className="space-y-3">
                <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                  REVƎЯ
                </h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto font-light">Paste the url and generate your prompt.</p>
              </div>
            </div>

            <div className="w-full max-w-xl space-y-8 flex flex-col items-center">
              <div className="relative w-full group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <Input type="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="h-16 pl-12 pr-4 text-lg bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/30" />
                </div>
              </div>

              <div className="pt-4 flex flex-col items-center scale-110">
                <LiquidMetalButton 
                  label={generating ? "Extracting..." : "Generate Prompt"} 
                  onClick={hasCredits ? handleGenerate : handlePurchase50} 
                  viewMode="text" 
                />
                {!hasCredits && (
                  <p className="text-center text-sm text-muted-foreground mt-8">
                    You're out of credits. <button onClick={handlePurchase50} className="text-primary underline hover:text-primary/80">Purchase more</button>
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

            {/* --- NOUVELLE SECTION EXEMPLES --- */}
            {!generatedPrompt && (
              <div className="w-full max-w-5xl mx-auto pt-20 pb-10">
                <div className="flex flex-col items-center text-center mb-10 opacity-70">
                  <Sparkles className="h-5 w-5 text-muted-foreground mb-3" />
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Aperçu des Capacités</h3>
                  <p className="text-sm text-muted-foreground/60 mt-2 font-light max-w-md">Découvrez le type d'essences architecturales que REVƎЯ peut extraire à partir de simples URLs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {VISION_EXAMPLES.map((ex, index) => (
                    <div 
                      key={index} 
                      className="group relative flex flex-col p-5 rounded-2xl bg-white/[0.015] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-500"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary/50 group-hover:bg-primary group-hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all" />
                          <span className="text-sm font-medium text-white/80">{ex.domain}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/5 text-muted-foreground/50 uppercase tracking-wider">
                          {ex.title}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 relative bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[11px] leading-relaxed text-muted-foreground/70 group-hover:text-muted-foreground transition-colors overflow-hidden">
                        <Terminal className="absolute top-3 right-3 h-3 w-3 opacity-20" />
                        "{ex.prompt}"
                      </div>

                      <button 
                        onClick={() => handleCopyExample(ex.prompt)}
                        className="mt-4 w-full py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-muted-foreground/60 hover:bg-white/[0.05] hover:text-white transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                      >
                        <Copy className="h-3 w-3" /> Copier l'exemple
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="showcase" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div>
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">The Archive</h2>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." className="pl-9 bg-black/20 border-white/5 focus-visible:ring-1 focus-visible:ring-primary" value={showcaseSearch} onChange={(e) => setShowcaseSearch(e.target.value)} />
                </div>
                <select className="bg-secondary/50 text-sm rounded-md px-3 border border-white/5 focus:ring-1 ring-primary" value={showcaseFilter} onChange={(e) => setShowcaseFilter(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="vercel">Vercel</option>
                  <option value="lovable">Lovable</option>
                </select>
              </div>
            </div>

            {loadingShowcase ? (
              <div className="flex justify-center py-32"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : (
              <div className="space-y-24 mt-8">
                <div>
                  <SiteTimeMachine sites={filteredSites} />
                </div>

                <div className="w-full max-w-4xl mx-auto border-t border-white/5 pt-12 pb-20">
                  <div className="flex items-center justify-between mb-8 px-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">Index Aléatoire</h3>
                    <span className="text-[10px] font-mono text-muted-foreground/30">{filteredSites.length} domaines répertoriés</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredSites.map((site) => (
                      <a
                        key={site.id}
                        href={`https://${site.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-secondary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <span className="text-sm font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">
                            {site.domain}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-white/10 text-muted-foreground/40 uppercase font-bold">
                            {site.platform}
                          </Badge>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/10 group-hover:text-primary transition-colors" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
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