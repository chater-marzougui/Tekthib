import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useTextDirection } from "@/hooks/useTextDirection";

const QuickRules = () => {
  const { t } = useTranslation();
  const direction = useTextDirection();

  return (
    <Card dir={direction} className="lg:max-w-sm min-w-32">
      <CardHeader>
        <CardTitle>{t("quickRules.title")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div>• {t("quickRules.rule1")}</div>
        <div>• {t("quickRules.rule2")}</div>
        <div>• {t("quickRules.rule3")}</div>
        <div>• {t("quickRules.rule4")}</div>
        <div>• {t("quickRules.rule5")}</div>
      </CardContent>
    </Card>
  );
};

export default QuickRules;
