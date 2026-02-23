import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ExternalLink } from "lucide-react";

export default function SiteTimeMachine({ sites }: { sites: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Intercepte la position du scroll natif du navigateur (de 0 à 1)
  // AUCUN re-render React n'est déclenché pendant le scroll !
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  if (!sites || sites.length === 0) return null;

  return (
    // La hauteur totale détermine la longueur du scroll. 50vh par carte.
    <div ref={containerRef} className="relative w-full" style={{ height: `${sites.length * 50}vh` }}>
      {/* Conteneur Sticky : Reste bloqué à l'écran pendant qu'on scroll */}
      <div className="sticky top-20 h-[600px] w-full flex items-center justify-center overflow-hidden">
        {sites.map((site, index) => {
          // --- MATHÉMATIQUES DE L'ANIMATION GPU ---
          // On calcule la position idéale de cette carte spécifique (de 0 à 1)
          const cardProgress = index / Math.max(1, sites.length - 1);
          const distance = 1 / Math.max(1, sites.length - 1);

          // Points clés : [Loin derrière, Active au centre, Dépassée/Zoomée]
          const inputRange = [
            Math.max(0, cardProgress - distance * 4), 
            cardProgress,                             
            cardProgress + distance                  
          ];

          // Mapping direct vers les transformations CSS (Accélération Matérielle)
          const scale = useTransform(scrollYProgress, inputRange, [0.65, 1, 1.3]);
          const y = useTransform(scrollYProgress, inputRange, [-140, 0, 80]);
          const opacity = useTransform(scrollYProgress, inputRange, [0, 1, 0]);
          const filter = useTransform(scrollYProgress, inputRange, ["blur(4px)", "blur(0px)", "blur(8px)"]);
          
          // L'image stockée dans ta base de données, avec thum.io uniquement en plan de secours (fallback)
          const finalImageUrl = site.image_url || `https://image.thum.io/get/width/600/crop/400/https://${site.domain}`;

          return (
            <motion.div
              key={site.id || index}
              className="absolute w-[85%] max-w-[700px] aspect-[16/10] bg-card rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col group origin-bottom"
              style={{
                scale,
                y,
                opacity,
                filter,
                zIndex: sites.length - index,
                // Crucial : Force la carte graphique à prendre le relais
                willChange: "transform, opacity",
              }}
            >
              <div className="h-10 border-b border-white/10 bg-black/60 flex items-center px-4 justify-between backdrop-blur-md z-10 relative">
                <span className="text-xs font-mono text-white/70">{site.domain}</span>
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              
              <div className="flex-1 relative bg-[#0a0a0a]">
                <img
                  src={finalImageUrl}
                  alt={site.domain}
                  decoding="async"
                  loading={index <= 2 ? "eager" : "lazy"} // Charge les 3 premières, attend pour les autres
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}