import type { JSX } from "react";
import type { DisplayGameCard, Rank } from "shared";

const specialCards = ["2", "3", "A", "J", "Q", "K"] as Rank[];
function isSpecialCard(rank: Rank) {
  return specialCards.includes(rank);
}

/**
 * Renders the suit symbols in a pattern based on the card's rank.
 * This function creates the classic playing card look.
 * @param {string} rank - The card's rank (e.g., 'A', '2', 'K').
 * @param {string} suitSymbol - The character for the suit (e.g., '♥').
 * @param {string} colorClass - The Tailwind CSS color class for the suit.
 * @returns {JSX.Element[]} An array of positioned JSX elements for the symbols.
 */
const renderSuitPatterns = (
  rank: Rank,
  suitSymbol: string,
  colorClass: string,
  cardKey: string,
  positionInHand?: number
): JSX.Element[] => {
  const symbol = (className: string, key: number, isRotated = false) => (
    <div
      key={`${cardKey}-${key}`}
      className={`absolute select-none ${colorClass} ${className} ${
        isRotated ? "rotate-180" : ""
      }`}
    >
      {suitSymbol}
    </div>
  );

  // Reusable position classes for columns
  const positions = {
    topCenter: "top-3 left-1/2 -translate-x-1/2 text-xl",
    midTopCenter: "top-1/4 left-1/2 -translate-x-1/2 text-xl",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl",
    midBottomCenter: "bottom-1/4 left-1/2 -translate-x-1/2 text-xl",
    bottomCenter: "bottom-3 left-1/2 -translate-x-1/2 text-xl",
    topLeft: "top-3 left-3 text-xl",
    topRight: "top-3 right-3 text-xl",
    midLeft: "top-1/2 left-3 -translate-y-1/2 text-xl",
    midRight: "top-1/2 right-3 -translate-y-1/2 text-xl",
    midTopLeft: "top-1/4 left-3 text-xl",
    midTopRight: "top-1/4 right-3 text-xl",
    bottomLeft: "bottom-3 left-3 text-xl",
    bottomRight: "bottom-3 right-3 text-xl",
  };

  switch (rank) {
    case "A":
      return [symbol(positions.center, 1)];
    case "2":
      return [
        symbol(positions.topCenter, 1),
        symbol(positions.bottomCenter, 2, true),
      ];
    case "3":
      return [
        symbol(positions.topCenter, 1),
        symbol(positions.center, 2),
        symbol(positions.bottomCenter, 3, true),
      ];
    case "4":
      return [
        symbol(positions.topLeft, 1),
        symbol(positions.topRight, 2),
        symbol(positions.bottomLeft, 3, true),
        symbol(positions.bottomRight, 4, true),
      ];
    case "5":
      return [
        symbol(positions.topLeft, 1),
        symbol(positions.topRight, 2),
        symbol(positions.center, 3),
        symbol(positions.bottomLeft, 4, true),
        symbol(positions.bottomRight, 5, true),
      ];
    case "6":
      return [
        symbol(positions.topLeft, 1),
        symbol(positions.topRight, 2),
        symbol(positions.midLeft, 3),
        symbol(positions.midRight, 4),
        symbol(positions.bottomLeft, 5, true),
        symbol(positions.bottomRight, 6, true),
      ];
    case "7":
      return [
        ...renderSuitPatterns("6", suitSymbol, colorClass, cardKey),
        symbol(positions.midTopCenter, 7),
      ];
    case "8":
      return [
        ...renderSuitPatterns("7", suitSymbol, colorClass, cardKey),
        symbol(positions.midBottomCenter, 8, true),
      ];
    case "9":
      return [
        symbol(positions.topLeft, 1),
        symbol(positions.topRight, 2),
        symbol(positions.midTopLeft, 3),
        symbol(positions.midTopRight, 4),
        symbol(positions.center, 5),
        symbol(positions.bottomLeft, 6, true),
        symbol(positions.bottomRight, 7, true),
        symbol("bottom-1/4 left-3 text-xl", 8, true),
        symbol("bottom-1/4 right-3 text-xl", 9, true),
      ];
    case "10":
      return [
        ...renderSuitPatterns("8", suitSymbol, colorClass, cardKey),
        symbol(positions.topLeft, 9),
        symbol(positions.bottomRight, 10, true),
      ];
    case "J":
    case "Q":
    case "K":
      // For face cards, you might want an image, but a large symbol works as a placeholder.
      return [symbol(`${positions.center} text-4xl`, 1)];
    case "Joker":
      // Joker gets a special image in the center
      return [
        <img
          key={`joker-${positionInHand}`}
          src="../icons/joker-smile.png"
          alt="Joker"
          className="absolute select-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 object-contain"
        />
      ];
    default:
      return []; // Return nothing for ranks that don't have patterns
  }
};

