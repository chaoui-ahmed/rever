import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, Globe, Loader2 } from "lucide-react";
import SiteTimeMachine from "@/components/SiteTimeMachine";

interface Site {
  id: number;
  domain: string;
  platform: string;
  image_url?: string; // Ajoute cette ligne !
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

const Showcase = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("discovered_sites")
        .select("*"); // Plus de .order() pour l'aléatoire
      
      if (error) throw error;
      if (data) {
        // Randomisation immédiate des sites récupérés
        setSites(shuffleArray(data));
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des sites:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter((site) => {
    const matchesFilter = filter === "all" || site.platform.toLowerCase() === filter.toLowerCase();
    const matchesSearch = site.domain.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center mb-12 text-center max-w-3xl mx-auto">
        <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs tracking-widest uppercase border-white/10 bg-white/5 backdrop-blur-md">
          Discovery Archive
        </Badge>
        <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white/80 to-white/20">
          Explorateur de Projets
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl font-light max-w-2xl">
          Découvrez les dernières pépites créées sur Vercel et Lovable. Une source d'inspiration pour vos futurs rêves.
        </p>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row gap-4 justify-between items-center w-full max-w-4xl mb-8 bg-card/50 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-2xl">
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-3 md:w-[400px] bg-black/20">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="vercel">Vercel</TabsTrigger>
            <TabsTrigger value="lovable">Lovable</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un domaine..." 
            className="pl-12 bg-black/20 border-white/5 focus-visible:ring-1 focus-visible:ring-primary h-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="w-full max-w-6xl relative z-10 mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground tracking-widest text-sm uppercase">Chargement des pépites en cours...</p>
          </div>
        ) : filteredSites.length > 0 ? (
          <div className="space-y-32">
            <SiteTimeMachine sites={filteredSites} />

            <div className="w-full max-w-4xl mx-auto border-t border-white/5 pt-16 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex items-center justify-between mb-10 px-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.25em] opacity-40">Discovery Index</h3>
                <span className="text-[10px] font-mono text-muted-foreground/30">{filteredSites.length} entrées</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredSites.map((site) => (
                  <a
                    key={site.id}
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-white/[0.015] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all group"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
                      </div>
                      <span className="text-sm font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">
                        {site.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-[9px] h-4 px-2 border-white/5 bg-white/[0.02] text-muted-foreground/40 uppercase font-black tracking-tighter">
                        {site.platform}
                      </Badge>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/10 group-hover:text-primary transition-all" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-card/20 backdrop-blur-sm">
            <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Aucun résultat trouvé</h3>
            <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou votre recherche.</p>
          </div>
        )}
      </div>

      {false && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSites.map((site) => (
            <Card key={site.domain}>
              <CardHeader>
                <CardTitle>{site.domain}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Showcase;