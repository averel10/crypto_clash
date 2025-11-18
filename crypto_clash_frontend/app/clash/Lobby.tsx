interface LobbyProps {
  registerGameId: string;
  setRegisterGameId: (v: string) => void;
  registerBet: string;
  setRegisterBet: (v: string) => void;
  handleRegister: () => void;
  loading: boolean;
  account: string;
  contract: any;
  betMin: string;
  handleGetBetMin: () => void;
  activeGameIds: string;
  handleGetActiveGameIds: () => void;
  contractBalance: string;
  handleGetContractBalance: () => void;
  gameDetailsId: string;
  setGameDetailsId: (v: string) => void;
  gameDetails: any;
  handleGetGameDetails: () => void;
  myActiveGameId: string;
  handleGetMyActiveGameId: () => void;
  pastGameIndex: string;
  setPastGameIndex: (v: string) => void;
  pastGame: any;
  handleGetPastGame: () => void;
  pastGamesCount: string;
  handleGetPastGamesCount: () => void;
  whoAmI: string;
  handleWhoAmI: () => void;
}

export default function Lobby({
  registerGameId,
  setRegisterGameId,
  registerBet,
  setRegisterBet,
  handleRegister,
  loading,
  account,
  contract,
  betMin,
  handleGetBetMin,
  activeGameIds,
  handleGetActiveGameIds,
  contractBalance,
  handleGetContractBalance,
  gameDetailsId,
  setGameDetailsId,
  gameDetails,
  handleGetGameDetails,
  myActiveGameId,
  handleGetMyActiveGameId,
  pastGameIndex,
  setPastGameIndex,
  pastGame,
  handleGetPastGame,
  pastGamesCount,
  handleGetPastGamesCount,
  whoAmI,
  handleWhoAmI,
}: Readonly<LobbyProps>) {
  return (
    <div className="border p-4 rounded-lg">
      <h2 className="font-semibold mb-2">register(uint gameId) (payable)</h2>
      <input
        type="text"
        placeholder="Game ID (0 = auto)"
        value={registerGameId}
        onChange={(e) => setRegisterGameId(e.target.value)}
        className="border px-2 py-1 mr-2 rounded"
      />
      <input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Bet in ETH (default 0.01)"
        value={registerBet}
        onChange={(e) => setRegisterBet(e.target.value)}
        className="border px-2 py-1 mr-2 rounded"
      />
      <div className="text-xs text-slate-500 mt-1">
        Enter amount in ETH (e.g., 0.01 for 0.01 ETH). Entering 1 means 1 full
        ETH.
      </div>
      <button
        onClick={handleRegister}
        disabled={loading || !account || !contract}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Register
      </button>

      <div className="mt-4 space-y-2">
        <button onClick={handleGetBetMin} className="bg-gray-200 px-2 py-1 rounded">BET_MIN</button>
        <span className="ml-2 text-xs">{betMin}</span>
        <br />
        <button onClick={handleGetActiveGameIds} className="bg-gray-200 px-2 py-1 rounded">getActiveGameIds</button>
        <span className="ml-2 text-xs">{activeGameIds}</span>
        <br />
        <button onClick={handleGetContractBalance} className="bg-gray-200 px-2 py-1 rounded">getContractBalance</button>
        <span className="ml-2 text-xs">{contractBalance}</span>
        <br />
        <input type="text" placeholder="Game ID" value={gameDetailsId} onChange={e => setGameDetailsId(e.target.value)} className="border px-2 py-1 mr-2 rounded" />
        <button onClick={handleGetGameDetails} className="bg-gray-200 px-2 py-1 rounded">getGameDetails</button>
        <span className="ml-2 text-xs">{gameDetails && <pre className="inline whitespace-pre-wrap">{JSON.stringify(gameDetails, null, 2)}</pre>}</span>
        <br />
        <button onClick={handleGetMyActiveGameId} className="bg-gray-200 px-2 py-1 rounded">getMyActiveGameId</button>
        <span className="ml-2 text-xs">{myActiveGameId}</span>
        <br />
        <input type="text" placeholder="Past Game Index" value={pastGameIndex} onChange={e => setPastGameIndex(e.target.value)} className="border px-2 py-1 mr-2 rounded" />
        <button onClick={handleGetPastGame} className="bg-gray-200 px-2 py-1 rounded">getPastGame</button>
        <span className="ml-2 text-xs">{pastGame && <pre className="inline whitespace-pre-wrap">{JSON.stringify(pastGame, null, 2)}</pre>}</span>
        <br />
        <button onClick={handleGetPastGamesCount} className="bg-gray-200 px-2 py-1 rounded">getPastGamesCount</button>
        <span className="ml-2 text-xs">{pastGamesCount}</span>
        <br />
        <button onClick={handleWhoAmI} className="bg-gray-200 px-2 py-1 rounded">whoAmI</button>
        <span className="ml-2 text-xs">{whoAmI}</span>
      </div>
    </div>
  );
}
