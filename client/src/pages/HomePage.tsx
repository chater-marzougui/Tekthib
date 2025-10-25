import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Seo from "@/components/SEO";
import { useTextDirection } from "@/hooks/useTextDirection";
import CreateRoomCard from "@/components/home/CreateRoomCard";
import JoinRoomCard from "@/components/home/JoinRoomCard";
import AvailableRoomsList from "@/components/home/AvailableRoomsList";
import QuickRulesCard from "@/components/home/QuickRulesCard";
import PrivateRoomDialog from "@/components/home/PrivateRoomDialog";
import Leaderboard from "@/components/home/Leaderboard";

const SERVER_URL =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

interface RoomInfo {
  id: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  inProgress: boolean;
  code?: string;
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const direction = useTextDirection();
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("playerName") || ""
  );
  const [roomCode, setRoomCode] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/rooms`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    localStorage.setItem("playerName", playerName);
    navigate(`/room/create?isPublic=${isPublicRoom}`);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    localStorage.setItem("playerName", playerName);
    fetch(`${SERVER_URL}/api/rooms/${roomCode.trim().toUpperCase()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Unknown error");
        }
        if (data.inProgress) {
          throw new Error("Cannot join, game already in progress");
        }
        return data;
      })
      .then(() => {
        navigate(`/room/${roomCode}`);
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const handleRoomClick = (room: RoomInfo) => {
    if (!playerName.trim()) {
      toast.error(t("home.pleaseEnterName"));
      return;
    }
    if (room.inProgress) {
      toast.error(t("home.gameInProgress"));
      return;
    }
    if (room.playerCount >= room.maxPlayers) {
      toast.error(t("home.roomFull"));
      return;
    }
    localStorage.setItem("playerName", playerName);
    if (room.isPublic && room.code) {
      navigate(`/room/${room.code}`);
    } else {
      setShowPasswordDialog(true);
    }
  };

  const handlePrivateRoomJoin = () => {
    if (!roomPassword.trim()) {
      toast.error(t("home.pleaseEnterPassword"));
      return;
    }
    fetch(`${SERVER_URL}/api/rooms/${roomPassword.trim().toUpperCase()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || t("home.invalidPassword"));
        }
        if (data.inProgress) {
          throw new Error(t("home.cannotJoinInProgress"));
        }
        return data;
      })
      .then(() => {
        navigate(`/room/${roomPassword.trim().toUpperCase()}`);
        setShowPasswordDialog(false);
        setRoomPassword("");
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  return (
    <div dir={direction}>
      <Seo
        title="Tekthib - Tunisian Online Card Game"
        description="Play Tekthib, the ultimate Tunisian bluffing card game online! Create rooms, invite friends, and master the art of deception."
        keywords="Tekthib, Tunisian card game, online card game, bluffing game, multiplayer"
        image="/og-image.png"
        url="https://chater-marzougui.me"
      />
      <div className="flex items-center justify-center py-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <p className="text-xl text-gray-600 mb-4">{t("home.subtitle")}</p>
            <p className="text-lg text-gray-500 max-w-lg mx-auto">
              {t("home.description")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <CreateRoomCard
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              isPublicRoom={isPublicRoom}
              onPublicChange={setIsPublicRoom}
              onCreateRoom={handleCreateRoom}
            />
            <JoinRoomCard
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              roomCode={roomCode}
              onRoomCodeChange={setRoomCode}
              onJoinRoom={handleJoinRoom}
            />
          </div>
          <AvailableRoomsList rooms={rooms} onRoomClick={handleRoomClick} />
          <Leaderboard />
          <QuickRulesCard />
        </div>
      </div>
      <PrivateRoomDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        roomPassword={roomPassword}
        onRoomPasswordChange={setRoomPassword}
        onJoinRoom={handlePrivateRoomJoin}
      />
    </div>
  );
}