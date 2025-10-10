import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface PlayerNameDialogProps {
  nameInput: string;
  setNameInput: (name: string) => void;
  handleNameSubmit: () => void;
  showNameDialog: boolean;
}

const PlayerNameDialog: React.FC<PlayerNameDialogProps> = ({
  nameInput,
  setNameInput,
  showNameDialog,
  handleNameSubmit,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={showNameDialog} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("room.enterYourName")}</DialogTitle>
          <DialogDescription>{t("room.enterNameToJoin")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="player-name">{t("room.yourName")}</Label>
            <Input
              id="player-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t("room.enterYourName")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNameSubmit();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleNameSubmit} disabled={!nameInput.trim()}>
            {t("room.joinRoom")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerNameDialog;
