import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Gamepad2, DoorOpen, Globe, Lock, Users, Target, Layers, Frown, Trophy, Spade } from "lucide-react";

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
      toast.error("Please enter your name first");
      return;
    }
    
    if (room.inProgress) {
      toast.error("Game already in progress");
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
      toast.error("Please enter the room password");
      return;
    }

    // For private rooms, the password is the room code
    fetch(`${SERVER_URL}/api/rooms/${roomPassword.trim().toUpperCase()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Invalid password");
        }
        if (data.inProgress) {
          throw new Error("Cannot join, game already in progress");
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Game Title and Description */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
              <Spade className="w-12 h-12" /> Tekthib
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Tunisian Online Card Game
            </p>
            <p className="text-lg text-gray-500 max-w-lg mx-auto">
              Play smart, bluff well, and be the first to get rid of all your
              cards. Challenge your friends in this exciting game of deception
              and strategy!
            </p>
          </div>

          {/* Main Game Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Room Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Gamepad2 className="w-5 h-5" /> Create Room
                </CardTitle>
                <CardDescription className="text-center">
                  Start a new game and invite friends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Your Name</Label>
                  <Input
                    id="create-name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room Visibility</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isPublicRoom ? "default" : "outline"}
                      onClick={() => setIsPublicRoom(true)}
                      className="flex-1"
                    >
                      <Globe className="w-4 h-4 mr-2" /> Public
                    </Button>
                    <Button
                      type="button"
                      variant={!isPublicRoom ? "default" : "outline"}
                      onClick={() => setIsPublicRoom(false)}
                      className="flex-1"
                    >
                      <Lock className="w-4 h-4 mr-2" /> Private
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {isPublicRoom 
                      ? "Anyone can see and join your room" 
                      : "Players need the room code to join"}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                >
                  Create New Room
                </Button>
              </CardContent>
            </Card>

            {/* Join Room Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <DoorOpen className="w-5 h-5" /> Join Room
                </CardTitle>
                <CardDescription className="text-center">
                  Join an existing game with a room code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-name">Your Name</Label>
                  <Input
                    id="join-name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-code">Room Code</Label>
                  <Input
                    id="room-code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ABCD1234"
                    maxLength={8}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || !roomCode.trim()}
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Available Rooms */}
          {rooms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Gamepad2 className="w-5 h-5" /> Available Rooms
                </CardTitle>
                <CardDescription className="text-center">
                  Click on a room to join
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleRoomClick(room)}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        room.inProgress ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{room.hostName}'s Room</span>
                          {room.isPublic ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Public
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Private
                            </span>
                          )}
                          {room.inProgress && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              In Progress
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4" /> {room.playerCount}/{room.maxPlayers}
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
                <Layers className="w-5 h-5" /> Quick Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Goal
                  </h4>
                  <p className="text-gray-600">
                    Be the first to get rid of all your cards. Last player with
                    cards loses.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Spade className="w-4 h-4" /> Gameplay
                  </h4>
                  <p className="text-gray-600">
                    Play cards face-down and announce a rank. Others can
                    challenge if they think you're lying!
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Frown className="w-4 h-4" /> Bluffing
                  </h4>
                  <p className="text-gray-600">
                    You don't need the cards you claim to have. Bluff wisely!
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Special Rule
                  </h4>
                  <p className="text-gray-600">
                    Collect all 4 cards of the same rank to remove them
                    permanently.
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
            <DialogTitle>Join Private Room</DialogTitle>
            <DialogDescription>
              This is a private room. Please enter the room code (password) to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-password">Room Code</Label>
              <Input
                id="room-password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value.toUpperCase())}
                placeholder="Enter room code"
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
              Cancel
            </Button>
            <Button onClick={handlePrivateRoomJoin}>
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
