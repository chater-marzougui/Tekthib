import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { PlayerStats } from "shared";
import type { GameState } from "@/types";

interface EndGameDialogProps {
  open: boolean;
  winners: string[];
  loser: string;
  playerStats?: Record<string, PlayerStats>;
  gameState: GameState | null;
  currentPlayerId: string;
  onClose: () => void;
  handlePlayAgain: () => void;
}

function calculateTitles(
  playerStats: Record<string, PlayerStats>,
  playerId: string,
  isLoser: boolean,
  t: (key: string) => string
): string[] {
  const titles: string[] = [];
  const stats = playerStats[playerId];

  if (!stats) return [t("endgame:titles.rookie")];

  // Find the maximum values across all players for each stat
  const allStats = Object.values(playerStats);
  const maxFalseAccusations = Math.max(
    ...allStats.map((s) => s.timesFalselyAccused)
  );
  const maxSuccessfulBluffs = Math.max(
    ...allStats.map((s) => s.timesBluffedSuccessfully)
  );
  const maxTruthful = Math.max(...allStats.map((s) => s.timesToldTruth));
  const maxCaughtBluffing = Math.max(
    ...allStats.map((s) => s.timesCaughtBluffing)
  );

  // Count how many players share each maximum (for ties)
  const falseAccusersCount = allStats.filter(
    (s) => s.timesFalselyAccused === maxFalseAccusations
  ).length;
  const masterLiarsCount = allStats.filter(
    (s) => s.timesBluffedSuccessfully === maxSuccessfulBluffs
  ).length;
  const saintsCount = allStats.filter(
    (s) => s.timesToldTruth === maxTruthful
  ).length;
  const detectivesCount = allStats.filter(
    (s) => s.timesCaughtBluffing === maxCaughtBluffing
  ).length;

  // Award titles only to those with the maximum (includes ties)
  if (
    stats.timesFalselyAccused === maxFalseAccusations &&
    maxFalseAccusations > 0
  ) {
    if (falseAccusersCount > 1) {
      titles.push(t("endgame:titles.coClown"));
    } else {
      titles.push(t("endgame:titles.clown"));
    }
  }

  if (
    stats.timesBluffedSuccessfully === maxSuccessfulBluffs &&
    maxSuccessfulBluffs > 0
  ) {
    if (masterLiarsCount > 1) {
      titles.push(t("endgame:titles.masterDeceiver"));
    } else {
      titles.push(t("endgame:titles.masterLiar"));
    }
  }

  if (stats.timesToldTruth === maxTruthful && maxTruthful > 0) {
    if (saintsCount > 1) {
      titles.push(t("endgame:titles.coSaint"));
    } else {
      titles.push(t("endgame:titles.saint"));
    }
  }

  if (
    stats.timesCaughtBluffing === maxCaughtBluffing &&
    maxCaughtBluffing > 0
  ) {
    if (detectivesCount > 1) {
      titles.push(t("endgame:titles.coDetective"));
    } else {
      titles.push(t("endgame:titles.detective"));
    }
  }

  // Special loser titles with extra harassment
  if (isLoser) {
    if (stats.timesCaughtBluffing >= 3) {
      titles.push(t("endgame:titles.transparentPlayer"));
    }
    if (stats.timesFalselyAccused >= 3) {
      titles.push(t("endgame:titles.professionalGuesser"));
    }
    titles.push(t("endgame:titles.lastOneStanding"));
  }

  // Additional achievement titles
  if (stats.timesBluffedSuccessfully >= 5 && stats.timesCaughtBluffing === 0) {
    titles.push(t("endgame:titles.perfectPokerFace"));
  }

  if (stats.timesToldTruth >= 8 && stats.timesBluffedSuccessfully === 0) {
    titles.push(t("endgame:titles.openBook"));
  }

  if (
    stats.timesCaughtBluffing >= 2 &&
    stats.timesFalselyAccused >= 2 &&
    !isLoser
  ) {
    titles.push(t("endgame:titles.riskTaker"));
  }

  // Default title if no achievements
  if (titles.length === 0) {
    titles.push(t("endgame:titles.rookie"));
  }

  return titles;
}

export const EndGameDialog = ({
  open,
  winners,
  loser,
  playerStats,
  gameState,
  currentPlayerId,
  onClose,
  handlePlayAgain,
}: EndGameDialogProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClose = () => {
    onClose();
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("endgame:dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("endgame:dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold text-green-600 mb-2">
              {t("endgame:winners.title")}
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {winners.map((winner, idx) => (
                <li key={idx} className="text-lg">
                  {winner}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-red-600 mb-2">
              {t("endgame:loser.title")}
            </h3>
            <p className="text-lg font-bold">{loser}</p>
            <p className="text-sm text-gray-600 italic mt-1">
              {t("endgame:loser.message")}
            </p>
          </div>

          {/* Player Statistics */}
          {playerStats && gameState && (
            <div className="mt-6">
              <h3 className="font-semibold text-blue-600 mb-3">
                {t("endgame:statistics.title")}
              </h3>
              <div className="space-y-3">
                {gameState.players.map((player) => {
                  const stats = playerStats[player.id];
                  if (!stats) return null;

                  const isCurrentPlayer = player.id === currentPlayerId;
                  const isLoserPlayer =
                    gameState.players.find((p) => p.name === loser)?.id ===
                    player.id;
                  const titles = calculateTitles(
                    playerStats,
                    player.id,
                    isLoserPlayer,
                    t
                  );

                  return (
                    <div
                      key={player.id}
                      className={`bg-card/50 border rounded-lg p-3 ${
                        isLoserPlayer
                          ? " border-red-300"
                          : isCurrentPlayer
                            ? " border-blue-300"
                            : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{player.name}</h4>
                        {isCurrentPlayer && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
                            {t("endgame:statistics.labels.you")}
                          </span>
                        )}
                        {isLoserPlayer && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">
                            {t("endgame:statistics.labels.loser")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {titles.map((title, idx) => (
                          <span
                            key={idx + 1}
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              isLoserPlayer
                                ? "bg-red-200 text-red-900"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {title}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("endgame:statistics.labels.caughtBluffing")}
                          </span>
                          <span className="font-semibold">
                            {stats.timesCaughtBluffing}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("endgame:statistics.labels.successfulBluffs")}
                          </span>
                          <span className="font-semibold">
                            {stats.timesBluffedSuccessfully}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("endgame:statistics.labels.falseAccusations")}
                          </span>
                          <span className="font-semibold">
                            {stats.timesFalselyAccused}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("endgame:statistics.labels.toldTruth")}
                          </span>
                          <span className="font-semibold">
                            {stats.timesToldTruth}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={handlePlayAgain} variant="default">
            {t("endgame:buttons.playAgain")}
          </Button>
          <Button variant="outline" onClick={handleClose}>
            {t("endgame:buttons.returnHome")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
