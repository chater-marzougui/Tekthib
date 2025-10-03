import { useState } from "react";
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

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function HomePage() {
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("playerName") || "",
  );
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    localStorage.setItem("playerName", playerName);
    navigate("/room/create");
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    localStorage.setItem("playerName", playerName);
    console.log("Based on server URL:", SERVER_URL);

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
        toast.error(`❌ ${error.message}`);
      });
  };

  return (
    <>
      <Seo
        title="Tekthib - Tunisian Online Card Game"
        description="Play Tekthib, the ultimate Tunisian bluffing card game online! Create rooms, invite friends, and master the art of deception."
        keywords="Tekthib, Tunisian card game, online card game, bluffing game, multiplayer"
        image="/og-image.png"
        url="https://tekthib.com"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Game Title and Description */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              🃏 Tekthib
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
                <CardTitle className="text-center">🎮 Create Room</CardTitle>
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
                <CardTitle className="text-center">🚪 Join Room</CardTitle>
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

          {/* Game Rules Summary */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-center">📖 Quick Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">🎯 Goal</h4>
                  <p className="text-gray-600">
                    Be the first to get rid of all your cards. Last player with
                    cards loses.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🃏 Gameplay</h4>
                  <p className="text-gray-600">
                    Play cards face-down and announce a rank. Others can
                    challenge if they think you're lying!
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🤥 Bluffing</h4>
                  <p className="text-gray-600">
                    You don't need the cards you claim to have. Bluff wisely!
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🏆 Special Rule</h4>
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
    </>
  );
}
