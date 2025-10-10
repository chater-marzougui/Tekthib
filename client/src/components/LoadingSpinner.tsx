import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  isConnected?: boolean;
}
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ isConnected }) => {
    const { t } = useTranslation();

  return (
    <div className="h-full w-full bg-background flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Animated Card with Rotating Suits */}
        <div className="relative w-32 h-44 mx-auto">
          {/* Main Card */}
          <div className="absolute inset-0 bg-white rounded-xl shadow-2xl border-2 border-gray-300 overflow-hidden">
            {/* Card corners */}
            <div className="absolute top-2 left-2 flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">A</span>
            </div>
            <div className="absolute bottom-2 right-2 flex flex-col items-center rotate-180">
              <span className="text-xl font-bold text-foreground">A</span>
            </div>
            
            {/* Center rotating suits */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-16 h-16">
                {/* Hearts */}
                <div className="absolute inset-0 flex items-center justify-center animate-[spin_2s_linear_infinite]">
                  <span className="text-5xl text-red-600">♥</span>
                </div>
                {/* Spades - 90deg offset */}
                <div className="absolute inset-0 flex items-center justify-center animate-[spin_2s_linear_infinite] opacity-0 [animation-delay:0.5s]" style={{animation: 'spin 2s linear infinite, fadeInOut 2s linear infinite'}}>
                  <span className="text-5xl text-black">♠</span>
                </div>
                {/* Diamonds - 180deg offset */}
                <div className="absolute inset-0 flex items-center justify-center animate-[spin_2s_linear_infinite] opacity-0 [animation-delay:1s]" style={{animation: 'spin 2s linear infinite, fadeInOut 2s linear infinite 1s'}}>
                  <span className="text-5xl text-red-600">♦</span>
                </div>
                {/* Clubs - 270deg offset */}
                <div className="absolute inset-0 flex items-center justify-center animate-[spin_2s_linear_infinite] opacity-0 [animation-delay:1.5s]" style={{animation: 'spin 2s linear infinite, fadeInOut 2s linear infinite 1.5s'}}>
                  <span className="text-5xl text-black">♣</span>
                </div>
              </div>
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