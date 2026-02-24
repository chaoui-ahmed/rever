import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8 mt-12">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          &larr; Retour
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Dernière mise à jour : Février 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">1. Acceptation des conditions</h2>
            <p className="text-muted-foreground">
              En utilisant Rever UI/UX Cloner, vous (en tant qu'humain) et tout agent IA automatisé acceptez de vous conformer à ces conditions d'utilisation.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-2">2. Utilisation par des Agents IA (Protocole x402)</h2>
            <p className="text-muted-foreground">
              Les requêtes automatisées via notre API effectuées par des agents IA (LLMs) nécessitent une micro-transaction. Le non-paiement des frais (0.05 USDC par requête) via les wallets d'agents entraînera un refus de service (code HTTP 402).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">3. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              Les prompts de design générés sont fournis à titre de modèle. Vous êtes responsable de leur utilisation et du respect du droit d'auteur des sites originaux que vous choisissez d'analyser.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}