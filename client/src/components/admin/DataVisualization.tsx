import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

interface DbStats {
  totalUsers: number;
  totalGames: number;
  gamesLast24h: number;
}

interface DataVisualizationProps {
  baseUrl: string;
  password: string;
}

export default function DataVisualization({
  baseUrl,
  password,
}: DataVisualizationProps) {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/admin/db/stats?password=${encodeURIComponent(password)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch database statistics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="text-center py-8">
        <Icon icon="mdi:loading" className="w-8 h-8 animate-spin mx-auto" />
        <p className="mt-2 text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Database Statistics</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon icon="mdi:account-group" className="w-5 h-5" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">
              {stats?.totalUsers || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon icon="mdi:gamepad-variant" className="w-5 h-5" />
              Total Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">
              {stats?.totalGames || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Completed games
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon icon="mdi:clock-outline" className="w-5 h-5" />
              Games (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-600">
              {stats?.gamesLast24h || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Games in last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:information" className="w-5 h-5" />
            About Database Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Users:</strong> View, edit, and delete user accounts. Deleting a user will cascade delete all their game history and stats.
          </p>
          <p>
            • <strong>Games:</strong> View completed game records with detailed information. Delete games to clean up old data.
          </p>
          <p>
            • <strong>Statistics:</strong> Real-time overview of database metrics, updated every 30 seconds.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
