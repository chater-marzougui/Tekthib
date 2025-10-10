import { useTranslation } from "react-i18next";
import { useTextDirection } from "@/hooks/useTextDirection";
import { Icon } from "@iconify/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Player } from "@shared";

interface RoomControlsProps {
  playerName: string;
  isReady: boolean;
  isHost: boolean;
  handleReadyToggle: () => void;
  handleAddBots: (count: number) => void;
  handleStartGame: () => void;
  canStartGame: boolean;
  players: Player[];
  timerSlideEnabled: boolean;
  setTimerSlideEnabled: (enabled: boolean) => void;
  autoPlayTimeout: number;
  setAutoPlayTimeout: (timeout: number) => void;
  setShowLeaveDialog: (show: boolean) => void;
}

const RoomControls = ({
  playerName,
  isReady,
  isHost,
  players,
  canStartGame,
  timerSlideEnabled,
  setTimerSlideEnabled,
  autoPlayTimeout,
  handleReadyToggle,
  handleAddBots,
  handleStartGame,
  setAutoPlayTimeout,
  setShowLeaveDialog,
}: RoomControlsProps) => {
  const { t } = useTranslation();
  const direction = useTextDirection();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("room.yourStatus")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">
            {t("room.playingAs")}:
          </div>
          <div className="font-semibold text-lg">{playerName}</div>
        </div>
        <Button
          onClick={handleReadyToggle}
          className={`w-full ${
            isReady ? "bg-green-600 hover:bg-green-700" : ""
          }`}
          variant={isReady ? "default" : "destructive"}
        >
          {isReady ? (
            <span className="flex items-center gap-2">
              <Icon icon="mdi:check" className="w-4 h-4" />{" "}
              {t("room.youAreReady")}
            </span>
          ) : (
            t("room.youAreNotReady")
          )}
        </Button>

        {isHost && (
          <>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                {t("room.addBots")}
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Button
                    key={`add-bot-${index + 1}`}
                    onClick={() => handleAddBots(index + 1)}
                    disabled={players.length >= 10 - (index + 1)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    +{index + 1} {t("room.bot")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-4 rounded-lg space-y-4">
                {/* Auto-play toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-play" className="text-sm font-medium">
                      {t("room.autoPlayTimer")}
                    </Label>
                  </div>
                  <Switch
                    id="auto-play"
                    checked={timerSlideEnabled}
                    dir="ltr"
                    className={`
                        ${direction === "rtl" ? "transform rotate-180" : ""} 
                        ${timerSlideEnabled ? "!bg-blue-600" : ""}
                        `}
                    onCheckedChange={(checked) => {
                      setTimerSlideEnabled(checked);
                      if (!checked) {
                        setAutoPlayTimeout(0);
                      } else {
                        setAutoPlayTimeout(45);
                      }
                    }}
                  />
                </div>

                {/* Timer input - only shown when enabled */}
                {timerSlideEnabled && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="timer-duration" className="text-sm">
                      {t("room.timerDuration")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="timer-duration"
                        type="number"
                        min="10"
                        max="300"
                        value={autoPlayTimeout}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setAutoPlayTimeout(
                            Math.max(10, Math.min(300, value))
                          );
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">
                        {t("room.secondsPerTurn")}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {t("room.timerRange")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="w-full cursor-pointer"
              size="lg"
            >
              {canStartGame ? (
                <span className="flex items-center gap-2">
                  <Icon icon="mdi:rocket-launch" className="w-5 h-5" />{" "}
                  {t("room.startGame")}
                </span>
              ) : (
                t("room.waiting")
              )}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          onClick={() => setShowLeaveDialog(true)}
          className="w-full"
        >
          {t("room.leaveRoom")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoomControls;
