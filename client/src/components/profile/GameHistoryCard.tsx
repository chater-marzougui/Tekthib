import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GameHistoryItem } from "shared";

interface GameHistoryProps {
  gameHistory: GameHistoryItem[];
}

export default function GameHistory({
  gameHistory,
}: Readonly<GameHistoryProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const getGameResult = (game: GameHistoryItem): string => {
    if (game.is_winner) {
      return t("profile.victory");
    }
    if (game.is_loser) {
      return t("profile.defeat");
    }
    return `${t("profile.position")} #${game.final_position}`;
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="mdi:history" className="w-5 h-5" />
          {t("profile.recentGames")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gameHistory.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            {t("profile.noGamesYet")}
          </p>
        ) : (
          <div className="space-y-3">
            {gameHistory.map((game) => (
              <Card
                key={game.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/replay/${game.games.id}`)}
              >
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {game.is_winner && (
                        <Icon
                          icon="mdi:trophy"
                          className="w-5 h-5 text-yellow-500"
                        />
                      )}
                      {game.is_loser && (
                        <Icon icon="mdi:emoticon-sad" className="w-5 h-5" />
                      )}
                      <span className="font-medium">{getGameResult(game)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(game.games.ended_at).toLocaleDateString()}
                      </span>
                      <span aria-label={t("profile.watchReplay")}>
                        <Icon
                          icon="mdi:play-circle"
                          className="w-5 h-5 text-blue-500"
                        />
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t("profile.players")}:
                      </span>{" "}
                      {game.games.total_players}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("profile.rounds")}:
                      </span>{" "}
                      {game.games.total_rounds}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("profile.cardsPlayed")}:
                      </span>{" "}
                      {game.cards_played}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("profile.challenges")}:
                      </span>{" "}
                      {game.challenges_made}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
