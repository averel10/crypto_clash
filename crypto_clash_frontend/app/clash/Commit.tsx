import { useState, useEffect } from "react";
import Web3 from "web3";
import { Button } from "./Button";
import { Input } from "./Input";
import { GameDetails } from "./GameModal";
import { showToast } from "@/app/lib/toast";

interface CommitProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
  selectedMove: string | null;
  setSelectedMove: (move: string | null) => void;
  secret: string;
  whoAmI: "player1" | "player2" | "";
  gameDetails: GameDetails | null;
  setSecret: (secret: string) => void;
  savePlayMove: (playMove: string) => void;
}

type MoveName = "Rock" | "Paper" | "Scissors";

const MOVES: Record<string, { name: MoveName; icon: string }> = {
  "1": { name: "Rock", icon: "✊" },
  "2": { name: "Paper", icon: "✋" },
  "3": { name: "Scissors", icon: "✌️" },
};

export default function Commit({
  account,
  contract,
  config,
  web3,
  setStatus,
  selectedMove,
  setSelectedMove,
  secret,
  setSecret,
  savePlayMove,
  whoAmI,
  gameDetails
}: Readonly<CommitProps>) {
  const [loading, setLoading] = useState(false);
  const [playMove, setPlayMove] = useState<string>("");
  const [selfPlayed, setSelfPlayed] = useState<string>("");
  const [opponentPlayed, setOpponentPlayed] = useState<string>("");
  const [bothPlayed, setBothPlayed] = useState<string>("");
  const [autoCheckInterval, setAutoCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [moveSubmitted, setMoveSubmitted] = useState(false);
  const [commitTimeLeft, setCommitTimeLeft] = useState<number>(0);
  const [timeoutExpired, setTimeoutExpired] = useState(false);

  // Update encrypted move when move or secret changes
  useEffect(() => {
    if (selectedMove && secret) {
      const clearMove = `${selectedMove}-${secret}`;
      // Use keccak256 (Ethereum's standard hash function)
      const hash = Web3.utils.keccak256(clearMove);
      setPlayMove(hash);
      // Persist to sessionStorage through parent
      savePlayMove(hash);
    }
  }, [selectedMove, secret, savePlayMove]);

  // Auto-check if both players have committed and trigger callback
  useEffect(() => {
    if (!contract || !account || !whoAmI || !gameDetails) {
      // Clear interval if conditions not met or already both played
      if (autoCheckInterval) clearInterval(autoCheckInterval);
      setAutoCheckInterval(null);
      return;
    }

    const checkSelfPlayed = async () => {
      try {
        const encrMove = gameDetails[whoAmI === "player1" ? "playerA" : "playerB"].encrMove;

        setSelfPlayed(Number(encrMove) !== 0 ? "true" : "false");
      } catch (err: any) {
        console.error("Auto-check self played failed:", err.message);
      }
    };

    checkSelfPlayed();

    const checkOpponentPlayed = async () => {
      try {
        const opponentKey = whoAmI === "player1" ? "playerB" : "playerA";
        const encrMove = gameDetails[opponentKey].encrMove;
        setOpponentPlayed(Number(encrMove) !== 0 ? "true" : "false");
      } catch (err: any) {
        console.error("Auto-check opponent played failed:", err.message);
      }
    };

    checkOpponentPlayed();

    // Check immediately on mount or when dependencies change
    const checkBothPlayed = async () => {
      try {
        const playerAEncrMove = gameDetails.playerA.encrMove;
        const playerBEncrMove = gameDetails.playerB.encrMove;

        const res = Number(playerAEncrMove) !== 0 && Number(playerBEncrMove) !== 0;
        console.log("Both played check:", res);
        if (res) {
          setBothPlayed("true");
        }
      } catch (err: any) {
        console.error("Auto-check failed:", err.message);
      }
    };

    checkBothPlayed();

    // Check commit timeout
    const checkCommitTimeout = async () => {
      try {
        const timeLeft = await contract.methods.commitTimeLeft(gameDetails.returnGameId).call();
        console.log("Commit time left:", timeLeft);
        setCommitTimeLeft(Number(timeLeft));
        if (Number(timeLeft) <= 0) {
          setTimeoutExpired(true);
        }
      } catch (err: any) {
        console.error("Commit timeout check failed:", err.message);
      }
    };

    checkCommitTimeout();

    // Set up interval to check every 2 seconds
    const interval = setInterval(() => {
      checkBothPlayed();
      checkCommitTimeout();
    }, 2000);
    setAutoCheckInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [contract, account, playMove, bothPlayed, gameDetails]);

  // Commit phase read-only handlers
  const handlePlay = async () => {
    if (!contract || !web3 || !account || !playMove) return;
    setLoading(true);
    try {
      // playMove should be a hex string (bytes32)
      const tx = contract.methods.play(gameDetails?.returnGameId, playMove);
      const gas = await tx.estimateGas({ from: account });
      const result = await (globalThis as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: config?.GAME_CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas: web3.utils.toHex(gas),
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
          },
        ],
      });
      showToast("Play tx sent: " + result, "success");
      setMoveSubmitted(true);
    } catch (err: any) {
      showToast("Play failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const regenerateSecret = () => {
    const randomHex = Math.random().toString(16).slice(2, 18);
    setSecret(randomHex);
  };

  const handleSecretChange = (value: string) => {
    setSecret(value);
  };

  const handleMoveSelect = (move: string) => {
    setSelectedMove(move);
  };

  const handleResolveTimeout = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    try {
      const tx = contract.methods.resolveTimeout(gameDetails?.returnGameId);
      const gas = await tx.estimateGas({ from: account });
      const result = await (globalThis as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: config?.GAME_CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas: web3.utils.toHex(gas),
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
          },
        ],
      });
      showToast("Timeout resolved: " + result, "success");
    } catch (err: any) {
      console.error("Timeout resolution failed:", err);
      showToast("Timeout resolution failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Check if current player can resolve timeout (they committed, opponent didn't, and game is still active)
  const canResolveTimeout = timeoutExpired && selfPlayed === "true" && gameDetails?.isActive;

  // Check if game is finished due to timeout
  const isGameFinishedByTimeout = !gameDetails?.isActive && (Number(gameDetails?.outcome) === 4 || Number(gameDetails?.outcome) === 5);

  // Determine if current player won/lost the timeout
  const didIWinTimeout = 
    (whoAmI === "player2" && Number(gameDetails?.outcome) === 4) || 
    (whoAmI === "player1" && Number(gameDetails?.outcome) === 5);

  return (
    <div className="border p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">

      {/* Show timeout result after game is inactive */}
      {isGameFinishedByTimeout ? (
        <div className="flex flex-col items-center justify-center py-16">
          {didIWinTimeout ? (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border-2 border-green-400 dark:border-green-600 rounded-lg w-full">
              <p className="text-green-700 dark:text-green-200 font-semibold mb-3 text-center">
                🎉 Victory by Timeout!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 text-center">
                Your opponent failed to commit in time. You claimed victory!
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-2 border-red-400 dark:border-red-600 rounded-lg w-full">
              <p className="text-red-700 dark:text-red-200 font-semibold mb-3 text-center">
                ⏱️ Timeout Loss
              </p>
              <p className="text-sm text-red-600 dark:text-red-300 text-center">
                You failed to commit in time. Your opponent claimed victory!
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Timeout Warning - Only show to eligible player */}
          {timeoutExpired && canResolveTimeout ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-2 border-red-400 dark:border-red-600 rounded-lg w-full">
                <p className="text-red-700 dark:text-red-200 font-semibold mb-3 text-center">
                  ⏱️ Commit phase timeout expired!
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4 text-center">
                  The opponent failed to commit in time. You can claim victory!
                </p>
                <Button
                  onClick={handleResolveTimeout}
                  disabled={loading || !account || !contract}
                  variant="primary"
                  className="w-full py-3 text-lg"
                >
                  {loading ? "Processing..." : "⚡ Resolve Timeout"}
                </Button>
              </div>
            </div>
          ) : timeoutExpired && !canResolveTimeout ? (
            // Show waiting message to opponent
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-6">
                <div className="w-16 h-16 border-4 border-slate-300 dark:border-slate-500 border-t-red-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Opponent claiming victory...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                The timeout has expired. Waiting for the opponent to resolve.
              </p>
            </div>
          ) : (
            <>
              {/* Time Left Display */}
              {commitTimeLeft > 0 && opponentPlayed === "true" && (
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 text-center font-semibold">
                    ⏱️ Time Left: {commitTimeLeft}s
                  </p>
                </div>
              )}

              {moveSubmitted || selfPlayed === "true" ? (
                // Waiting animation after move is submitted
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-6">
                    <div className="w-16 h-16 border-4 border-slate-300 dark:border-slate-500 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Waiting for opponent...
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your move has been submitted. Stand by while the other player commits.
                  </p>
                </div>
              ) : (
                <>
                  {/* Move Selection */}
                  <div className="mb-8">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-medium">
                      Choose your move:
                    </p>
                    <div className="flex gap-4 justify-center">
                      {(["1", "2", "3"] as const).map((move) => (
                        <button
                          key={move}
                          onClick={() => handleMoveSelect(move)}
                          className={`flex flex-col items-center justify-center p-6 rounded-lg transition-all transform ${
                            selectedMove === move
                              ? "bg-blue-500 text-white shadow-lg scale-110"
                              : "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow hover:shadow-md hover:scale-105"
                          }`}
                        >
                          <span className="text-5xl mb-2">{MOVES[move].icon}</span>
                          <span className="font-semibold text-sm">{MOVES[move].name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secret Input */}
                  <div className="mb-8 bg-white dark:bg-slate-700 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Secret:
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={secret}
                        onChange={(e) => handleSecretChange(e.target.value)}
                        placeholder="Your secret passphrase"
                        className="flex-1"
                      />
                      <Button
                        onClick={regenerateSecret}
                        variant="secondary"
                        disabled={loading}
                      >
                        🔄 New
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Keep this secret safe! It's needed to reveal your move later.
                    </p>
                  </div>

                  {/* Encrypted Move Display */}
                  <div className="mb-8 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-slate-700 dark:text-blue-200 mb-2">
                      Encrypted Move (to be sent):
                    </label>
                    <div className="bg-white dark:bg-slate-700 p-3 rounded border border-blue-200 dark:border-blue-700 overflow-x-auto">
                      <code className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">
                        {playMove || "Select a move and enter a secret"}
                      </code>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handlePlay}
                      disabled={loading || !account || !contract || !selectedMove || !secret}
                      variant="primary"
                      className="w-full py-3 text-lg"
                    >
                      {loading ? "Submitting..." : "Submit Move"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
