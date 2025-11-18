import { useState } from "react";

interface RevealProps {
  revealMove: string;
  setRevealMove: (v: string) => void;
  handleReveal: () => void;
  loading: boolean;
  account: string;
  contract: any;
  bothRevealed: string;
  handleBothRevealed: () => void;
  playerARevealed: string;
  handlePlayerARevealed: () => void;
  playerBRevealed: string;
  handlePlayerBRevealed: () => void;
}

export default function Reveal({
  revealMove,
  setRevealMove,
  handleReveal,
  loading,
  account,
  contract,
  bothRevealed,
  handleBothRevealed,
  playerARevealed,
  handlePlayerARevealed,
  playerBRevealed,
  handlePlayerBRevealed,
}: Readonly<RevealProps>) {
  const [revealTimeLeft, setRevealTimeLeft] = useState<string>("");

  const handleRevealTimeLeft = async () => {
    if (!contract) return;
    try {
      const res = await contract.methods.revealTimeLeft().call();
      setRevealTimeLeft(res.toString());
    } catch (err: any) {
      console.error("Failed to fetch revealTimeLeft: " + err.message);
    }
  };
  return (
    <div className="border p-4 rounded-lg">
      <h2 className="font-semibold mb-2">reveal(string clearMove)</h2>
      <input
        type="text"
        placeholder="Clear Move (e.g. 1-password)"
        value={revealMove}
        onChange={(e) => setRevealMove(e.target.value)}
        className="border px-2 py-1 mr-2 rounded"
      />
      <button
        onClick={handleReveal}
        disabled={loading || !account || !contract}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Reveal
      </button>

      <div className="mt-4 space-y-2">
        <button
          onClick={handleBothRevealed}
          className="bg-gray-200 px-2 py-1 rounded"
        >
          bothRevealed
        </button>
        <span className="ml-2 text-xs">{bothRevealed}</span>
        <br />
        <button
          onClick={handlePlayerARevealed}
          className="bg-gray-200 px-2 py-1 rounded"
        >
          playerARevealed
        </button>
        <span className="ml-2 text-xs">{playerARevealed}</span>
        <br />
        <button
          onClick={handlePlayerBRevealed}
          className="bg-gray-200 px-2 py-1 rounded"
        >
          playerBRevealed
        </button>
        <span className="ml-2 text-xs">{playerBRevealed}</span>
        <br />
        <button
          onClick={handleRevealTimeLeft}
          className="bg-gray-200 px-2 py-1 rounded"
        >
          revealTimeLeft
        </button>
        <span className="ml-2 text-xs">{revealTimeLeft}</span>
      </div>
    </div>
  );
}
