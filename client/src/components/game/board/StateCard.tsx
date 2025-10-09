interface StateCardProps {
  isMyTurn: boolean;
  currentPlayer: string | null;
  timer: number | null;
  lastPlay: {
    claimedRank: string;
    cardCount: number;
  } | null;
}

function CurrentPlayerName(
  playerName: string | null,
  isMyTurn: boolean
): React.ReactNode {
  if (isMyTurn)
    return (
      <span className="text-green-400 flex items-center gap-1.5 font-semibold text-sm">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> You
      </span>
    );
  if (playerName)
    return (
      <span className="text-blue-400 font-semibold text-sm truncate max-w-[100px]">
        {playerName}
      </span>
    );
  return <span className="text-slate-500 text-sm">Waiting...</span>;
}

function TimerStyle(timer: number, isMyTurn: boolean): string {
  if (timer <= 5) return "text-red-400 animate-pulse";
  if (isMyTurn) return "text-amber-400";
  return "text-slate-300";
}

const StateCard: React.FC<StateCardProps> = ({
  isMyTurn,
  currentPlayer,
  timer,
  lastPlay,
}) => {
  return (
    <div className="md:flex-shrink-0  max-w-[150px]  md:max-w-[200px]">
      <div className="bg-foreground backdrop-blur-sm border border-slate-700 rounded-lg px-4 md:px-6 py-3 md:min-w-[200px]">
        {/* Current player indicator */}
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-2">
          <p className="text-xs text-slate-400">Current</p>
          {CurrentPlayerName(currentPlayer, isMyTurn)}
        </div>

        {/* Timer */}
        {timer !== null && timer !== undefined && (
          <div className="flex items-center justify-between gap-2 md:gap-4 mb-2">
            <p className="text-xs text-slate-400">Time</p>
            <div
              className={`font-bold text-lg md:text-xl ${TimerStyle(timer, isMyTurn)}`}
            >
              {timer}s
            </div>
          </div>
        )}
        <div className="border-t border-slate-700 my-2" />
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <p className="text-xs text-slate-400">Claim</p>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-background leading-none">
              {lastPlay?.claimedRank || "-"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {lastPlay?.cardCount || 0} {lastPlay?.cardCount === 1 ? "card" : "cards"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateCard;
