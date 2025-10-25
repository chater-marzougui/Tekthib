import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface BluffMeterProps {
  readonly progress: number;
}

export default function BluffMeter({ progress }: Readonly<BluffMeterProps>) {
  const { t } = useTranslation();
  const playfulMessages = [
    t("auth.bluffMeterMessage1"),
    t("auth.bluffMeterMessage2"),
    t("auth.bluffMeterMessage3"),
    t("auth.bluffMeterMessage4"),
    t("auth.bluffMeterMessage5"),
    t("auth.bluffMeterMessage6"),
  ];
  
  const playfulMessage = playfulMessages[Math.floor(progress / 20)];

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20"
      whileHover={{ scale: 1.05 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{t("auth.bluffMeter")}</span>
        <span className="text-sm text-purple-400 font-bold">{progress}%</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2 italic">{playfulMessage}</p>
    </motion.div>
  );
}
