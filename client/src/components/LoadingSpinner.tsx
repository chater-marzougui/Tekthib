import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  isConnected?: boolean;
}
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ isConnected }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-background flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Animated Card with Rotating Suits */}
        <div className="relative w-32 h-44 mx-auto">
          {/* Main Card */}
          <div className="flex flex-col h-full inset-0 bg-white rounded-xl shadow-2xl border-2 border-gray-300 overflow-hidden">
            {/* Card corners */}
            <div className="absolute top-2 left-2 flex flex-col items-center">
              <span className="text-xl font-bold text-red-600">A</span>
            </div>

            {/* Center rotating suits */}
            <div className="h-full flex items-center justify-center">
              {/* Hearts */}
              <div className="absolute left-2 top-10 w-4 h-4 inset-0 flex items-center justify-center animate-[spin_2s_linear_infinite]">
                <span className="text-4xl text-red-600">♥</span>
              </div>

              <div className="flex items-center w-16">
                <img src={"/Tekthib/icons/logo-96.png"} alt={"Tekthib Logo"} draggable="false" />
              </div>
              {/* Spades - 90deg offset */}
              <div className="absolute right-2 bottom-10 w-4 h-4 flex items-center justify-center animate-[spin_2s_linear_infinite]">
                <span className="text-4xl text-black">♠</span>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 flex flex-col items-center rotate-180">
              <span className="text-xl font-bold text-black">A</span>
            </div>
          </div>

          {/* Card shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-xl animate-pulse"></div>
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <p className="text-foreground text-lg font-medium">
              {t("game.loadingGame")}
            </p>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>

          {isConnected !== undefined && !isConnected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 inline-block">
              <p className="text-yellow-600 text-sm">
                {t("game.connectingToServer")}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          25%, 75% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
