import { useTranslation } from "react-i18next";
import { useTextDirection } from "@/hooks/useTextDirection";
import { Icon } from "@iconify/react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Player } from "@shared";
import ChatBox from "../chat/ChatBox";
import { PlayerBadge } from "../PlayerBadge";

interface RoomPlayerListProps {
  players: Player[];
  playerId: string;
  playerName: string;
  isHost: boolean;
  handleRemovePlayer: (id: string, isBot: boolean) => void;
  handleReadyToggle: () => void;
}

const RoomPlayerList = ({
  players,
  playerId,
  playerName,
  isHost,
  handleRemovePlayer,
  handleReadyToggle,
}: RoomPlayerListProps) => {
  const { t } = useTranslation();
  const direction = useTextDirection();
  return (
    <div className="lg:col-span-2 space-y-6">
      <Card dir={direction}>
        <CardHeader>
          <CardTitle>
            {t("room.playersCount", { current: players.length, max: 10 })}
          </CardTitle>
          <CardDescription>{t("room.waitingForPlayers")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <PlayerBadge player={player} playerId={player.id} />
                  <div>
                    <div className="font-medium">
                      {player.name}
                      {player.id === playerId && ` (${t("room.you")})`}
                      {player.isBot && (
                        <Icon
                          icon="mdi:robot"
                          className="w-4 h-4 inline-block ml-1"
                        />
                      )}
                    </div>
                    {player.id === players[0]?.id && (
                      <div className="text-xs text-gray-500">
                        {t("room.youAreHost")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {isHost && player.id !== playerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 cursor-pointer"
                      onClick={() =>
                        handleRemovePlayer(player.id, player.isBot || false)
                      }
                    >
                      <Icon icon="mdi:delete" className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={handleReadyToggle}
                    disabled={player.id !== playerId}
                  >
                    {player.isReady || player.isBot ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                        {t("room.ready")}{" "}
                        <Icon icon="mdi:check" className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        {t("room.notReady")}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 6 - players.length) }).map(
              (_, index) => (
                <div
                  key={`empty-${index + 1}-slot`}
                  className="flex items-center p-3 bg-card rounded-lg border-2 border-dashed border-gray-300"
                >
                  <div className="text-gray-400">{t("room.emptySlot")}</div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Box */}
      {playerId && playerName && (
        <ChatBox playerName={playerName} playerId={playerId} />
      )}
    </div>
  );
};

export default RoomPlayerList;
