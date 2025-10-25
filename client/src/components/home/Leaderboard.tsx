import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SERVER_URL =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

interface LeaderboardEntry {
  user_id: string;
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_cards_played: number;
  users: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const [leaderboardByWins, setLeaderboardByWins] = useState<LeaderboardEntry[]>([]);
  const [leaderboardByWinRate, setLeaderboardByWinRate] = useState<LeaderboardEntry[]>([]);
  const [leaderboardByGames, setLeaderboardByGames] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const [winsData, winRateData, gamesData] = await Promise.all([
        fetch(`${SERVER_URL}/api/auth/leaderboard?sortBy=wins&limit=5`).then(r => r.json()),
        fetch(`${SERVER_URL}/api/auth/leaderboard?sortBy=win_rate&limit=5`).then(r => r.json()),
        fetch(`${SERVER_URL}/api/auth/leaderboard?sortBy=total_games&limit=5`).then(r => r.json()),
      ]);

      setLeaderboardByWins(winsData);
      setLeaderboardByWinRate(winRateData);
      setLeaderboardByGames(gamesData);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], metric: 'wins' | 'win_rate' | 'total_games') => {
    if (loading) {
      return (
        <div className="text-center py-4 text-gray-500">
          <Icon icon="mdi:loading" className="w-6 h-6 animate-spin inline-block" />
        </div>
      );
    }

    if (entries.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          {t("leaderboard.noData")}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const displayName = entry.users?.display_name || entry.users?.username || "Unknown";
          let value: string;
          
          if (metric === 'wins') {
            value = `${entry.wins} ${t("leaderboard.wins")}`;
          } else if (metric === 'win_rate') {
            value = `${entry.win_rate.toFixed(1)}%`;
          } else {
            value = `${entry.total_games} ${t("leaderboard.games")}`;
          }

          const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
          const rankIcons = ["mdi:trophy", "mdi:medal", "mdi:medal"];

          return (
            <div
              key={entry.user_id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-center w-8">
                {index < 3 ? (
                  <Icon
                    icon={rankIcons[index]}
                    className="w-6 h-6"
                    style={{ color: rankColors[index] }}
                  />
                ) : (
                  <span className="text-gray-500 font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{displayName}</div>
                <div className="text-sm text-gray-500">{value}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Icon
            icon="mdi:podium"
            className="w-5 h-5"
            style={{ color: "#6b7280" }}
          />
          {t("leaderboard.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="wins" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wins">{t("leaderboard.byWins")}</TabsTrigger>
            <TabsTrigger value="winRate">{t("leaderboard.byWinRate")}</TabsTrigger>
            <TabsTrigger value="games">{t("leaderboard.byGames")}</TabsTrigger>
          </TabsList>
          <TabsContent value="wins" className="mt-4">
            {renderLeaderboard(leaderboardByWins, 'wins')}
          </TabsContent>
          <TabsContent value="winRate" className="mt-4">
            {renderLeaderboard(leaderboardByWinRate, 'win_rate')}
          </TabsContent>
          <TabsContent value="games" className="mt-4">
            {renderLeaderboard(leaderboardByGames, 'total_games')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
