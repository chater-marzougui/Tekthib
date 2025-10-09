import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import i18n from "@/i18n";

const QuickRules = () => {
  const { t } = useTranslation();
  const currentLang = i18n.language || window.navigator.language;
  const direction = ["ar", "he", "fa", "ur"].includes(currentLang.split("-")[0])
    ? "rtl"
    : "ltr";

  return (
    <Card dir={direction}>
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
