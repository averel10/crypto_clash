import { useState, useEffect } from "react";
import Web3 from "web3";
import { Button } from "./Button";
import { GameDetails } from "./GameModal";
import { showSuccessToast, showErrorToast } from "@/app/lib/toast";

interface RevealProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
  selectedMove: string | null;
  secret: string;
  gameDetails: GameDetails | null;
  whoAmI: "player1" | "player2" | "";
}

type MoveName = "Rock" | "Paper" | "Scissors";

const MOVES: Record<string, { name: MoveName; icon: string }> = {
  "1": { name: "Rock", icon: "✊" },
  "2": { name: "Paper", icon: "✋" },
  "3": { name: "Scissors", icon: "✌️" },
};

const OUTCOMES: Record<number, { name: string; emoji: string; color: string }> =
  {
    0: { name: "None", emoji: "❓", color: "gray" },
    1: { name: "You Won!", emoji: "🏆", color: "green" },
    2: { name: "You Lost", emoji: "😢", color: "red" },
    3: { name: "Draw", emoji: "🤝", color: "yellow" },
  };

export default function Reveal({
  account,
  contract,
  config,
  web3,
  setStatus,
  selectedMove,
  secret,
  gameDetails,
  whoAmI,
}: Readonly<RevealProps>) {
  const [loading, setLoading] = useState(false);
  const [selfRevealed, setSelfRevealed] = useState(false);
  const [opponentRevealed, setOpponentRevealed] = useState(false);
  const [bothRevealed, setBothRevealed] = useState(false);
  const [outcome, setOutcome] = useState<number>(0);

  const clearMove = selectedMove && secret ? `${selectedMove}-${secret}` : "";

  // Check game status on mount
  useEffect(() => {
    const setStateFromGameDetails = () => {
      if (!gameDetails) return;
      const playerARevealed = Number(gameDetails.playerA.move) !== 0;
      const playerBRevealed = Number(gameDetails.playerB.move) !== 0;

      setSelfRevealed(
        (whoAmI === "player1" && playerARevealed) ||
        (whoAmI === "player2" && playerBRevealed)
      );
      setOpponentRevealed(
        (whoAmI === "player1" && playerBRevealed) ||
        (whoAmI === "player2" && playerARevealed)
      );
      setBothRevealed(playerARevealed && playerBRevealed);
      if(bothRevealed){
        if(Number(gameDetails.outcome) === 1 && whoAmI === "player1") setOutcome(1);
        else if(Number(gameDetails.outcome) === 2 && whoAmI === "player2") setOutcome(1);
        else if(Number(gameDetails.outcome) === 1 && whoAmI === "player2") setOutcome(2);
        else if(Number(gameDetails.outcome) === 2 && whoAmI === "player1") setOutcome(2);
        else setOutcome(3);
      }
    };

    setStateFromGameDetails();
  }, [gameDetails, contract, account, whoAmI]);

  const handleReveal = async () => {
    if (!contract || !web3 || !account || !clearMove) return;
    setLoading(true);
    try {
      const tx = contract.methods.reveal(gameDetails?.returnGameId, clearMove);
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
      showSuccessToast("Reveal tx sent: " + result);
    } catch (err: any) {
      showErrorToast("Reveal failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetOutcome = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    try {
      const tx = contract.methods.getOutcome(gameDetails?.returnGameId);
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
      showSuccessToast("Claim tx sent: " + result);
    } catch (err: any) {
      console.error(err);
      showErrorToast("Claim failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const outcomeData = OUTCOMES[outcome] || OUTCOMES[0];

  return (
    <div className="space-y-6">
      {/* Your Move Section - Hidden when both revealed */}
      {!bothRevealed && (
        <div className="border p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">
          <h2 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
            Your Move
          </h2>
          {selectedMove ? (
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-6xl mb-2">{MOVES[selectedMove].icon}</span>
                <span className="font-semibold text-lg">
                  {MOVES[selectedMove].name}
                </span>
              </div>
              <div className="text-3xl text-slate-400">→</div>
              <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                  Clear Move:
                </p>
                <code className="text-sm font-mono text-slate-700 dark:text-slate-200">
                  {clearMove}
                </code>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-600 dark:text-slate-400">
              No move selected yet
            </p>
          )}
        </div>
      )}

      {/* Game Status Section - Hidden when both revealed */}
      {!bothRevealed && (
        <div className="grid grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-lg text-center ${
              selfRevealed
                ? "bg-green-50 dark:bg-green-900"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <p className="text-2xl mb-1">{selfRevealed ? "✅" : "⏳"}</p>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Me
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selfRevealed ? "Revealed" : "Waiting"}
            </p>
          </div>
          <div
            className={`p-4 rounded-lg text-center ${
              opponentRevealed
                ? "bg-green-50 dark:bg-green-900"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <p className="text-2xl mb-1">{opponentRevealed ? "✅" : "⏳"}</p>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Opponent
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {opponentRevealed ? "Revealed" : "Waiting"}
            </p>
          </div>
          <div className="p-4 rounded-lg text-center bg-blue-50 dark:bg-blue-900">
            <p className="text-sm font-mono text-slate-600 dark:text-slate-300">
              ⏱️
            </p>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Time Left
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {0}
            </p>
          </div>
        </div>
      )}

      {/* Reveal Section - Hidden when both revealed */}
      {!bothRevealed && (
        <div className="border-2 border-blue-300 dark:border-blue-600 p-6 rounded-lg bg-blue-50 dark:bg-slate-700">
          <h2 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
            Reveal Your Move
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Submit your clear move and secret to the blockchain. This proves you
            didn't cheat!
          </p>
          <Button
            onClick={handleReveal}
            disabled={loading || !account || !contract || !clearMove || selfRevealed}
            variant="primary"
            className="w-full py-3 text-lg"
          >
            {loading ? "Submitting..." : selfRevealed ? "✅ Revealed" : "Reveal Move"}
          </Button>
        </div>
      )}

      {/* Winner Section - Only show if both revealed */}
      {bothRevealed && (
        <div className="space-y-4">
          {/* Moves Comparison */}
          <div className="border-2 border-slate-300 dark:border-slate-600 p-6 rounded-lg bg-slate-50 dark:bg-slate-800">
            <h2 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white text-center">
              Final Moves
            </h2>
            <div className="flex items-center justify-center gap-8">
              {/* Your Move (always on left) */}
              <div className="flex flex-col items-center">
                <span className="text-6xl mb-2">
                  {gameDetails && MOVES[String(whoAmI === "player1" ? gameDetails.playerA.move : gameDetails.playerB.move)]?.icon}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  You
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {gameDetails && MOVES[String(whoAmI === "player1" ? gameDetails.playerA.move : gameDetails.playerB.move)]?.name}
                </span>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center">
                <span className="text-4xl text-slate-400 dark:text-slate-500">
                  VS
                </span>
              </div>

              {/* Opponent Move (always on right) */}
              <div className="flex flex-col items-center">
                <span className="text-6xl mb-2">
                  {gameDetails && MOVES[String(whoAmI === "player1" ? gameDetails.playerB.move : gameDetails.playerA.move)]?.icon}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Opponent
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {gameDetails && MOVES[String(whoAmI === "player1" ? gameDetails.playerB.move : gameDetails.playerA.move)]?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Outcome Section */}
          <div
            className={`border-2 p-6 rounded-lg text-center ${
              outcomeData.color === "green"
                ? "border-green-400 bg-green-50 dark:bg-green-900 dark:border-green-600"
                : outcomeData.color === "red"
                  ? "border-red-400 bg-red-50 dark:bg-red-900 dark:border-red-600"
                  : outcomeData.color === "yellow"
                    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-600"
                    : "border-slate-400 bg-slate-100 dark:bg-slate-700 dark:border-slate-600"
            }`}
          >
            <p
              className={`text-6xl mb-3 ${
                outcomeData.color === "green"
                  ? "text-green-600 dark:text-green-400"
                  : outcomeData.color === "red"
                    ? "text-red-600 dark:text-red-400"
                    : outcomeData.color === "yellow"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {outcomeData.emoji}
            </p>
            <h3
              className={`text-2xl font-bold ${
                outcomeData.color === "green"
                  ? "text-green-700 dark:text-green-300"
                  : outcomeData.color === "red"
                    ? "text-red-700 dark:text-red-300"
                    : outcomeData.color === "yellow"
                      ? "text-yellow-700 dark:text-yellow-300"
                      : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {outcomeData.name}
            </h3>

            {/* Display ETH winnings */}
            {gameDetails && (
              <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  {outcome === 1 ? "You Won" : outcome === 3 ? "Draw" : "You Lost"}
                </p>
                <p className="text-3xl font-bold">
                  {outcome === 1 ? (
                    <>
                      +{web3?.utils.fromWei(String(BigInt(gameDetails.initialBet) * BigInt(2)), "ether")} ETH
                    </>
                  ) : outcome === 3 ? (
                    <>
                      +{web3?.utils.fromWei(gameDetails.initialBet, "ether")} ETH
                    </>
                  ) : (
                    <>
                      -{web3?.utils.fromWei(gameDetails.initialBet, "ether")} ETH
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Show Claim Coins button only on win or draw and if game is active */}
            {(outcome === 1 || outcome === 3) && gameDetails?.isActive && (
              <Button
                onClick={handleGetOutcome}
                disabled={loading || !account || !contract}
                variant="primary"
                className="mt-4 w-full py-3 text-lg"
              >
                {loading ? "Processing..." : "💰 Claim Coins"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
