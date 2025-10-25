import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

interface JoinRoomCardProps {
  readonly playerName: string;
  readonly onPlayerNameChange: (name: string) => void;
  readonly roomCode: string;
  readonly onRoomCodeChange: (code: string) => void;
  readonly onJoinRoom: () => void;
}

export default function JoinRoomCard({
  playerName,
  onPlayerNameChange,
  roomCode,
  onRoomCodeChange,
  onJoinRoom,
}: Readonly<JoinRoomCardProps>) {
  const { t } = useTranslation();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Icon
            icon="mdi:door-open"
            className="w-5 h-5"
            style={{ color: "#3b82f6" }}
          />{" "}
          {t("home.joinRoom")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("home.joinRoomDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="join-name">{t("home.yourName")}</Label>
          <Input
            id="join-name"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder={t("home.enterYourName")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="room-code">{t("home.roomCode")}</Label>
          <Input
            id="room-code"
            value={roomCode}
            onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
            placeholder={t("home.roomCodePlaceholder")}
            maxLength={8}
          />
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={onJoinRoom}
          disabled={!playerName.trim() || !roomCode.trim()}
        >
          {t("home.joinRoom")}
        </Button>
      </CardContent>
    </Card>
  );
}
