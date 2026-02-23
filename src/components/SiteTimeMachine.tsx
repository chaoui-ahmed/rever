import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { useShortcuts, clamp } from "@/hooks/use-shortcut"

const FRAME_OFFSET = -40
const FRAMES_VISIBLE_LENGTH = 4
const SCROLL_THRESHOLD = 40
// On réduit un peu le buffer pour soulager la RAM et le DOM
const BUFFER_SIZE = 4 

export default function SiteTimeMachine({ sites }: { sites: any[] }) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollAccumulator = React.useRef(0)
  const lastUpdateTime = React.useRef(Date.now())
  const touchStartY = React.useRef(0)

  // 1. MISE EN CACHE (Memoization) DES DONNÉES ET URLs
  // On pré-calcule les URLs avec une résolution plus faible (600x400 au lieu de 800x600)
  // pour drastiquement accélérer le téléchargement et le rendu.
  const cachedSites = useMemo(() => {
    if (!sites) return [];
    return sites.map(site => ({
      ...site,
      screenshotUrl: `https://image.thum.io/get/width/600/crop/400/https://${site.domain}`
    }));
  }, [sites]);

  const getVisibleCards = React.useCallback(() => {
    if (!cachedSites || cachedSites.length === 0) return []
    const start = currentIndex - BUFFER_SIZE
    const end = currentIndex + FRAMES_VISIBLE_LENGTH + BUFFER_SIZE
    const cards = []

    for (let i = start; i <= end; i++) {
      cards.push({
        index: i,
        siteIndex: ((i % cachedSites.length) + cachedSites.length) % cachedSites.length,
      })
    }
    return cards
  }, [currentIndex, cachedSites])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // On augmente légèrement l'intervalle pour éviter le spam de rendus React lors d'un scroll violent
    const MIN_UPDATE_INTERVAL = 80 

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      scrollAccumulator.current += e.deltaY
      const now = Date.now()
      if (Math.abs(scrollAccumulator.current) >= SCROLL_THRESHOLD) {
        if (now - lastUpdateTime.current >= MIN_UPDATE_INTERVAL) {
          const delta = scrollAccumulator.current > 0 ? 1 : -1
          setCurrentIndex((prev) => prev + delta)
          scrollAccumulator.current = 0
          lastUpdateTime.current = now
        }
      }
    }

    const handleTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touchY = e.touches[0].clientY
      scrollAccumulator.current += touchStartY.current - touchY
      touchStartY.current = touchY
      const now = Date.now()
      if (Math.abs(scrollAccumulator.current) >= SCROLL_THRESHOLD) {
        if (now - lastUpdateTime.current >= MIN_UPDATE_INTERVAL) {
          const delta = scrollAccumulator.current > 0 ? 1 : -1
          setCurrentIndex((prev) => prev + delta)
          scrollAccumulator.current = 0
          lastUpdateTime.current = now
        }
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    container.addEventListener("touchstart", handleTouchStart, { passive: false })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  useShortcuts({
    ArrowRight: () => setCurrentIndex((prev) => prev + 1),
    ArrowLeft: () => setCurrentIndex((prev) => prev - 1),
  })

  if (!cachedSites || cachedSites.length === 0) return null;
  const visibleCards = getVisibleCards()

  return (
    <div ref={containerRef} className="relative w-full h-[600px] flex items-center justify-center overflow-hidden cursor-ns-resize">
      <div className="relative w-full h-full flex items-center justify-center">
        {visibleCards.map((card) => {
          const offsetIndex = card.index - currentIndex
          const blur = currentIndex > card.index ? 2 : 0
          const opacity = currentIndex > card.index ? 0 : 1
          const scale = clamp(1 - offsetIndex * 0.08, [0.08, 2])
          const y = clamp(offsetIndex * FRAME_OFFSET, [FRAME_OFFSET * FRAMES_VISIBLE_LENGTH, Number.POSITIVE_INFINITY])

          const site = cachedSites[card.siteIndex]
          const isVisible = offsetIndex < FRAMES_VISIBLE_LENGTH

          return (
            <motion.div
              key={card.index}
              className="absolute w-[85%] max-w-[700px] aspect-[16/10] bg-card rounded-xl overflow-hidden shadow-2xl border border-border/50 flex flex-col group"
              initial={false}
              animate={{
                y, scale,
                transition: { type: "spring", stiffness: 250, damping: 20, mass: 0.5 },
              }}
              style={{
                willChange: "transform", // On retire filter et opacity du willChange pour économiser la VRAM GPU
                filter: `blur(${blur}px)`,
                opacity,
                zIndex: 1000 - card.index,
              }}
            >
               <div className="h-10 border-b border-border/50 bg-secondary/50 flex items-center px-4 justify-between backdrop-blur-sm z-10">
                  <span className="text-xs font-mono text-muted-foreground">{site.domain}</span>
                  <a href={`https://${site.domain}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink size={14} />
                  </a>
               </div>
              <div className="flex-1 relative bg-black/50 overflow-hidden">
                {/* 2. OPTIMISATION DU DÉCODAGE D'IMAGE */}
                {isVisible && (
                   <img 
                      src={site.screenshotUrl} 
                      alt={site.domain} 
                      decoding="async" // CRUCIAL : Empêche le décodage de l'image de bloquer l'animation de défilement
                      loading={offsetIndex <= 1 ? "eager" : "lazy"} // Charge immédiatement la 1ère, lazy load le reste
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                   />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}