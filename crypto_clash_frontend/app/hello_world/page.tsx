"use client";

import { useEffect, useState } from "react";
import Web3 from "web3";



export default function Home() {
  const [config, setConfig] = useState<Config | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [message, setMessage] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [account, setAccount] = useState<string>("");

  // Initialize Web3 and contract
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/crypto_clash/config.json");
        const data = await response.json();
        setConfig(data);

        // Initialize Web3
        const web3Instance = new Web3(data.API_URL);
        setWeb3(web3Instance);

        // Create contract instance
        const contractInstance = new web3Instance.eth.Contract(
          data.ABI,
          data.CONTRACT_ADDRESS
        );
        setContract(contractInstance);

        // Try to get connected account (if MetaMask or similar is available)
        if (typeof window !== "undefined" && (window as any).ethereum) {
          try {
            const accounts = await (window as any).ethereum.request({
              method: "eth_requestAccounts",
            });
            setAccount(accounts[0]);

            // Get the network ID from the RPC endpoint
            const networkId = await web3Instance.eth.net.getId();
            const currentChainId = await (window as any).ethereum.request({
              method: "eth_chainId",
            });

            // If on different network, notify user (they may need to switch networks manually)
            console.log(
              `RPC Network ID: ${networkId}, MetaMask Chain ID: ${currentChainId}`
            );
          } catch (err) {
            console.log("MetaMask not available or user denied access");
          }
        }

        // Load initial message
        await readMessage(contractInstance);
      } catch (err) {
        setError(`Failed to load config: ${err}`);
        console.error(err);
      }
    };

    loadConfig();
  }, []);

  // Read message from contract
  const readMessage = async (contractInstance: any) => {
    try {
      setLoading(true);
      setError("");
      const result = await contractInstance.methods.message().call();
      setMessage(result);
    } catch (err) {
      setError(`Failed to read message: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update message on contract
  const updateMessage = async () => {
    if (!newMessage.trim()) {
      setError("Please enter a message");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!web3 || !contract) {
        throw new Error("Web3 or contract not initialized");
      }

      // Check if MetaMask is available
      if (!account && typeof window !== "undefined" && !(window as any).ethereum) {
        throw new Error(
          "MetaMask not available. Please install MetaMask to update the message."
        );
      }

      // Create transaction
      const tx = contract.methods.update(newMessage);
      const gas = await tx.estimateGas({ from: account });

      console.log(await web3.eth.net.getId());

      // Send transaction via MetaMask
      const result = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: config?.CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas: web3.utils.toHex(gas),
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
          },
        ],
      });



      setError(`Transaction sent: ${result}`);
      setNewMessage("");

      // Wait a bit and refresh message from the RPC endpoint
      setTimeout(() => {
        if (contract) {
          readMessage(contract);
        }
      }, 2000);
    } catch (err) {
      setError(`Failed to update message: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 font-sans">
      <main className="w-full max-w-2xl mx-auto py-12 px-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Smart Contract Interaction
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
            Read and update messages on the blockchain
          </p>

          {/* Status Section */}
          <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Connected Account:</span>{" "}
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected"}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              <span className="font-semibold">Contract Address:</span>{" "}
              {config?.CONTRACT_ADDRESS}
            </p>
          </div>

          {/* Current Message Display */}
          <div className="mb-8 p-6 bg-indigo-50 dark:bg-slate-700 rounded-lg border-2 border-indigo-200 dark:border-slate-600">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Current Message:
            </h2>
            {loading && !message ? (
              <p className="text-slate-600 dark:text-slate-300 italic">Loading...</p>
            ) : message ? (
              <p className="text-xl text-indigo-900 dark:text-indigo-200 break-words">
                {message}
              </p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 italic">
                No message yet
              </p>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => readMessage(contract)}
            disabled={loading || !contract}
            className="w-full mb-6 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Loading..." : "Refresh Message"}
          </button>

          {/* Update Message Form */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Update Message:
            </h2>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter new message..."
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={updateMessage}
              disabled={loading || !account || !contract}
              className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Updating..." : "Update Message"}
            </button>
          </div>

          {/* Error/Status Messages */}
          {error && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                error.includes("Transaction sent")
                  ? "bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200"
              }`}
            >
              <p className="text-sm break-words">{error}</p>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-2">ℹ️ Note:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>To update messages, you need MetaMask or a compatible Web3 wallet</li>
              <li>Make sure your MetaMask is connected to the correct test network</li>
              <li>Reading messages is free and doesn't require a wallet</li>
              <li>Updates are written to the blockchain and may take time to confirm</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
