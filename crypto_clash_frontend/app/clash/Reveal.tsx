import { useState } from "react";
import Web3 from "web3";

interface RevealProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
}

export default function Reveal({
  account,
  contract,
  config,
  web3,
  setStatus,
}: Readonly<RevealProps>) {
  const [loading, setLoading] = useState(false);
  const [revealMove, setRevealMove] = useState<string>("");
  const [bothRevealed, setBothRevealed] = useState<string>("");
  const [playerARevealed, setPlayerARevealed] = useState<string>("");
  const [playerBRevealed, setPlayerBRevealed] = useState<string>("");
  const [revealTimeLeft, setRevealTimeLeft] = useState<string>("");

  // Reveal phase read-only handlers
  const handleBothRevealed = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.bothRevealed().call();
      setBothRevealed(res ? "true" : "false");
    } catch (err: any) {
      setStatus("Failed to fetch bothRevealed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerARevealed = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.playerARevealed().call();
      setPlayerARevealed(res ? "true" : "false");
    } catch (err: any) {
      setStatus("Failed to fetch playerARevealed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerBRevealed = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.playerBRevealed().call();
      setPlayerBRevealed(res ? "true" : "false");
    } catch (err: any) {
      setStatus("Failed to fetch playerBRevealed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealTimeLeft = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.revealTimeLeft().call();
      setRevealTimeLeft(res.toString());
    } catch (err: any) {
      setStatus("Failed to fetch revealTimeLeft: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    setStatus("");
    try {
      const tx = contract.methods.reveal(revealMove);
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
      setStatus("Reveal tx sent: " + result);
    } catch (err: any) {
      setStatus("Reveal failed: " + err.message);
    } finally {
      setLoading(false);
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
