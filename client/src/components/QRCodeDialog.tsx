// src/components/dashboard/qr-code-card.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "./ui/card";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  value: string | number;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  includeMargin?: boolean;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 128,
  fgColor = "#000000",
  bgColor = "#ffffff",
  includeMargin = false,
}) => {
  const stringValue = String(value);

  return (
    <QRCodeSVG
      value={stringValue}
      size={size}
      fgColor={fgColor}
      bgColor={bgColor}
      marginSize={includeMargin ? 4 : 0}
    />
  );
};

interface QRCodeCardProps {
  roomCode: string;
  baseUrl?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ 
  roomCode,
  baseUrl = window.location.origin 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const roomUrl = `${baseUrl}/room/${roomCode}`;

  const copyRoomUrl = () => {
    navigator.clipboard.writeText(roomUrl);
    toast.success("Room link copied to clipboard!");
  };

  return (
    <Card className="w-fit h-fit p-0 m-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer"
        title="Show QR Code"
      >
        <Icon icon="mdi:qrcode" className="w-8 h-8" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Room - {roomCode}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <QRCodeGenerator
                value={roomUrl}
                size={256}
                includeMargin={true}
              />
            </div>
            <div className="text-center w-full">
              <p className="text-sm text-gray-600 mb-2">Scan to join room</p>
              <p className="font-mono text-xs bg-gray-100 px-4 py-2 rounded break-all">
                {roomUrl}
              </p>
            </div>
            <Button
              onClick={copyRoomUrl}
              variant="outline"
              className="w-full cursor-pointer"
            >
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};