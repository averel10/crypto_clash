import { useState, useEffect } from "react";
import Web3 from "web3";
import { Button } from "./Button";
import { Input } from "./Input";

interface CommitProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
  selectedMove: string | null;
  setSelectedMove: (move: string | null) => void;
  secret: string;
  setSecret: (secret: string) => void;
  onBothPlayersCommitted?: () => void;
}

type Move = "1" | "2" | "3" | null;
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
  onBothPlayersCommitted,
}: Readonly<CommitProps>) {
  const [loading, setLoading] = useState(false);
  const [playMove, setPlayMove] = useState<string>("");
  const [bothPlayed, setBothPlayed] = useState<string>("");
  const [autoCheckInterval, setAutoCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [moveSubmitted, setMoveSubmitted] = useState(false);

  // Generate random secret on mount if not already set
  useEffect(() => {
    if (!secret) {
      const randomHex = Math.random().toString(16).slice(2, 18);
      setSecret(randomHex);
    }
  }, []);

  // Update encrypted move when move or secret changes
  useEffect(() => {
    if (selectedMove && secret) {
      const clearMove = `${selectedMove}-${secret}`;
      // Use keccak256 (Ethereum's standard hash function)
      const hash = Web3.utils.keccak256(clearMove);
      setPlayMove(hash);
    }
  }, [selectedMove, secret]);

  // Auto-check if both players have committed and trigger callback
  useEffect(() => {
    if (!contract || !account || !playMove || bothPlayed === "true") {
      // Clear interval if conditions not met or already both played
      if (autoCheckInterval) clearInterval(autoCheckInterval);
      setAutoCheckInterval(null);
      return;
    }

    // Check immediately on mount or when dependencies change
    const checkBothPlayed = async () => {
      try {
        const res = await contract.methods.bothPlayed().call({ from: account });
        if (res) {
          setBothPlayed("true");
          if (onBothPlayersCommitted) {
            onBothPlayersCommitted();
          }
        }
      } catch (err: any) {
        console.error("Auto-check failed:", err.message);
      }
    };

    checkBothPlayed();

    // Set up interval to check every 2 seconds
    const interval = setInterval(checkBothPlayed, 2000);
    setAutoCheckInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [contract, account, playMove, bothPlayed, onBothPlayersCommitted]);

  // Commit phase read-only handlers
  const handlePlay = async () => {
    if (!contract || !web3 || !account || !playMove) return;
    setLoading(true);
    setStatus("");
    try {
      // playMove should be a hex string (bytes32)
      const tx = contract.methods.play(playMove);
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
      setStatus("Play tx sent: " + result);
      setMoveSubmitted(true);
    } catch (err: any) {
      setStatus("Play failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateSecret = () => {
    const randomHex = Math.random().toString(16).slice(2, 18);
    setSecret(randomHex);
  };

  return (
    <div className="border p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">
      <h2 className="font-semibold text-lg mb-6 text-slate-900 dark:text-white">
        Select Your Move
      </h2>

      {moveSubmitted ? (
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
                  onClick={() => setSelectedMove(move)}
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
                onChange={(e) => setSecret(e.target.value)}
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
    </div>
  );
}
