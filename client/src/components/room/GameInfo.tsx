import { t } from "i18next";
import { CardHeader, CardTitle, CardContent, Card } from "../ui/card";

interface RoomGameInfoProps {
  direction?: "ltr" | "rtl";
}

const RoomGameInfo = ({ direction }: RoomGameInfoProps) => {
  return (
    <Card dir={direction}>
      <CardHeader>
        <CardTitle>{t("room.gameRequirements")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex justify-between">
          <span>{t("room.minPlayers")}:</span>
          <span className="font-medium">3</span>
        </div>
        <div className="flex justify-between">
          <span>{t("room.maxPlayers")}:</span>
          <span className="font-medium">10</span>
        </div>
        <div className="flex justify-between">
          <span>{t("room.cardsPerDeck")}:</span>
          <span className="font-medium">108</span>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          {t("room.allPlayersReady")}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomGameInfo;
