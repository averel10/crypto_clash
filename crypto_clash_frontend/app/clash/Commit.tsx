import { useState } from "react";
import Web3 from "web3";

interface CommitProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
}

export default function Commit({
  account,
  contract,
  config,
  web3,
  setStatus,
}: Readonly<CommitProps>) {
  const [loading, setLoading] = useState(false);
  const [playMove, setPlayMove] = useState<string>("");
  const [bothPlayed, setBothPlayed] = useState<string>("");

  // Commit phase read-only handlers
  const handleBothPlayed = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.bothPlayed().call();
      setBothPlayed(res ? "true" : "false");
    } catch (err: any) {
      setStatus("Failed to fetch bothPlayed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!contract || !web3 || !account) return;
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
    } catch (err: any) {
      setStatus("Play failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="border p-4 rounded-lg">
      <h2 className="font-semibold mb-2">play(bytes32 encrMove)</h2>
      <input
        type="text"
        placeholder="Encrypted Move (bytes32)"
        value={playMove}
        onChange={(e) => setPlayMove(e.target.value)}
        className="border px-2 py-1 mr-2 rounded"
      />
      <button
        onClick={handlePlay}
        disabled={loading || !account || !contract}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Play
      </button>

      <div className="mt-4 space-y-2">
        <button
          onClick={handleBothPlayed}
          className="bg-gray-200 px-2 py-1 rounded"
        >
          bothPlayed
        </button>
        <span className="ml-2 text-xs">{bothPlayed}</span>
        <br />
      </div>
    </div>
  );
}
