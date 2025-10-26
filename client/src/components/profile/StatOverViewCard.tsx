import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { UserProfile } from "shared";

const StatCard: React.FC<{
  title: string;
  value: string | number;
  textColor?: string;
}> = ({ title, value, textColor = "text-gray-700" }) => (
  <CardContent className="pt-2 text-center">
    <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
    <div className="text-sm text-muted-foreground mt-2">{title}</div>
  </CardContent>
);

const DetailledStatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  details?: string;
}> = ({ title, value, icon, iconColor, details }) => (
  <Card>
    <CardContent className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon icon={icon} className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {details && (
        <div className="text-xs text-muted-foreground mt-1">{details}</div>
      )}
    </CardContent>
  </Card>
);

interface StatOverviewProps {
  profile: UserProfile;
}

export default function StatOverview({ profile }: Readonly<StatOverviewProps>) {
  const { t } = useTranslation();
  const statsMap = [
    {
      title: t("profile.totalGames"),
      value: profile.stats.total_games,
      textColor: "text-blue-600",
    },
    {
      title: t("profile.wins"),
      value: profile.stats.wins,
      textColor: "text-green-600",
    },
    {
      title: t("profile.losses"),
      value: profile.stats.losses,
      textColor: "text-red-600",
    },
    {
      title: t("profile.winRate"),
      value: `${profile.stats.win_rate.toFixed(1)}%`,
      textColor: "text-purple-600",
    },
  ];

  const detailledStatsMap = [
    {
      title: t("profile.bluffSuccess"),
      value: `${profile.stats.bluff_success_rate.toFixed(1)}%`,
      icon: "mdi:emoticon-devil",
      iconColor: "text-purple-500",
      details: `${profile.stats.successful_bluffs}/${profile.stats.total_bluffs}`,
    },
    {
      title: t("profile.challengeSuccess"),
      value: `${profile.stats.challenge_success_rate.toFixed(1)}%`,
      icon: "mdi:shield-check",
      iconColor: "text-green-500",
      details: `${profile.stats.successful_challenges}/${profile.stats.total_challenges}`,
    },
    {
      title: t("profile.cardsPlayed"),
      value: profile.stats.total_cards_played,
      icon: "mdi:cards",
      iconColor: "text-blue-500",
    },
  ];
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="mdi:chart-bar" className="w-5 h-5" />
          {t("profile.statistics")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsMap.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              textColor={stat.textColor}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {detailledStatsMap.map((stat) => (
            <DetailledStatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              iconColor={stat.iconColor}
              details={stat.details}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
