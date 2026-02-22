import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, Globe, Loader2 } from "lucide-react";

interface Site {
  id: number;
  domain: string;
  platform: string;
}

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
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setSites(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des sites:", err);
    } finally {
      setLoading(false);
    }
  };

  // Logique de filtrage combinée (Plateforme + Recherche)
  const filteredSites = sites.filter((site) => {
    const matchesFilter = filter === "all" || site.platform.toLowerCase() === filter.toLowerCase();
    const matchesSearch = site.domain.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <div className="flex flex-col items-center mb-12 text-center">
        <Badge variant="outline" className="mb-4 px-3 py-1 text-primary border-primary/30 bg-primary/5">
          Discovery Mode
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
          Explorateur de Projets
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Découvrez les dernières pépites créées sur Vercel et Lovable. Une source d'inspiration pour vos futurs rêves.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="vercel">Vercel</TabsTrigger>
            <TabsTrigger value="lovable">Lovable</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un domaine..." 
            className="pl-10 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">Chargement des pépites en cours...</p>
        </div>
      ) : filteredSites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSites.map((site) => (
            <Card key={site.domain} className="group hover:border-primary/50 hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-secondary rounded-lg group-hover:bg-primary/10 transition-colors">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-bold truncate max-w-[150px]">
                    {site.domain.split('.')[0]}
                  </CardTitle>
                </div>
                <a 
                  href={`https://${site.domain}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-secondary rounded-md transition-colors"
                  title="Ouvrir le site"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </a>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground truncate mb-4 font-mono">
                  {site.domain}
                </p>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={site.platform.toLowerCase() === 'lovable' ? 'default' : 'secondary'}
                    className="text-[10px] px-2 py-0 capitalize font-medium"
                  >
                    {site.platform}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground/60 italic">
                    Découvert récemment
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Aucun résultat trouvé</h3>
          <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou votre recherche.</p>
        </div>
      )}
    </div>
  );
};

export default Showcase;