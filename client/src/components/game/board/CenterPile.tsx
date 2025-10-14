import { useTranslation } from "react-i18next";
import { LastPlay } from "@shared";
import { AnimatePresence, motion } from "framer-motion";
import { RenderUnknownCard } from "@/components/game/RenderUnknownCard";

interface CenterPileProps {
  pileCount: number;
  lastPlay: LastPlay | null;
}

const CenterPile: React.FC<CenterPileProps> = ({ pileCount, lastPlay }) => {
  const { t } = useTranslation();
  
  if (!lastPlay) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="center-pile-container text-4xl mb-2">🃏</div>
        <div className="text-base md:text-lg">{t('centerPile.waitingForFirstPlay')}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center center-pile-container">
      <div className="flex-shrink-0">
        <p className="text-xs font-semibold text-gray-600 mb-2 text-center">
          {t('centerPile.title')}
        </p>
        <div className="relative h-36 w-28">
          <AnimatePresence>
            {Array.from({ length: Math.min(pileCount, 6) }).map((_, i) => {
              const rotation = Math.sin(i) * 15 - 7.5;
              const offsetX = Math.cos(i * 1.5) * 8;

              return (
                <motion.div
                  key={`pile-card-${i+1}`}
                  initial={{
                    opacity: 0,
                    scale: 0.5,
                    y: -100,
                    rotate: 0,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    rotate: rotation,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.5,
                    y: 100,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="absolute w-12 h-18 bg-white rounded-sm"
                  style={{
                    top: `${i * 3}px`,
                    left: `calc(25% - ${offsetX}px)`,
                    transform: `translateX(-50%)`,
                    zIndex: i
                  }}
                >
                  {RenderUnknownCard("default")}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {pileCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-0 right-0 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20"
            >
              {pileCount}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CenterPile;