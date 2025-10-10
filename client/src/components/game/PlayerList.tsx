import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Player as BasePlayer } from "shared";
import { PlayerBadge } from "../PlayerBadge";
import { Icon } from "@iconify/react";

interface Player extends BasePlayer {
  isCurrentTurn: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
}

export default function PlayerList({
  players,
  currentPlayerId,
}: Readonly<PlayerListProps>) {
  const { t } = useTranslation();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('playerList.title', { count: players.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${player.isCurrentTurn ? "border-blue-500 shadow-md" : "border-gray-200"}
                ${player.id === currentPlayerId ? "ring-2 ring-green-300" : ""}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlayerBadge player={player} playerId={player.id} />
                  <div>
                    <div className="font-medium">
                      {player.name}
                      {player.isBot && (
                        <Icon icon="mdi:robot" className="w-4 h-4 inline-block ml-1" style={{ color: '#8b5cf6' }} />
                      )}
                      {player.id === currentPlayerId && (
                        <span className="text-xs text-green-600 ml-2">
                          ({t('playerList.you')})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {player.cardCount} {player.cardCount !== 1 ? t('playerList.cards') : t('playerList.card')}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {player.isCurrentTurn && (
                    <div className="text-blue-600 font-semibold text-sm animate-pulse">
                      {t('playerList.currentTurn')}
                    </div>
                  )}
                  {player.cardCount === 0 && (
                    <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                      <Icon icon="mdi:trophy" className="w-4 h-4" style={{ color: '#eab308' }} /> {t('playerList.winner')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
