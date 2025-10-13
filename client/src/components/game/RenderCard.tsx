import type { JSX } from "react";
import type { Card, DisplayGameCard, Rank } from "shared";
import { BASE_PREFIX, CardsSizes } from "@/types/config";

// Preload all card images on app initialization
const preloadCardImages = () => {
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  
  ranks.forEach(rank => {
    suits.forEach(suit => {
      const img = new Image();
      img.src = `${BASE_PREFIX}/cards/${rank}_${suit}.png`;
    });
  });
  
  // Preload joker assets
  const jokerStatic = new Image();
  jokerStatic.src = `${BASE_PREFIX}/icons/joker-smile.png`;
  const jokerGif = new Image();
  jokerGif.src = `${BASE_PREFIX}/icons/joker-smile.gif`;
};

// Call this once when your app loads (e.g., in App.tsx or main component)
export const initializeCardImages = () => {
  preloadCardImages();
};

/**
 * Renders the Joker card with interactive gif animation
 */
const renderJokerCard = (
  positionInHand: number,
  cardSize: string,
  isSelected: boolean,
  colorClass: string = "text-purple-600"
): JSX.Element => {
  return (
    <div
      className={`
        relative ${cardSize} rounded-md shadow-md select-none
        bg-slate-50 border transition-all duration-300
        ${
          isSelected
            ? "border-blue-500 shadow-blue-400/50"
            : "border-gray-400"
        }
        overflow-hidden
      `}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      {/* Top left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none select-none">
        <div
          className={`text-sm font-bold ${colorClass} select-none flex flex-col items-center`}
        >
          {"Joker".split("").map((char, i) => (
            <span key={i + 1} className="m-0 p-0" style={{ lineHeight: 0.8 }}>
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* Joker GIF in center */}
      <img
        key={`joker-${positionInHand}`}
        src={`${BASE_PREFIX}/icons/joker-smile.png`}
        alt="Joker"
        className="absolute select-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 object-contain transition-opacity duration-200"
        onPointerEnter={(e) => {
          e.currentTarget.src = `${BASE_PREFIX}/icons/joker-smile.gif`;
        }}
        onPointerLeave={(e) => {
          e.currentTarget.src = `${BASE_PREFIX}/icons/joker-smile.png`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.src = `${BASE_PREFIX}/icons/joker-smile.png`;
        }}
        onDragLeave={(e) => {
          e.currentTarget.src = `${BASE_PREFIX}/icons/joker-smile.png`;
        }}
        onTouchEnd={(e) => {
          e.currentTarget.src = `${BASE_PREFIX}/icons/joker-smile.png`;
        }}
        onPointerOut={(e) => {
          e.currentTarget.src = `${BASE_PREFIX}/icons/joker-smile.png`;
        }}
      />

      {/* Bottom right corner (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 select-none">
        <div
          className={`text-sm font-bold ${colorClass} select-none flex flex-col items-center`}
        >
          {"Joker".split("").map((char, i) => (
            <span key={i + 1} className="m-0 p-0" style={{ lineHeight: 0.8 }}>
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};


export const RenderCard = (
  card: Card,
  isMyTurn: boolean,
  onCardSelect: (id: string) => void,
  isSelected: boolean,
  positionInHand: number,
  size: "small" | "large" | "medium" | "xlarge" = "xlarge"
) => {
  const cardSize = CardsSizes[size];
  const key = card.rank + card.suit + card.deckNumber + positionInHand;

  // Handle Joker separately with the custom design
  const isJoker = card.rank === "Joker";
  
  return (
    <button
      key={key}
      onClick={() => isMyTurn && onCardSelect(card.id)}
      className={`transition-transform duration-300 select-none
        ${isMyTurn ? "cursor-pointer" : "cursor-not-allowed"}
        ${isSelected ? "z-0" : "z-10"}
      `}
      style={{
        position: "absolute",
        left: `${positionInHand * cardSize.overlapOffset}px`,
        transform: isSelected
          ? `translateY(${cardSize.YTranslation}px)`
          : "translateY(0px)",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
      onDragStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isJoker ? (
        renderJokerCard(positionInHand, cardSize.cardSize, isSelected)
      ) : (
        <div
          className={`
            relative ${cardSize.cardSize} rounded-md shadow-md select-none
            border transition-all duration-300
            ${
              isSelected
                ? "border-blue-500 shadow-blue-400/50"
                : "border-gray-400"
            }
            overflow-hidden
          `}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {/* Card image fills the entire card */}
          <img
            src={`${BASE_PREFIX}/cards/${card.rank}_${card.suit}.png`}
            alt={`${card.rank} of ${card.suit}`}
            className="absolute inset-0 w-full h-full object-cover select-none"
            draggable={false}
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
          />
        </div>
      )}
    </button>
  );
};

const RenderOneHand = (
  cards: DisplayGameCard[],
  startIndex: number,
  isMyTurn: boolean,
  onCardSelect: (id: string) => void,
  selectedCards: string[],
  maxCardsPerHand: number,
  cardSize: "small" | "large" | "medium" | "xlarge" = "xlarge"
) => {
  const handCards = cards.slice(startIndex, startIndex + maxCardsPerHand);
  const offset = CardsSizes[cardSize].overlapOffset;
  const handWidth = handCards.length * offset + 69;

  return (
    <div
      key={startIndex}
      className="relative mb-3 select-none"
      style={{
        height: "140px",
        width: `${handWidth}px`,
        margin: "0 auto",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      {handCards.map((card, idx) => {
        const isSelected = selectedCards.includes(card.id);
        return RenderCard(card, isMyTurn, onCardSelect, isSelected, idx, cardSize);
      })}
    </div>
  );
};

export default RenderOneHand;