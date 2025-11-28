import { useState, useEffect } from "react";
import Web3 from "web3";
import { Button } from "./Button";
import { Input } from "./Input";
import { GameDetails } from "./GameModal";
import { showSuccessToast, showErrorToast } from "@/app/lib/toast";

interface GameListProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
  onPlayClick?: (gameId: number) => void;
}

export default function GameList({
  account,
  contract,
  config,
  web3,
  setStatus,
  onPlayClick,
}: Readonly<GameListProps>) {
  const [games, setGames] = useState<GameDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [newGameBet, setNewGameBet] = useState<string>("0.01");
  const [newGameNickname, setNewGameNickname] = useState<string>("");
  const [joinNicknames, setJoinNicknames] = useState<Map<number, string>>(new Map());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [userGameIds, setUserGameIds] = useState<Set<number>>(new Set());

  // Fetch all active games
  const fetchActiveGames = async () => {
    if (!contract || !web3) return;
    try {
      const activeGameIds = await contract.methods.getActiveGameIds().call();
      const gameDetails: GameDetails[] = [];

      for (const gameId of activeGameIds) {
        const details = await contract.methods.getGameDetails(gameId).call();
        gameDetails.push(details);
      }

      setGames(gameDetails);
      // Check which games the user is participating in
      if (account) {
        const userGames = new Set<number>();
        for (const game of gameDetails) {
          if (
            game.playerA.addr.toLowerCase() === account.toLowerCase() ||
            game.playerB.addr.toLowerCase() === account.toLowerCase()
          ) {
            userGames.add(game.returnGameId);
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
  }, [contract, web3, account]);

  // Join an existing game
  const handleJoinGame = async (gameId: number, bet: string) => {
    if (!contract || !web3 || !account) return;
    
    const nickname = joinNicknames.get(gameId) || "";
    if (!nickname.trim()) {
      showErrorToast("Please enter a nickname");
      return;
    }
    if (nickname.length > 20) {
      showErrorToast("Nickname too long (max 20 characters)");
      return;
    }
    
    setLoading(true);
    try {
      const betWei = bet;
      const tx = contract.methods.register(gameId, nickname);
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
      showSuccessToast("Joined game! Transaction: " + result);
      // Clear the nickname input for this game
      const updatedNicknames = new Map(joinNicknames);
      updatedNicknames.delete(gameId);
      setJoinNicknames(updatedNicknames);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fetchActiveGames();
    } catch (err: any) {
      showErrorToast("Failed to join game: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new game
  const handleCreateGame = async () => {
    if (!contract || !web3 || !account) return;
    
    if (!newGameNickname.trim()) {
      showErrorToast("Please enter a nickname");
      return;
    }
    if (newGameNickname.length > 20) {
      showErrorToast("Nickname too long (max 20 characters)");
      return;
    }
    
    setLoading(true);
    try {
      const betWei = web3.utils.toWei(newGameBet || "0.01", "ether");
      const tx = contract.methods.register(0, newGameNickname); // 0 means create new game
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
      showSuccessToast("Created new game! Transaction: " + result);
      setNewGameBet("0.01");
      setNewGameNickname("");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fetchActiveGames();
    } catch (err: any) {
      showErrorToast("Failed to create game: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr === "0x0000000000000000000000000000000000000000") return "-";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getGamePhase = (game: GameDetails) => {
    const playerARevealed = Number(game.playerA.move) !== 0;
    const playerBRevealed = Number(game.playerB.move) !== 0;
    const playerACommitted = Number(game.playerA.encrMove) !== 0;
    const playerBCommitted = Number(game.playerB.encrMove) !== 0;

    if (playerARevealed && playerBRevealed) {
      return { phase: "Outcome", color: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200" };
    } else if (playerACommitted && playerBCommitted) {
      return { phase: "Reveal", color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200" };
    } else {
      return { phase: "Commit", color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" };
    }
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
            type="text"
            placeholder="Your nickname (max 20 chars)"
            value={newGameNickname}
            onChange={(e) => setNewGameNickname(e.target.value)}
            maxLength={20}
            className="flex-1 min-w-[200px]"
          />
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
          Enter your nickname and bet amount in ETH (e.g., 0.01 for 0.01 ETH).
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
            {games.map((game) => {
              const isUserInGame = userGameIds.has(game.returnGameId);
              return (
              <div
                key={game.returnGameId}
                className={`flex flex-col p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border ${
                  isUserInGame
                    ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600 ring-2 ring-green-400 dark:ring-green-500"
                    : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600"
                }`}
              >
                {/* Game ID Header */}
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
                    Game #{game.returnGameId}
                  </p>
                  <div className="flex gap-3 items-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getGamePhase(game).color}`}>
                      {getGamePhase(game).phase}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {web3 ? web3.utils.fromWei(game.initialBet, "ether") : "-"} ETH
                    </p>
                  </div>
                </div>

                {/* Players VS Layout */}
                <div className="flex items-center justify-between gap-4">
                  {/* Player A */}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Player A
                    </p>
                    <p className="font-semibold text-base text-slate-800 dark:text-slate-200">
                      {game.playerA.nickname || "Unknown"}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400 break-all">
                      {formatAddress(game.playerA.addr)}
                    </p>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center">
                    <p className="text-xl font-bold text-slate-400 dark:text-slate-500">
                      VS
                    </p>
                  </div>

                  {/* Player B */}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Player B
                    </p>
                    {game.playerB.addr === "0x0000000000000000000000000000000000000000" ? (
                      <p className="font-semibold text-base text-slate-500 dark:text-slate-400">
                        ⏳ Waiting...
                      </p>
                    ) : (
                      <>
                        <p className="font-semibold text-base text-slate-800 dark:text-slate-200">
                          {game.playerB.nickname || "Unknown"}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400 break-all">
                          {formatAddress(game.playerB.addr)}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Join/Play Button */}
                <div className="mt-4 flex flex-col items-center gap-2">
                  {userGameIds.has(game.returnGameId) ? (
                    <Button
                      onClick={() => onPlayClick?.(game.returnGameId)}
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-600"
                    >
                      ▶ Play
                    </Button>
                  ) : game.playerB.addr === "0x0000000000000000000000000000000000000000" ? (
                    <div className="flex gap-2 w-full max-w-md">
                      <Input
                        type="text"
                        placeholder="Your nickname"
                        value={joinNicknames.get(game.returnGameId) || ""}
                        onChange={(e) => {
                          const updatedNicknames = new Map(joinNicknames);
                          updatedNicknames.set(game.returnGameId, e.target.value);
                          setJoinNicknames(updatedNicknames);
                        }}
                        maxLength={20}
                        className="flex-1"
                      />
                      <Button
                        onClick={() =>
                          handleJoinGame(game.returnGameId, game.initialBet)
                        }
                        disabled={
                          loading ||
                          !account ||
                          !contract
                        }
                        variant="primary"
                      >
                        Join Game
                      </Button>
                    </div>
                  ) : (
                    <Button
                      disabled={true}
                      variant="primary"
                    >
                      Full
                    </Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
