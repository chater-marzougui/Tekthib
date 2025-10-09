import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import Seo from "@/components/SEO";
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@iconify/react";

const SERVER_URL = import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

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
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("playerName") || "",
  );
  const [roomCode, setRoomCode] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const navigate = useNavigate();

  // Fetch rooms on component mount and periodically
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000); // Refresh every 5 seconds
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
    // Pass isPublic as query parameter
    navigate(`/room/create?isPublic=${isPublicRoom}`);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    localStorage.setItem("playerName", playerName);

    fetch(`${SERVER_URL}/api/rooms/${roomCode.trim().toUpperCase()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({})); // fallback if no body
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
      toast.error(t('home.pleaseEnterName'));
      return;
    }
    
    if (room.inProgress) {
      toast.error(t('home.gameInProgress'));
      return;
    }

    localStorage.setItem("playerName", playerName);
    
    if (room.isPublic && room.code) {
      // Public room - join directly
      navigate(`/room/${room.code}`);
    } else {
      // Private room - ask for password
      setShowPasswordDialog(true);
    }
  };

  const handlePrivateRoomJoin = () => {
    if (!roomPassword.trim()) {
      toast.error(t('home.pleaseEnterPassword'));
      return;
    }

    // For private rooms, the password is the room code
    fetch(`${SERVER_URL}/api/rooms/${roomPassword.trim().toUpperCase()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || t('home.invalidPassword'));
        }
        if (data.inProgress) {
          throw new Error(t('home.cannotJoinInProgress'));
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
    <>
      <Seo
        title="Tekthib - Tunisian Online Card Game"
        description="Play Tekthib, the ultimate Tunisian bluffing card game online! Create rooms, invite friends, and master the art of deception."
        keywords="Tekthib, Tunisian card game, online card game, bluffing game, multiplayer"
        image="/og-image.png"
        url="https://chater-marzougui.me"
      />
      <div className="flex items-center justify-center py-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Game Title and Description */}
          <div className="text-center space-y-4">
            <p className="text-xl text-gray-600 mb-4">
              {t('home.subtitle')}
            </p>
            <p className="text-lg text-gray-500 max-w-lg mx-auto">
              {t('home.description')}
            </p>
          </div>

          {/* Main Game Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Room Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Icon icon="mdi:gamepad-variant" className="w-5 h-5" /> {t('home.createRoom')}
                </CardTitle>
                <CardDescription className="text-center">
                  {t('home.createRoomDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">{t('home.yourName')}</Label>
                  <Input
                    id="create-name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={t('home.enterYourName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('home.roomVisibility')}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isPublicRoom ? "default" : "outline"}
                      onClick={() => setIsPublicRoom(true)}
                      className="flex-1"
                    >
                      <Icon icon="mdi:web" className="w-4 h-4 mr-2" /> {t('home.public')}
                    </Button>
                    <Button
                      type="button"
                      variant={!isPublicRoom ? "default" : "outline"}
                      onClick={() => setIsPublicRoom(false)}
                      className="flex-1"
                    >
                      <Icon icon="mdi:lock" className="w-4 h-4 mr-2" /> {t('home.private')}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {isPublicRoom 
                      ? t('home.publicRoomDesc')
                      : t('home.privateRoomDesc')}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                >
                  {t('home.createNewRoom')}
                </Button>
              </CardContent>
            </Card>

            {/* Join Room Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Icon icon="mdi:door-open" className="w-5 h-5" /> {t('home.joinRoom')}
                </CardTitle>
                <CardDescription className="text-center">
                  {t('home.joinRoomDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-name">{t('home.yourName')}</Label>
                  <Input
                    id="join-name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={t('home.enterYourName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-code">{t('home.roomCode')}</Label>
                  <Input
                    id="room-code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder={t('home.roomCodePlaceholder')}
                    maxLength={8}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || !roomCode.trim()}
                >
                  {t('home.joinRoom')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Available Rooms */}
          {rooms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Icon icon="mdi:gamepad-variant" className="w-5 h-5" /> {t('home.availableRooms')}
                </CardTitle>
                <CardDescription className="text-center">
                  {t('home.availableRoomsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleRoomClick(room)}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-background/50 transition-colors ${
                        room.inProgress ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t('home.hostRoom', { name: room.hostName })}</span>
                          {room.isPublic ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                              <Icon icon="mdi:web" className="w-3 h-3" /> {t('home.public')}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center gap-1">
                              <Icon icon="mdi:lock" className="w-3 h-3" /> {t('home.private')}
                            </span>
                          )}
                          {room.inProgress && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              {t('home.inProgress')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Icon icon="mdi:account-group" className="w-4 h-4" /> {room.playerCount}/{room.maxPlayers}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game Rules Summary */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Icon icon="mdi:layers" className="w-5 h-5" /> {t('home.quickRules')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Icon icon="mdi:target" className="w-4 h-4" /> {t('home.goal')}
                  </h4>
                  <p className="text-gray-600">
                    {t('home.goalDescription')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Icon icon="mdi:cards-spade" className="w-4 h-4" /> {t('home.gameplay')}
                  </h4>
                  <p className="text-gray-600">
                    {t('home.gameplayDescription')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Icon icon="mdi:emoticon-sad" className="w-4 h-4" /> {t('home.bluffing')}
                  </h4>
                  <p className="text-gray-600">
                    {t('home.bluffingDescription')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Icon icon="mdi:trophy" className="w-4 h-4" /> {t('home.specialRule')}
                  </h4>
                  <p className="text-gray-600">
                    {t('home.specialRuleDescription')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Dialog for Private Rooms */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('home.joinPrivateRoom')}</DialogTitle>
            <DialogDescription>
              {t('home.joinPrivateRoomDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-password">{t('home.roomCode')}</Label>
              <Input
                id="room-password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value.toUpperCase())}
                placeholder={t('home.enterRoomCode')}
                maxLength={8}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePrivateRoomJoin();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setRoomPassword("");
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePrivateRoomJoin}>
              {t('home.joinRoom')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
