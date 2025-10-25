import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface AuthCardProps {
  readonly children: React.ReactNode;
  readonly isLogin: boolean;
  readonly onToggleMode: (isLogin: boolean) => void;
  readonly isLoading: boolean;
}

export default function AuthCard({
  children,
  isLogin,
  onToggleMode,
  isLoading,
}: Readonly<AuthCardProps>) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex-1 w-full max-w-md perspective"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      {/* Card stack effect */}
      <div className="relative">
        {/* Shadow cards - these rotate and swap z-index */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl pointer-events-none"
          animate={{
            rotate: isLogin ? -3 : 3,
            x: isLogin ? -8 : 8,
            y: isLogin ? -8 : 8,
            zIndex: isLogin ? 1 : 3,
          }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-red-600 to-purple-600 rounded-3xl pointer-events-none"
          animate={{
            rotate: isLogin ? -1.5 : 1.5,
            x: isLogin ? -4 : 4,
            y: isLogin ? -4 : 4,
            zIndex: 2,
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Main card */}
        <motion.div
          className="relative bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-purple-500/30"
          animate={{
            scale: 1,
            zIndex: 4,
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.5 }}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />

          {/* Card corners */}
          <div className="absolute top-4 left-4 text-purple-400 font-black text-xl">
            {isLogin ? "L" : "S"}
          </div>
          <div className="absolute bottom-4 right-4 text-purple-400 font-black text-xl rotate-180">
            {isLogin ? "L" : "S"}
          </div>

          <div className="p-8 relative z-10">
            {/* Toggle buttons */}
            <div className="flex gap-2 mb-8 bg-slate-800/50 p-2 rounded-2xl">
              <motion.button
                onClick={() => !isLoading && onToggleMode(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                  isLogin
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                whileHover={{ scale: isLogin ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                {t("auth.login")}
              </motion.button>
              <motion.button
                onClick={() => !isLoading && onToggleMode(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                  isLogin
                    ? "text-slate-400 hover:text-white"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                }`}
                whileHover={{ scale: isLogin ? 1.05 : 1 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                {t("auth.signup")}
              </motion.button>
            </div>

            {/* Form content */}
            {children}

            {/* Fun footer message */}
            <motion.p
              className="text-center text-xs text-slate-500 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {isLogin
                ? t("auth.footerNewPlayer")
                : t("auth.footerAlreadyPro")}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
