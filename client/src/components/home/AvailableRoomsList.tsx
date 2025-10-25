import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import RoomCard from "./RoomCard";

interface RoomInfo {
  readonly id: string;
  readonly hostName: string;
  readonly playerCount: number;
  readonly maxPlayers: number;
  readonly isPublic: boolean;
  readonly inProgress: boolean;
  readonly code?: string;
}

interface AvailableRoomsListProps {
  readonly rooms: RoomInfo[];
  readonly onRoomClick: (room: RoomInfo) => void;
}

export default function AvailableRoomsList({
  rooms,
  onRoomClick,
}: Readonly<AvailableRoomsListProps>) {
  const { t } = useTranslation();

  if (rooms.length === 0) {
    return null;
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const publicRooms = rooms.filter((r) => r.isPublic);
  const inProgressCount = rooms.filter((r) => r.inProgress).length;
  const availableRooms = rooms.filter((r) => !r.inProgress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center justify-start gap-2">
                <Icon
                  icon="mdi:gamepad-variant"
                  className="w-6 h-6"
                  style={{ color: "#3b82f6" }}
                />{" "}
                {t("home.availableRooms")}
              </CardTitle>
              <CardDescription className="mt-2">
                {t("home.availableRoomsDescription")}
              </CardDescription>
            </div>
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <Card className="bg-background border-blue-500 px-3 py-2 rounded-lg">
                <div className="text-blue-600 font-semibold">
                  {publicRooms.length}
                </div>
                <div className="text-xs text-blue-600">{t("home.public")}</div>
              </Card>
              <Card className="bg-background border-amber-500 px-3 py-2 rounded-lg">
                <div className="text-amber-600 font-semibold">
                  {inProgressCount}
                </div>
                <div className="text-xs text-amber-600">
                  {t("home.inProgress")}
                </div>
              </Card>
              <Card className="bg-background border-green-500 px-3 py-2 rounded-lg">
                <div className="text-green-600 font-semibold">
                  {availableRooms.length}
                </div>
                <div className="text-xs text-green-600">
                  {t("home.available")}
                </div>
              </Card>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {availableRooms.length > 0 ? (
            <motion.div
              className="grid gap-3 max-h-96 overflow-y-auto pr-2 grid-cols-1 sm:grid-cols-2"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {availableRooms.map((room) => (
                <motion.div key={room.id} variants={item}>
                  <RoomCard room={room} onRoomClick={onRoomClick} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-12 text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Icon
                icon="mdi:inbox-multiple"
                className="w-12 h-12 mx-auto mb-4 opacity-30"
              />
              <p className="font-medium">{t("home.noAvailableRooms")}</p>
              <p className="text-sm">{t("home.createRoomToStart")}</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
