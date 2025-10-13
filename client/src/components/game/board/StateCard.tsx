import { useTranslation } from "react-i18next";
import { useTextDirection } from "@/hooks/useTextDirection";

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
  isMyTurn: boolean,
  t: (key: string) => string
): React.ReactNode {
  if (isMyTurn)
    return (
      <span className="text-green-400 flex items-center gap-1.5 font-semibold text-sm">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />{" "}
        {t("stateCard.you")}
      </span>
    );
  if (playerName)
    return (
      <span className="text-blue-400 font-semibold text-sm truncate max-w-[100px]">
        {playerName}
      </span>
    );
  return (
    <span className="text-slate-500 text-sm">{t("stateCard.waiting")}</span>
  );
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
  const { t } = useTranslation();
  const direction = useTextDirection();

  return (
    <div className="md:flex-shrink-0 max-w-[100px] md:max-w-[160px] " dir={direction}>
      <div className="bg-background backdrop-blur-sm border border-slate-700 rounded-lg px-4 md:px-2 py-3 md:min-w-[160px]">
        {/* Current player indicator */}
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-2">
          <p className="text-xs text-slate-400 truncate max-w-[12ch]">{t("stateCard.current")}</p>
          {CurrentPlayerName(currentPlayer, isMyTurn, t)}
        </div>

        {/* Timer */}
        {timer !== null && timer !== undefined && (
          <div className="flex items-center justify-between gap-2 md:gap-4 mb-2">
            <p className="text-xs text-slate-400">{t("stateCard.time")}</p>
            <div
              className={`font-bold text-lg md:text-xl ${TimerStyle(timer, isMyTurn)}`}
            >
              {timer}s
            </div>
          </div>
        )}
        <div className="border-t border-slate-700 my-2" />
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <p className="text-xs text-slate-400">{t("stateCard.claim")}</p>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-foreground leading-none">
              {lastPlay?.claimedRank || "-"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {lastPlay?.cardCount || 0}{" "}
              {lastPlay?.cardCount === 1
                ? t("stateCard.card")
                : t("stateCard.cards")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateCard;
