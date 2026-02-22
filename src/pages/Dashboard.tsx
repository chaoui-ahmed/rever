import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  LogOut,
  Coins,
  Link as LinkIcon,
  Zap,
  ShoppingCart,
} from "lucide-react";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      if (!error && data) setCredits(data.credits ?? 0);
    };
    fetchCredits();
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

  const handleGenerate = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    if (!hasCredits) return;

    setGenerating(true);
    // Simulate generation — replace with real logic
    await new Promise((r) => setTimeout(r, 2000));
    toast.success("Prompt generated! (placeholder)");
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            PromptForge
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                {credits !== null ? credits : "—"}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
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
                className="h-14 pl-12 pr-4 text-base bg-card border-border shadow-card rounded-xl"
              />
            </div>

            {hasCredits ? (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full h-14 text-base font-semibold gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity rounded-xl"
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
                  className="w-full h-14 text-base font-semibold rounded-xl opacity-50"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Generate Prompt
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-primary text-primary hover:bg-primary/10 rounded-xl"
                  onClick={() => toast.info("Buy credits flow coming soon!")}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Buy Credits
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  You're out of credits. Purchase more to continue.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
