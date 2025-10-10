import { useTranslation } from "react-i18next";
import { QRCodeCard } from "../QRCodeDialog";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface RoomHeaderProps {
  roomCode: string;
  isConnected: boolean;
  direction?: "ltr" | "rtl";
  error?: string;
}

export default function RoomHeader({
  roomCode,
  isConnected,
  direction = "ltr",
  error,
}: Readonly<RoomHeaderProps>) {
  const { t } = useTranslation();
  
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Room code copied to clipboard!");
  };
  
  return (
    <div className="text-center space-y-2">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}
      {!isConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
          {t("room.connectingToServer")}
        </div>
      )}
      <div className="flex items-center justify-center gap-4" dir={direction}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{t("room.roomCode")}:</span>
          <Button
            variant="outline"
            onClick={copyRoomCode}
            className="font-mono text-lg px-4 cursor-pointer"
            disabled={!roomCode}
          >
            {roomCode || t("common.loading")}
          </Button>
          {roomCode && <QRCodeCard roomCode={roomCode} />}
        </div>
      </div>
    </div>
  );
}
