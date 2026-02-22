import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
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
  RefreshCw,
} from "lucide-react";
import reverLogo from "@/assets/rever-logo.png";
import UserMenu from "@/components/UserMenu";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCredits = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();
    if (!error && data) setCredits(data.credits ?? 0);
  };

  useEffect(() => {
    if (!user) return;
    fetchCredits();

    // Realtime listener for credit updates
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
          setCredits((payload.new as { credits: number }).credits ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const hasCredits = credits !== null && credits > 0;

  const handlePurchase50 = () => {
    const stripeUrl = "https://buy.stripe.com/cNi5kCgI4a5XbiWbqsawo00";
    const params = new URLSearchParams({
      client_reference_id: user.id,
      prefilled_email: user.email ?? "",
    });
    window.location.href = `${stripeUrl}?${params.toString()}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCredits();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    if (!hasCredits) return;

    setGenerating(true);
    setGeneratedPrompt(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-prompt", {
        body: { url: url.trim() },
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

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <img src={reverLogo} alt="REVER" className="h-6" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                {credits !== null ? credits : "—"}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <UserMenu
              credits={credits}
              refreshing={refreshing}
              onRefreshCredits={handleRefresh}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-2xl space-y-8 -mt-20">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Generate a Prompt
            </h1>
            <p className="text-muted-foreground text-lg">
              Paste any URL and we'll craft the perfect prompt for it.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-14 pl-12 pr-4 text-base bg-card border-border rounded-lg"
              />
            </div>

            {hasCredits ? (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg"
              >
                {generating ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Zap className="h-5 w-5 mr-2" />
                )}
                {generating ? "Generating…" : "Generate Prompt"}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  disabled
                  className="w-full h-14 text-base font-semibold rounded-lg opacity-50"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Generate Prompt
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  You're out of credits.{" "}
                  <button
                    onClick={handlePurchase50}
                    className="text-primary underline hover:text-primary/80"
                  >
                    Purchase more
                  </button>{" "}
                  to continue.
                </p>
              </div>
            )}
          </div>

          {/* Generated Prompt Result */}
          {generatedPrompt && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Generated Prompt
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
                {generatedPrompt}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
