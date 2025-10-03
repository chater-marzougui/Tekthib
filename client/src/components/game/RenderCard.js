import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Renders the suit symbols in a pattern based on the card's rank.
 * This function creates the classic playing card look.
 * @param {string} rank - The card's rank (e.g., 'A', '2', 'K').
 * @param {string} suitSymbol - The character for the suit (e.g., '♥').
 * @param {string} colorClass - The Tailwind CSS color class for the suit.
 * @returns {JSX.Element[]} An array of positioned JSX elements for the symbols.
 */
const renderSuitPatterns = (rank, suitSymbol, colorClass) => {
    const symbol = (className, key, isRotated = false) => (_jsx("div", { className: `absolute text-3xl ${colorClass} ${className} ${isRotated ? "rotate-180" : ""}`, children: suitSymbol }, key));
    // Reusable position classes for columns
    const positions = {
        topCenter: "top-5 left-1/2 -translate-x-1/2",
        midTopCenter: "top-1/4 left-1/2 -translate-x-1/2",
        center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        midBottomCenter: "bottom-1/4 left-1/2 -translate-x-1/2",
        bottomCenter: "bottom-5 left-1/2 -translate-x-1/2",
        topLeft: "top-5 left-4",
        topRight: "top-5 right-4",
        midTopLeft: "top-1/4 left-4",
        midTopRight: "top-1/4 right-4",
        bottomLeft: "bottom-5 left-4",
        bottomRight: "bottom-5 right-4",
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
                symbol(positions.center.replace("top-1/2", "top-1/2 -mt-8"), 3),
                symbol(positions.center.replace("top-1/2", "top-1/2 mt-8"), 4, true),
                symbol(positions.bottomLeft, 5, true),
                symbol(positions.bottomRight, 6, true),
            ];
        case "7":
            return [
                ...renderSuitPatterns("6", suitSymbol, colorClass),
                symbol(positions.midTopCenter, 7),
            ];
        case "8":
            return [
                ...renderSuitPatterns("7", suitSymbol, colorClass),
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
                symbol("bottom-1/4 left-4", 8, true),
                symbol("bottom-1/4 right-4", 9, true),
            ];
        case "10":
            return [
                ...renderSuitPatterns("8", suitSymbol, colorClass),
                symbol(positions.topLeft, 9),
                symbol(positions.bottomRight, 10, true),
            ];
        case "J":
        case "Q":
        case "K":
            // For face cards, you might want an image, but a large symbol works as a placeholder.
            return [symbol(`${positions.center} text-7xl`, 1)];
        default:
            return []; // Return nothing for ranks that don't have patterns
    }
};
const RenderCard = (card, isMyTurn, onCardSelect, isSelected, positionInHand) => {
    const getCardSymbol = (suit) => {
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
    const getCardColor = (suit) => {
        if (suit === "joker")
            return "text-purple-600";
        return suit === "hearts" || suit === "diamonds"
            ? "text-red-600"
            : "text-black";
    };
    // Calculate overlap offset for stacking
    const overlapOffset = positionInHand * 35; // 35px overlap between cards
    const suitSymbol = getCardSymbol(card.suit);
    const colorClass = getCardColor(card.suit);
    return (_jsx("div", { onClick: () => isMyTurn && onCardSelect(card.id), 
        // Removed absolute positioning from here to place it on the CardContent
        className: `transition-transform duration-300
        ${isMyTurn ? "cursor-pointer" : "cursor-not-allowed"}
        ${isSelected ? "z-0" : "z-10"}
      `, style: {
            position: "absolute",
            left: `${overlapOffset}px`,
            transform: isSelected ? "translateY(-40px)" : "translateY(0px)",
        }, children: _jsxs("div", { className: `
          relative w-24 h-36 rounded-lg shadow-md
          bg-slate-50 border transition-all duration-300
          ${isSelected
                ? "border-blue-500 shadow-blue-400/50"
                : "border-gray-400"}
          overflow-hidden
        `, children: [_jsxs("div", { className: "absolute top-1 left-2 flex flex-col items-center leading-none", children: [_jsx("div", { className: `text-xl font-bold ${colorClass}`, children: card.rank }), _jsx("div", { className: `text-2xl ${colorClass}`, children: suitSymbol })] }), renderSuitPatterns(card.rank, suitSymbol, colorClass), _jsxs("div", { className: "absolute bottom-1 right-2 flex flex-col items-center leading-none rotate-180", children: [_jsx("div", { className: `text-xl font-bold ${colorClass}`, children: card.rank }), _jsx("div", { className: `text-2xl ${colorClass}`, children: suitSymbol })] })] }) }, card.id));
};
const RenderOneHand = (cards, startIndex, isMyTurn, onCardSelect, selectedCards) => {
    const handCards = cards.slice(startIndex, startIndex + 14);
    const handWidth = handCards.length * 35 + 89; // overlap * count + card width
    return (_jsx("div", { className: "relative mb-4", style: {
            height: "180px",
            width: `${handWidth}px`,
            margin: "0 auto",
        }, children: handCards.map((card, idx) => {
            const isSelected = selectedCards.includes(card.id);
            return RenderCard(card, isMyTurn, onCardSelect, isSelected, idx);
        }) }, startIndex));
};
export default RenderOneHand;
