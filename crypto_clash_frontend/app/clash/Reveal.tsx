import { useState, useEffect } from "react";
import Web3 from "web3";
import { Button } from "./Button";

interface RevealProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
  selectedMove: string | null;
  secret: string;
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
}: Readonly<RevealProps>) {
  const [loading, setLoading] = useState(false);
  const [bothRevealed, setBothRevealed] = useState(false);
  const [playerARevealed, setPlayerARevealed] = useState(false);
  const [playerBRevealed, setPlayerBRevealed] = useState(false);
  const [revealTimeLeft, setRevealTimeLeft] = useState<number>(0);
  const [outcome, setOutcome] = useState<number>(0);
  const [revealed, setRevealed] = useState(false);

  const clearMove = selectedMove && secret ? `${selectedMove}-${secret}` : "";

  // Check game status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!contract) return;
      try {
        const [br, par, pbr, rtl, out] = await Promise.all([
          await contract.methods.bothRevealed().call({ from : account}),
          await contract.methods.playerARevealed().call({ from : account}),
          await contract.methods.playerBRevealed().call({ from : account}),
          await contract.methods.revealTimeLeft().call({ from : account}),
          await contract.methods.getLastWinner().call({ from : account}),
        ]);

        console.log("Status:", {
          br, par, pbr, rtl, out
        });
        setBothRevealed(br);
        setPlayerARevealed(par);
        setPlayerBRevealed(pbr);
        setRevealTimeLeft(Number(rtl));
        setOutcome(Number(out));
      } catch (err: any) {
        console.error("Failed to check status:", err);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, [contract, account]);

  const handleReveal = async () => {
    if (!contract || !web3 || !account || !clearMove) return;
    setLoading(true);
    setStatus("");
    try {
      const tx = contract.methods.reveal(clearMove);
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
      setStatus("✅ Reveal tx sent: " + result);
      setRevealed(true);
    } catch (err: any) {
      setStatus("❌ Reveal failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetOutcome = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    setStatus("");
    try {
      const tx = contract.methods.getOutcome();
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
      setStatus("✅ Claim tx sent: " + result);
    } catch (err: any) {
      setStatus("❌ Claim failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const outcomeData = OUTCOMES[outcome] || OUTCOMES[0];

  return (
    <div className="space-y-6">
      {/* Your Move Section */}
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

      {/* Game Status Section */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-lg text-center ${
            playerARevealed
              ? "bg-green-50 dark:bg-green-900"
              : "bg-slate-100 dark:bg-slate-700"
          }`}
        >
          <p className="text-2xl mb-1">{playerARevealed ? "✅" : "⏳"}</p>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Player A
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {playerARevealed ? "Revealed" : "Waiting"}
          </p>
        </div>
        <div
          className={`p-4 rounded-lg text-center ${
            playerBRevealed
              ? "bg-green-50 dark:bg-green-900"
              : "bg-slate-100 dark:bg-slate-700"
          }`}
        >
          <p className="text-2xl mb-1">{playerBRevealed ? "✅" : "⏳"}</p>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Player B
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {playerBRevealed ? "Revealed" : "Waiting"}
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
            {revealTimeLeft > 0 ? `${revealTimeLeft}s` : "Expired"}
          </p>
        </div>
      </div>

      {/* Reveal Section */}
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
          disabled={loading || !account || !contract || !clearMove || revealed}
          variant="primary"
          className="w-full py-3 text-lg"
        >
          {loading ? "Submitting..." : revealed ? "✅ Revealed" : "Reveal Move"}
        </Button>
      </div>

      {/* Winner Section - Only show if both revealed */}
      {bothRevealed && (
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
            className={`text-2xl font-bold mb-2 ${
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
          <Button
            onClick={handleGetOutcome}
            disabled={loading || !account || !contract}
            variant="primary"
            className="mt-4 w-full py-3 text-lg"
          >
            {loading ? "Processing..." : "💰 Claim Coins"}
          </Button>
        </div>
      )}

      {/* Status Messages */}
      {!bothRevealed && !revealed && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⏳ Waiting for both players to reveal...
          </p>
        </div>
      )}
    </div>
  );
}
