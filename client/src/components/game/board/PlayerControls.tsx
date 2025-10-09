import { Button } from "@/components/ui/button";
import { playableRanks } from "@shared";

interface PlayerControlsProps {
  isMyTurn: boolean;
  canPlay: boolean;
  setClaimedRank: (rank: string) => void;
  claimedRank: string | null;
  selectedCards: string[];
  handlePlayCards: () => void;
  lastPlay: { player: string; cardCount: number; claimedRank: string } | null;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isMyTurn,
  canPlay,
  setClaimedRank,
  claimedRank,
  selectedCards,
  handlePlayCards,
  lastPlay,
}) => {
  if (!isMyTurn || !canPlay) return null;
  return (
    <div className="flex flex-col justify-center items-center border-white/20 rounded-lg p-0 space-y-4 align-center">
      {!lastPlay && (
        <div className="space-y-3">
          <label
            htmlFor="claimed-rank"
            className="text-sm font-medium text-white"
          >
            Claim this rank:
          </label>
          <div className="flex flex-wrap gap-2 justify-center">
            {playableRanks.map((rank) => (
              <button
                key={rank}
                onClick={() => setClaimedRank(rank)}
                className={`
                  min-w-[40px] py-2 px-3 rounded-md font-bold text-base transition-all
                  ${
                    claimedRank === rank
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  }
                `}
              >
                {rank}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center w-fit">
        <Button
          onClick={handlePlayCards}
          disabled={selectedCards.length === 0 || (!lastPlay && !claimedRank)}
          size="lg"
          className={`
            px-6 py-4 text-base font-semibold rounded-lg transition-all
            ${
              selectedCards.length > 0 && (claimedRank || lastPlay)
                ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            Play Cards
          </span>
        </Button>
      </div>
    </div>
  );
};

export default PlayerControls;
