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

    // LOGIQUE TEMPS RÉEL (Récupérée de ton code original)
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

  // LOGIQUE D'ACHAT (Récupérée de ton code original)
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header avec logo agrandi */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-20">
          <img src={reverLogo} alt="REVER" className="h-10 w-auto" /> {/* Logo plus gros (h-10) */}
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

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        <Tabs defaultValue="generate" className="w-full space-y-12">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
              <TabsTrigger value="generate" className="gap-2">
                <Zap className="h-4 w-4" /> Générer
              </TabsTrigger>
              <TabsTrigger value="showcase" className="gap-2">
                <Globe className="h-4 w-4" /> Showcase
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB GENERATE : Logo au centre */}
          <TabsContent value="generate" className="space-y-10 focus-visible:outline-none flex flex-col items-center">
            <div className="text-center space-y-6 pt-6">
              <img src={reverLogo} alt="REVER" className="h-24 mx-auto animate-in fade-in zoom-in duration-700" /> {/* Logo Central géant */}
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Générer un Prompt</h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">Collez n'importe quelle URL et laissez la magie opérer.</p>
              </div>
            </div>

            <div className="w-full max-w-2xl space-y-4">
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input type="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="h-14 pl-12 pr-4 text-base bg-card border-border rounded-lg" />
              </div>

              {hasCredits ? (
                <Button onClick={handleGenerate} disabled={generating} className="w-full h-14 text-base font-semibold rounded-lg">
                  {generating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
                  {generating ? "Generating…" : "Generate Prompt"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button disabled className="w-full h-14 text-base font-semibold rounded-lg opacity-50"><Zap className="h-5 w-5 mr-2" /> Generate Prompt</Button>
                  <p className="text-center text-sm text-muted-foreground">You're out of credits. <button onClick={handlePurchase50} className="text-primary underline hover:text-primary/80">Purchase more</button></p>
                </div>
              )}

              {generatedPrompt && (
                <div className="rounded-lg border bg-card p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Generated Prompt</h2>
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
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
          <TabsContent value="showcase" className="space-y-6 focus-visible:outline-none">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div>
                <h2 className="text-2xl font-bold">Showcase</h2>
                <p className="text-muted-foreground">Inspiration des projets Vercel & Lovable.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." className="pl-9" value={showcaseSearch} onChange={(e) => setShowcaseSearch(e.target.value)} />
                </div>
                <select className="bg-secondary text-sm rounded-md px-3 border-none focus:ring-1 ring-primary" value={showcaseFilter} onChange={(e) => setShowcaseFilter(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="vercel">Vercel</option>
                  <option value="lovable">Lovable</option>
                </select>
              </div>
            </div>

            {loadingShowcase ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSites.map((site) => (
                  <Card key={site.id} className="group hover:border-primary/50 transition-all">
                    <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-bold truncate pr-2">{site.domain.split('.')[0]}</CardTitle>
                      <a href={`https://${site.domain}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-4 w-4" /></a>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground truncate flex-1">{site.domain}</span>
                      <Badge variant={site.platform === 'lovable' ? 'default' : 'secondary'} className="text-[9px] h-5">{site.platform}</Badge>
                    </CardContent>
                  </Card>
                ))}
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