const RenderCard = (
  card: DisplayGameCard,
  isMyTurn: boolean,
  onCardSelect: (id: string) => void,
  isSelected: boolean,
  positionInHand: number,
) => {
  const getCardSymbol = (suit: DisplayGameCard["suit"]) => {
    switch (suit) {
      case "hearts":
        return "♥";
      case "diamonds":
        return "♦";
      case "clubs":
        return "♣";
      case "spades":
        return "♠";
      case "joker":
        return "🃏";
    }
  };

  const getCardColor = (suit: DisplayGameCard["suit"]) => {
    if (suit === "joker") return "text-purple-600";
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-black";
  };

  // Calculate overlap offset for stacking - reduced for smaller cards
  const overlapOffset = positionInHand * 25; // Reduced from 35px to 25px
  const suitSymbol = getCardSymbol(card.suit);
  const colorClass = getCardColor(card.suit);
  const isSpecial = isSpecialCard(card.rank);
  const key = card.rank+card.suit+card.deckNumber+positionInHand

  return (
    <div
      key={key}
      onClick={() => isMyTurn && onCardSelect(card.id)}
      className={`transition-transform duration-300 select-none
        ${isMyTurn ? "cursor-pointer" : "cursor-not-allowed"}
        ${isSelected ? "z-0" : "z-10"}
      `}
      style={{
        position: "absolute",
        left: `${overlapOffset}px`,
        transform: isSelected ? "translateY(-30px)" : "translateY(0px)", // Reduced from 40px to 30px
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
      onDragStart={(e) => e.preventDefault()} // Prevent drag ghost image
    >
      <div
        className={`
          relative w-20 h-28 rounded-md shadow-md select-none
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
          <div className={`text-sm font-bold ${colorClass} select-none`}>{card.rank}</div> {/* Smaller text */}
          {isSpecial && <div className={`text-lg ${colorClass} select-none`}>{suitSymbol}</div>} {/* Smaller icon */}
        </div>

        {/* The new suit patterns rendered in the center */}
        {renderSuitPatterns(card.rank, suitSymbol, colorClass, key, positionInHand)}

        {/* Bottom right corner (rotated) */}
        <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 select-none">
          <div className={`text-sm font-bold ${colorClass} select-none`}>{card.rank}</div> {/* Smaller text */}
          {isSpecial && <div className={`text-lg ${colorClass} select-none`}>{suitSymbol}</div>} {/* Smaller icon */}
        </div>
      </div>
    </div>
  );
};

const RenderOneHand = (
  cards: DisplayGameCard[],
  startIndex: number,
  isMyTurn: boolean,
  onCardSelect: (id: string) => void,
  selectedCards: string[],
  maxCardsPerHand: number
) => {
  const handCards = cards.slice(startIndex, startIndex + maxCardsPerHand);
  const handWidth = handCards.length * 25 + 69; // Reduced overlap * count + smaller card width

  return (
    <div
      key={startIndex}
      className="relative mb-3 select-none" // Reduced margin
      style={{
        height: "140px", // Reduced height
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
        return RenderCard(card, isMyTurn, onCardSelect, isSelected, idx);
      })}
    </div>
  );
};

export default RenderOneHand;