import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface RoomInfo {
  readonly id: string;
  readonly hostName: string;
  readonly playerCount: number;
  readonly maxPlayers: number;
  readonly isPublic: boolean;
  readonly inProgress: boolean;
  readonly code?: string;
}

interface RoomCardProps {
  readonly room: RoomInfo;
  readonly onRoomClick: (room: RoomInfo) => void;
}

export default function RoomCard({
  room,
  onRoomClick,
}: Readonly<RoomCardProps>) {
  const { t } = useTranslation();
  const isFull = room.playerCount >= room.maxPlayers;
  const isDisabled = room.inProgress || isFull;

  return (
    <motion.button
      onClick={() => onRoomClick(room)}
      disabled={isDisabled}
      className={`w-full p-4 border rounded-lg transition-all ${
        isDisabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-background"
      }`}
      whileHover={isDisabled ? {} : { scale: 1 }}
      whileTap={isDisabled ? {} : { scale: 0.99 }}
    >
      <div className="flex flex-col gap-3">
        {/* Header Row */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-base">
                {t("home.hostRoom", { name: room.hostName })}
              </h3>
              {room.code && (
                <p className="text-xs text-gray-500 mt-1">
                  {t("home.roomCode")}: <span className="font-mono font-bold">{room.code}</span>
                </p>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-1 justify-end">
            {room.isPublic ? (
              <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                <Icon
                  icon="mdi:web"
                  className="w-3 h-3"
                  style={{ color: "#10b981" }}
                />{" "}
                {t("home.public")}
              </span>
            ) : (
              <span className="text-xs bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                <Icon
                  icon="mdi:lock"
                  className="w-3 h-3"
                  style={{ color: "#ef4444" }}
                />{" "}
                {t("home.private")}
              </span>
            )}

            {room.inProgress && (
              <span className="text-xs bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                ▶️ {t("home.inProgress")}
              </span>
            )}

            {isFull && (
              <span className="text-xs bg-gradient-to-r from-red-100 to-rose-100 text-red-800 px-2 py-1 rounded-full font-medium">
                ⛔ {t("home.roomFull")}
              </span>
            )}
          </div>
        </div>

        {/* Player Count Bar */}
        <div className="space-y-1">
          <div className="flex gap-2 items-center text-xs">
            <span className="text-gray-600 font-medium">
              <Icon
                icon="mdi:account-group"
                className="w-4 h-4 inline mb-1"
                style={{ color: "#3b82f6" }}
              />
            </span>
            <span className="font-semibold">
              {room.playerCount}/{room.maxPlayers}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(room.playerCount / room.maxPlayers) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
