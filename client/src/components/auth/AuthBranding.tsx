import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function AuthBranding() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex-1 text-center lg:text-left"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <motion.div
        animate={{
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="inline-block mb-6"
      >
        <img className="h-32 mb-4" src="/Tekthib/icons/logo-256.png" alt="Bluff Icon" />
      </motion.div>

      <p className="text-xl text-slate-500 dark:text-slate-300 mb-8">
        {t("auth.bluffSubtitle1")}
        <br />
        <span className="text-purple-400">{t("auth.bluffSubtitle2")}</span>
      </p>
    </motion.div>
  );
}
