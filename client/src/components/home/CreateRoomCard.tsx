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

interface CreateRoomCardProps {
  readonly playerName: string;
  readonly onPlayerNameChange: (name: string) => void;
  readonly isPublicRoom: boolean;
  readonly onPublicChange: (isPublic: boolean) => void;
  readonly onCreateRoom: () => void;
}

export default function CreateRoomCard({
  playerName,
  onPlayerNameChange,
  isPublicRoom,
  onPublicChange,
  onCreateRoom,
}: Readonly<CreateRoomCardProps>) {
  const { t } = useTranslation();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Icon
            icon="mdi:gamepad-variant"
            className="w-5 h-5"
            style={{ color: "#3b82f6" }}
          />{" "}
          {t("home.createRoom")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("home.createRoomDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="create-name">{t("home.yourName")}</Label>
          <Input
            id="create-name"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder={t("home.enterYourName")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("home.roomVisibility")}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isPublicRoom ? "default" : "outline"}
              onClick={() => onPublicChange(true)}
              className="flex-1"
            >
              <Icon
                icon="mdi:web"
                className="w-4 h-4 mr-2"
                style={{ color: "#10b981" }}
              />{" "}
              {t("home.public")}
            </Button>
            <Button
              type="button"
              variant={isPublicRoom ? "outline" : "default"}
              onClick={() => onPublicChange(false)}
              className="flex-1"
            >
              <Icon
                icon="mdi:lock"
                className="w-4 h-4 mr-2"
                style={{ color: "#ef4444" }}
              />{" "}
              {t("home.private")}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {isPublicRoom
              ? t("home.publicRoomDesc")
              : t("home.privateRoomDesc")}
          </p>
        </div>
        <Button
          className="w-full"
          onClick={onCreateRoom}
          disabled={!playerName.trim()}
        >
          {t("home.createNewRoom")}
        </Button>
      </CardContent>
    </Card>
  );
}
