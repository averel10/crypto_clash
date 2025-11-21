import { useState, useEffect } from "react";
import Web3 from "web3";
import { Button } from "./Button";
import { Input } from "./Input";

interface GameListProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
  onPlayClick?: (gameId: number) => void;
}

interface GameInfo {
  gameId: number;
  playerA: string;
  playerB: string;
  initialBet: string;
  isActive: boolean;
  outcome: number;
}

export default function GameList({
  account,
  contract,
  config,
  web3,
  setStatus,
  onPlayClick,
}: Readonly<GameListProps>) {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newGameBet, setNewGameBet] = useState<string>("0.01");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [userGameIds, setUserGameIds] = useState<Set<number>>(new Set());

  // Fetch all active games
  const fetchActiveGames = async () => {
    if (!contract || !web3) return;
    try {
      const activeGameIds = await contract.methods.getActiveGameIds().call();
      const gameDetails: GameInfo[] = [];

      for (const gameId of activeGameIds) {
        const details = await contract.methods.getGameDetails(gameId).call();
        gameDetails.push({
          gameId: Number(gameId),
          playerA: details.playerAAddr,
          playerB: details.playerBAddr,
          initialBet: web3.utils.fromWei(details.initialBet, "ether"),
          isActive: details.isActive,
          outcome: Number(details.outcome),
        });
      }

      setGames(gameDetails);

      // Check which games the user is participating in
      if (account) {
        const userGames = new Set<number>();
        for (const game of gameDetails) {
          if (
            game.playerA.toLowerCase() === account.toLowerCase() ||
            game.playerB.toLowerCase() === account.toLowerCase()
          ) {
            userGames.add(game.gameId);
          }
        }
        setUserGameIds(userGames);
      }
    } catch (err: any) {
      console.error("Failed to fetch games:", err.message);
    }
  };

  // Auto-refresh games every 2 seconds
  useEffect(() => {
    fetchActiveGames();
    const interval = setInterval(() => {
      fetchActiveGames();
    }, 2000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [contract, web3]);

  // Join an existing game
  const handleJoinGame = async (gameId: number, bet: string) => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    setStatus("");
    try {
      const betWei = web3.utils.toWei(bet || "0.01", "ether");
      const tx = contract.methods.register(gameId);
      const gas = await tx.estimateGas({ from: account, value: betWei });
      const result = await (globalThis as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: config?.GAME_CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            value: web3.utils.numberToHex(betWei),
            gas: web3.utils.toHex(gas),
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
          },
        ],
      });
      setStatus("✅ Joined game! Transaction: " + result);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fetchActiveGames();
    } catch (err: any) {
      setStatus("❌ Failed to join game: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new game
  const handleCreateGame = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    setStatus("");
    try {
      const betWei = web3.utils.toWei(newGameBet || "0.01", "ether");
      const tx = contract.methods.register(0); // 0 means create new game
      const gas = await tx.estimateGas({ from: account, value: betWei });
      const result = await (globalThis as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: config?.GAME_CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            value: web3.utils.numberToHex(betWei),
            gas: web3.utils.toHex(gas),
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
          },
        ],
      });
      setStatus("✅ Created new game! Transaction: " + result);
      setNewGameBet("0.01");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fetchActiveGames();
    } catch (err: any) {
      setStatus("❌ Failed to create game: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr === "0x0000000000000000000000000000000000000000") return "-";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Create New Game Section */}
      <div className="border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">
          ➕ Create New Game
        </h3>
        <div className="flex gap-3 flex-wrap">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Bet in ETH (default 0.01)"
            value={newGameBet}
            onChange={(e) => setNewGameBet(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Button
            onClick={handleCreateGame}
            disabled={loading || !account || !contract}
            variant="primary"
            className="whitespace-nowrap"
          >
            Create Game
          </Button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Enter the bet amount in ETH (e.g., 0.01 for 0.01 ETH). The first
          player to join with the same or higher bet will play against you.
        </p>
      </div>

      {/* Active Games List */}
      <div className="border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
          🎮 Available Games ({games.length})
        </h3>

        {games.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No active games available.</p>
            <p className="text-xs mt-1">Create a new game to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <div
                key={game.gameId}
                className="flex items-center gap-4 bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-slate-600"
              >
                {/* Game ID */}
                <div className="min-w-[80px]">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Game ID
                  </p>
                  <p className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
                    #{game.gameId}
                  </p>
                </div>

                {/* Players Info */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Players
                  </p>
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-xs text-slate-500">A:</span> {formatAddress(game.playerA)}
                    </p>
                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-xs text-slate-500">B:</span> {game.playerB === "0x0000000000000000000000000000000000000000"
                        ? "Waiting..."
                        : formatAddress(game.playerB)}
                    </p>
                  </div>
                </div>

                {/* Bet Amount */}
                <div className="min-w-[100px]">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bet
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {game.initialBet} ETH
                  </p>
                </div>

                {/* Join/Play Button */}
                <div className="flex gap-2">
                  {userGameIds.has(game.gameId) ? (
                    <Button
                      onClick={() => onPlayClick?.(game.gameId)}
                      variant="primary"
                      className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-600"
                    >
                      ▶ Play
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        handleJoinGame(game.gameId, game.initialBet)
                      }
                      disabled={
                        loading ||
                        !account ||
                        !contract ||
                        game.playerB !==
                          "0x0000000000000000000000000000000000000000"
                      }
                      variant="primary"
                      className="whitespace-nowrap"
                    >
                      {game.playerB ===
                      "0x0000000000000000000000000000000000000000"
                        ? "Join"
                        : "Full"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Info */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        <p>🔄 Games refresh automatically every 2 seconds</p>
      </div>
    </div>
  );
}
