import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@shared";
import { RenderCard } from "../RenderCard";

interface CenterPileProps {
  removedCards: Card[];
  // Add any props if needed in the future
}

const WastedPile: React.FC<CenterPileProps> = ({ removedCards }) => {
  const { t } = useTranslation();

  // Get unique ranks from removed cards (one card per four-of-a-kind)
  const uniqueRemovedRanks = useMemo(() => {
    return getUniqueRemovedRanks(removedCards);
  }, [removedCards.length]);

  // Generate stable random rotations based on card IDs
  const cardRotations = useMemo(() => {
    return uniqueRemovedRanks.map((card) => {
      // Use card ID to generate a stable "random" offset
      const seed = card.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return (seed % 100) / 10 - 5; // Returns value between -5 and 5
    });
  }, [uniqueRemovedRanks.length]);

  function getUniqueRemovedRanks(removedCards: Card[]): Card[] {
    const result: Card[] = [];

    // Group cards by rank
    const grouped = removedCards.reduce<Record<string, Card[]>>((acc, card) => {
      if (!acc[card.rank]) acc[card.rank] = [];
      acc[card.rank].push(card);
      return acc;
    }, {});

    // For each rank, pick 1 or 2 representatives based on count
    Object.values(grouped).forEach((cards) => {
      if (cards.length === 4) {
        const randomCard =
          cards[(cards[0].rank.charCodeAt(0) + 1) % cards.length];
        result.push(randomCard);
      } else if (cards.length === 8) {
        const randomCard1 =
          cards[(cards[0].rank.charCodeAt(0) + 1) % cards.length];
        const randomCard2 =
          cards[(cards[4].rank.charCodeAt(0) + 2) % cards.length];
        result.push(randomCard1, randomCard2);
      }
    });
    return result;
  }

  if (removedCards.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 flex justify-center md:justify-end md:w-[160px]">
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2 text-center">
          {t("game.outOfGame")}
        </p>
        <div className="relative h-32 w-32 md:h-40 md:w-40">
          {uniqueRemovedRanks.slice(0, 8).map((card, i) => {
            const totalCards = Math.min(uniqueRemovedRanks.length, 12);
            const angle = (i / totalCards) * Math.PI * 2 - Math.PI / 2;
            const radius = 18;

            const offsetX = Math.cos(angle) * radius;
            const offsetY = Math.sin(angle) * radius;

            const rotation = (i * 360) / totalCards - 15 + cardRotations[i];

            const isRecent = i >= totalCards - 8;
            const scale = isRecent ? 1 : 0.85;
            const zIndex = isRecent ? totalCards + i : i;

            return (
              <motion.div
                key={`removed-${card.id}`}
                initial={{
                  opacity: 0,
                  scale: 0.3,
                  rotate: rotation + 180,
                }}
                animate={{
                  opacity: isRecent ? 1 : 0.7,
                  scale: scale,
                  rotate: rotation,
                }}
                transition={{
                  delay: i * 0.08,
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                }}
                className="absolute w-12 h-18 md:w-16 md:h-24"
                style={{
                  top: `calc(25% + ${offsetY}px)`,
                  left: `calc(25% + ${offsetX}px)`,
                  transform: `translate(-50%, -50%)`,
                  zIndex: zIndex,
                }}
              >
                {RenderCard(card, false, () => {}, false, 1, "small")}
              </motion.div>
            );
          })}

          {/* Counter badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full w-11 h-11 md:w-14 md:h-14 flex items-center justify-center font-bold border-3 border-white shadow-xl z-50"
          >
            <div className="text-center">
              <div className="text-sm md:text-lg leading-none">
                {uniqueRemovedRanks.length}
              </div>
              <div className="text-[8px] md:text-[10px] leading-none opacity-90">
                {t("game.sets")}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WastedPile;
