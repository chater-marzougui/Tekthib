import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

export default function QuickRulesCard() {
  const { t } = useTranslation();

  const rules = [
    {
      icon: "mdi:target",
      color: "#ef4444",
      titleKey: "home.goal",
      descKey: "home.goalDescription",
    },
    {
      icon: "mdi:cards-spade",
      color: "#3b82f6",
      titleKey: "home.gameplay",
      descKey: "home.gameplayDescription",
    },
    {
      icon: "mdi:emoticon-sad",
      color: "#f59e0b",
      titleKey: "home.bluffing",
      descKey: "home.bluffingDescription",
    },
    {
      icon: "mdi:trophy",
      color: "#eab308",
      titleKey: "home.specialRule",
      descKey: "home.specialRuleDescription",
    },
  ];

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Icon
            icon="mdi:layers"
            className="w-5 h-5"
            style={{ color: "#6b7280" }}
          />{" "}
          {t("home.quickRules")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {rules.map((rule) => (
            <div key={rule.titleKey}>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Icon
                  icon={rule.icon}
                  className="w-4 h-4"
                  style={{ color: rule.color }}
                />{" "}
                {t(rule.titleKey)}
              </h4>
              <p className="text-gray-600">{t(rule.descKey)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
