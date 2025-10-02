import { Card, CardContent } from "../ui/card";
interface GameCard {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades" | "joker";
  rank: string;
  selected: boolean;
}

const RenderCard = (
  card: GameCard,
  isMyTurn: boolean,
  onCardSelect: (id: string) => void,
  isSelected: boolean,
  positionInHand: number
) => {
  const getCardSymbol = (suit: GameCard["suit"]) => {
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

  const getCardColor = (suit: GameCard["suit"]) => {
    if (suit === "joker") return "text-purple-600";
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-black";
  };

  // Calculate overlap offset for stacking
  const overlapOffset = positionInHand * 35; // 35px overlap between cards

  return (
    <Card
      key={card.id}
      onClick={() => isMyTurn && onCardSelect(card.id)}
      className={`absolute z-10 
        ${isMyTurn ? "cursor-pointer hover:z-50" : "cursor-not-allowed"}
      `}
      style={{
        left: `${overlapOffset}px`,
        transform: isSelected ? "translateY(-40px)" : "translateY(0px)",
      }}
    >
      {/* Selected glow effect */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-400 rounded-lg blur-md opacity-50" />
      )}

      {/* The actual card */}
      <CardContent
        className={`
          relative w-24 h-36 rounded-lg shadow-lg
          bg-white border-2 transition-all duration-300
          ${
            isSelected
              ? "border-blue-500 shadow-blue-500/50"
              : "border-gray-300"
          }
          overflow-hidden
        `}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg z-10">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Top left corner */}
        <div className="absolute top-2 left-2 flex flex-col items-center leading-none">
          <div className={`text-lg font-bold ${getCardColor(card.suit)}`}>
            {card.rank}
          </div>
          <div className={`text-xl ${getCardColor(card.suit)}`}>
            {getCardSymbol(card.suit)}
          </div>
        </div>

        {/* Center symbol */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-6xl ${getCardColor(card.suit)}`}>
            {getCardSymbol(card.suit)}
          </div>
        </div>

        {/* Bottom right corner (rotated) */}
        <div className="absolute bottom-2 right-2 flex flex-col items-center leading-none rotate-180">
          <div className={`text-lg font-bold ${getCardColor(card.suit)}`}>
            {card.rank}
          </div>
          <div className={`text-xl ${getCardColor(card.suit)}`}>
            {getCardSymbol(card.suit)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RenderHand = (
  cards: GameCard[],
  startIndex: number,
  isMyTurn: boolean,
  onCardSelect: (id: string) => void,
  selectedCards: string[]
) => {
  const handCards = cards.slice(startIndex, startIndex + 14);
  const handWidth = handCards.length * 35 + 89; // overlap * count + card width

  return (
    <div
      className="relative mb-4"
      style={{
        height: "180px",
        width: `${handWidth}px`,
        margin: "0 auto",
      }}
    >
      {handCards.map((card, idx) => {
        const isSelected = selectedCards.includes(card.id);
        return RenderCard(card, isMyTurn, onCardSelect, isSelected, idx);
      })}
    </div>
  );
};

export default RenderHand;
