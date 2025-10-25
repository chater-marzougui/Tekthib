import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface PrivateRoomDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly roomPassword: string;
  readonly onRoomPasswordChange: (password: string) => void;
  readonly onJoinRoom: () => void;
}

export default function PrivateRoomDialog({
  open,
  onOpenChange,
  roomPassword,
  onRoomPasswordChange,
  onJoinRoom,
}: Readonly<PrivateRoomDialogProps>) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
    onRoomPasswordChange("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("home.joinPrivateRoom")}</DialogTitle>
          <DialogDescription>
            {t("home.joinPrivateRoomDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-password">{t("home.roomCode")}</Label>
            <Input
              id="room-password"
              value={roomPassword}
              onChange={(e) => onRoomPasswordChange(e.target.value.toUpperCase())}
              placeholder={t("home.enterRoomCode")}
              maxLength={8}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onJoinRoom();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onJoinRoom}>{t("home.joinRoom")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
