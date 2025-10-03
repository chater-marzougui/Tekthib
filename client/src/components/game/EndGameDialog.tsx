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
  isLoser: boolean
): string[] {
  const titles: string[] = [];
  const stats = playerStats[playerId];

  if (!stats) return ["🎲 Rookie"];

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
      titles.push("🤡 Co-Clown of the Round");
    } else {
      titles.push("🤡 Clown of the Round");
    }
  }

  if (
    stats.timesBluffedSuccessfully === maxSuccessfulBluffs &&
    maxSuccessfulBluffs > 0
  ) {
    if (masterLiarsCount > 1) {
      titles.push("😈 Master Deceiver");
    } else {
      titles.push("😈 Master Liar");
    }
  }

  if (stats.timesToldTruth === maxTruthful && maxTruthful > 0) {
    if (saintsCount > 1) {
      titles.push("👼 Co-Saint");
    } else {
      titles.push("👼 Saint");
    }
  }

  if (
    stats.timesCaughtBluffing === maxCaughtBluffing &&
    maxCaughtBluffing > 0
  ) {
    if (detectivesCount > 1) {
      titles.push("🔍 Co-Detective");
    } else {
      titles.push("🔍 Detective");
    }
  }

  // Special loser titles with extra harassment
  if (isLoser) {
    if (stats.timesCaughtBluffing >= 3) {
      titles.push("🎭 Transparent Player");
    }
    if (stats.timesFalselyAccused >= 3) {
      titles.push("🎪 Professional Guesser");
    }
    titles.push("💀 Last One Standing (Barely)");
  }

  // Additional achievement titles
  if (stats.timesBluffedSuccessfully >= 5 && stats.timesCaughtBluffing === 0) {
    titles.push("🎩 Perfect Poker Face");
  }

  if (stats.timesToldTruth >= 8 && stats.timesBluffedSuccessfully === 0) {
    titles.push("📖 Open Book");
  }

  if (
    stats.timesCaughtBluffing >= 2 &&
    stats.timesFalselyAccused >= 2 &&
    !isLoser
  ) {
    titles.push("🎲 Risk Taker");
  }

  // Default title if no achievements
  if (titles.length === 0) {
    titles.push("🎲 Rookie");
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

  const handleClose = () => {
    onClose();
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎉 Game Over!</DialogTitle>
          <DialogDescription>
            The game has ended. Here are the results:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold text-green-600 mb-2">🏆 Winners:</h3>
            <ul className="list-disc list-inside space-y-1">
              {winners.map((winner, idx) => (
                <li key={idx} className="text-lg">
                  {winner}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-red-600 mb-2">😢 Loser:</h3>
            <p className="text-lg font-bold">{loser}</p>
            <p className="text-sm text-gray-600 italic mt-1">
              Better luck next time! 🎯
            </p>
          </div>

          {/* Player Statistics */}
          {playerStats && gameState && (
            <div className="mt-6">
              <h3 className="font-semibold text-blue-600 mb-3">
                📊 Player Statistics
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
                    isLoserPlayer
                  );

                  return (
                    <div
                      key={player.id}
                      className={`border rounded-lg p-3 ${
                        isLoserPlayer
                          ? "bg-red-50 border-red-300"
                          : isCurrentPlayer
                            ? "bg-blue-50 border-blue-300"
                            : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{player.name}</h4>
                        {isCurrentPlayer && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
                            You
                          </span>
                        )}
                        {isLoserPlayer && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">
                            Loser
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {titles.map((title, idx) => (
                          <span
                            key={idx}
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
                            🤥 Caught Bluffing:
                          </span>
                          <span className="font-semibold">
                            {stats.timesCaughtBluffing}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            😎 Successful Bluffs:
                          </span>
                          <span className="font-semibold">
                            {stats.timesBluffedSuccessfully}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            ❌ False Accusations:
                          </span>
                          <span className="font-semibold">
                            {stats.timesFalselyAccused}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">✅ Told Truth:</span>
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
            🔄 Play Again
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Return to Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
