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
  // MinusOne mode props
  selectedMove1?: string | null;
  selectedMove2?: string | null;
  secret1?: string;
  secret2?: string;
  isWithdrawPhase?: boolean;
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
  selectedMove1,
  selectedMove2,
  secret1,
  secret2,
  isWithdrawPhase = false,
}: Readonly<RevealProps>) {
  const [loading, setLoading] = useState(false);
  const [selfRevealed, setSelfRevealed] = useState(false);
  const [opponentRevealed, setOpponentRevealed] = useState(false);
  const [bothRevealed, setBothRevealed] = useState(false);
  const [outcome, setOutcome] = useState<number>(0);
  const [revealTimeLeft, setRevealTimeLeft] = useState<number>(0);
  const [timeoutExpired, setTimeoutExpired] = useState(false);

  const isMinusOne = gameDetails?.gameMode === "minusone";
  
  // Generate clear text for reveal
  const clearMove = selectedMove && secret ? `${selectedMove}-${secret}` : "";
  const clearMove1 = selectedMove1 && secret1 ? `${selectedMove1}-${secret1}` : "";
  const clearMove2 = selectedMove2 && secret2 ? `${selectedMove2}-${secret2}` : "";

  // Check game status on mount
  useEffect(() => {
    const setStateFromGameDetails = () => {
      if (!gameDetails) return;
      
      if (isMinusOne && !isWithdrawPhase) {
        // MinusOne initial reveal: check move1
        const playerARevealed = !!(gameDetails.playerA.move1 && Number(gameDetails.playerA.move1) !== 0);
        const playerBRevealed = !!(gameDetails.playerB.move1 && Number(gameDetails.playerB.move1) !== 0);

        setSelfRevealed(
          (whoAmI === "player1" && playerARevealed) ||
          (whoAmI === "player2" && playerBRevealed)
        );
        setOpponentRevealed(
          (whoAmI === "player1" && playerBRevealed) ||
          (whoAmI === "player2" && playerARevealed)
        );
        setBothRevealed(playerARevealed && playerBRevealed);
      } else if (isMinusOne && isWithdrawPhase) {
        // MinusOne withdrawal reveal: check withdrawn field
        const playerARevealed = !!(gameDetails.playerA.withdrawn && Number(gameDetails.playerA.withdrawn) !== 0);
        const playerBRevealed = !!(gameDetails.playerB.withdrawn && Number(gameDetails.playerB.withdrawn) !== 0);

        setSelfRevealed(
          (whoAmI === "player1" && playerARevealed) ||
          (whoAmI === "player2" && playerBRevealed)
        );
        setOpponentRevealed(
          (whoAmI === "player1" && playerBRevealed) ||
          (whoAmI === "player2" && playerARevealed)
        );
        setBothRevealed(playerARevealed && playerBRevealed);
        
        // Set outcome when both revealed withdrawal
        if(bothRevealed){
          if(Number(gameDetails.outcome) === 1 && whoAmI === "player1") setOutcome(1);
          else if(Number(gameDetails.outcome) === 2 && whoAmI === "player2") setOutcome(1);
          else if(Number(gameDetails.outcome) === 1 && whoAmI === "player2") setOutcome(2);
          else if(Number(gameDetails.outcome) === 2 && whoAmI === "player1") setOutcome(2);
          else if(Number(gameDetails.outcome) === 3) setOutcome(3);
        }
      } else {
        // Classic mode: check move field
        const playerARevealed = !!(gameDetails.playerA.move && Number(gameDetails.playerA.move) !== 0);
        const playerBRevealed = !!(gameDetails.playerB.move && Number(gameDetails.playerB.move) !== 0);

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
      }
    };

    setStateFromGameDetails();

    // Check reveal timeout
    const checkRevealTimeout = async () => {
      if (!contract || !gameDetails) return;
      try {
        let timeLeft;
        if (isMinusOne) {
          // MinusOne uses getTimeLeft() for all phases
          timeLeft = await contract.methods.getTimeLeft(gameDetails.returnGameId).call();
        } else {
          // Classic uses revealTimeLeft()
          timeLeft = await contract.methods.revealTimeLeft(gameDetails.returnGameId).call();
        }
        setRevealTimeLeft(Number(timeLeft));
        if (Number(timeLeft) <= 0) {
          setTimeoutExpired(true);
        }
      } catch (err: any) {
        console.error("Reveal timeout check failed:", err.message);
      }
    };

    checkRevealTimeout();
    const interval = setInterval(checkRevealTimeout, 2000);

    return () => clearInterval(interval);
  }, [gameDetails, contract, account, whoAmI]);

  const handleReveal = async () => {
    if (!contract || !web3 || !account) return;
    
    setLoading(true);
    try {
      let tx;
      
      if (isMinusOne && !isWithdrawPhase) {
        // MinusOne initial reveal: revealInitialMoves(gameId, clear1, clear2)
        if (!clearMove1 || !clearMove2) {
          showErrorToast("Please provide both cleartext moves");
          setLoading(false);
          return;
        }
        tx = contract.methods.revealInitialMoves(gameDetails?.returnGameId, clearMove1, clearMove2);
      } else if (isMinusOne && isWithdrawPhase) {
        // MinusOne withdrawal reveal: withdrawMove(gameId, clear)
        if (!clearMove) {
          showErrorToast("Please provide cleartext withdrawal choice");
          setLoading(false);
          return;
        }
        tx = contract.methods.withdrawMove(gameDetails?.returnGameId, clearMove);
      } else {
        // Classic mode: reveal(gameId, clear)
        if (!clearMove) {
          showErrorToast("Please provide cleartext move");
          setLoading(false);
          return;
        }
        tx = contract.methods.reveal(gameDetails?.returnGameId, clearMove);
      }
      
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
      console.error("Reveal failed:", err);
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

  const handleResolveTimeout = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    try {
      const tx = contract.methods.resolveTimeout(gameDetails?.returnGameId);
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
      showSuccessToast("Timeout resolved: " + result);
    } catch (err: any) {
      console.error(err);
      showErrorToast("Timeout resolution failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const outcomeData = OUTCOMES[outcome] || OUTCOMES[0];

  // Check if game is finished due to timeout
  const isGameFinishedByTimeout = !gameDetails?.isActive && (Number(gameDetails?.outcome) === 4 || Number(gameDetails?.outcome) === 5);

  // Determine if current player won/lost the timeout
  const didIWinTimeout = 
    (whoAmI === "player2" && Number(gameDetails?.outcome) === 4) || 
    (whoAmI === "player1" && Number(gameDetails?.outcome) === 5);

  return (
    <div className="space-y-6">
      {/* Player Info */}
      {gameDetails && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-700 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">You</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {whoAmI === "player1" ? gameDetails.playerA.nickname : gameDetails.playerB.nickname}
              </p>
            </div>
            <div className="text-2xl text-slate-400">VS</div>
            <div className="text-center flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Opponent</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {whoAmI === "player1" ? gameDetails.playerB.nickname : gameDetails.playerA.nickname}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Show timeout result after game is inactive */}
      {isGameFinishedByTimeout && (
        <div className="flex flex-col items-center justify-center py-16">
          {didIWinTimeout ? (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border-2 border-green-400 dark:border-green-600 rounded-lg w-full">
              <p className="text-green-700 dark:text-green-200 font-semibold mb-3 text-center">
                🎉 Victory by Timeout!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 text-center">
                Your opponent failed to reveal in time. You claimed victory!
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-2 border-red-400 dark:border-red-600 rounded-lg w-full">
              <p className="text-red-700 dark:text-red-200 font-semibold mb-3 text-center">
                ⏱️ Timeout Loss
              </p>
              <p className="text-sm text-red-600 dark:text-red-300 text-center">
                You failed to reveal in time. Your opponent claimed victory!
              </p>
            </div>
          )}
        </div>
      )}

      {!isGameFinishedByTimeout && (
        <>
          {/* Your Move Section - Hidden when both revealed */}
          {!bothRevealed && !timeoutExpired && (
            <div className="border p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">
              <h2 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
                {isWithdrawPhase ? "Your Withdrawal Choice" : isMinusOne ? "Your Moves" : "Your Move"}
              </h2>
              {isMinusOne && !isWithdrawPhase && selectedMove1 && selectedMove2 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Move 1</span>
                      <span className="text-5xl mb-2">{MOVES[selectedMove1].icon}</span>
                      <span className="font-semibold text-sm">{MOVES[selectedMove1].name}</span>
                    </div>
                    <div className="text-2xl text-slate-400">→</div>
                    <div className="bg-white dark:bg-slate-600 p-3 rounded-lg flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Clear Text 1:</p>
                      <code className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
                        {clearMove1}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Move 2</span>
                      <span className="text-5xl mb-2">{MOVES[selectedMove2].icon}</span>
                      <span className="font-semibold text-sm">{MOVES[selectedMove2].name}</span>
                    </div>
                    <div className="text-2xl text-slate-400">→</div>
                    <div className="bg-white dark:bg-slate-600 p-3 rounded-lg flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Clear Text 2:</p>
                      <code className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
                        {clearMove2}
                      </code>
                    </div>
                  </div>
                </div>
              ) : isWithdrawPhase && selectedMove ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-6xl mb-2">{selectedMove === "1" ? "1️⃣" : "2️⃣"}</span>
                    <span className="font-semibold text-lg">Withdraw Move {selectedMove}</span>
                  </div>
                  <div className="text-3xl text-slate-400">→</div>
                  <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Clear Text:</p>
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-200">{clearMove}</code>
                  </div>
                </div>
              ) : selectedMove ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-6xl mb-2">{MOVES[selectedMove].icon}</span>
                    <span className="font-semibold text-lg">{MOVES[selectedMove].name}</span>
                  </div>
                  <div className="text-3xl text-slate-400">→</div>
                  <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Clear Move:</p>
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-200">{clearMove}</code>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-600 dark:text-slate-400">
                  No {isWithdrawPhase ? "withdrawal choice" : "move"} selected yet
                </p>
              )}
            </div>
          )}
              {/* Timeout Warning */}
              {timeoutExpired && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-2 border-red-400 dark:border-red-600 rounded-lg">
                  <p className="text-red-700 dark:text-red-200 font-semibold mb-3">
                    ⏱️ Reveal phase timeout expired!
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                    {selfRevealed 
                      ? "The opponent failed to reveal in time. You can claim victory!"
                      : "You failed to reveal in time. The opponent can claim victory!"}
                  </p>
                  {selfRevealed && (
                    <Button
                      onClick={handleResolveTimeout}
                      disabled={loading || !account || !contract}
                      variant="primary"
                      className="w-full py-3 text-lg"
                    >
                    {loading ? "Processing..." : "⚡ Resolve Timeout"}
                  </Button>)}
                </div>
              )}
              
          {/* Game Status Section - Hidden when both revealed */}
          {!bothRevealed && !timeoutExpired && (
            <>


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
                    {revealTimeLeft}s
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Reveal Section - Hidden when both revealed */}
          {!bothRevealed && !timeoutExpired && (
            <div className="border-2 border-blue-300 dark:border-blue-600 p-6 rounded-lg bg-blue-50 dark:bg-slate-700">
              <h2 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
                {isWithdrawPhase ? "Reveal Your Withdrawal" : isMinusOne ? "Reveal Your Moves" : "Reveal Your Move"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                {isWithdrawPhase 
                  ? "Submit your clear withdrawal choice and secret to the blockchain."
                  : isMinusOne
                    ? "Submit your clear moves and secrets to the blockchain. This proves you didn't cheat!"
                    : "Submit your clear move and secret to the blockchain. This proves you didn't cheat!"}
              </p>
              <Button
                onClick={handleReveal}
                disabled={loading || !account || !contract || (!clearMove && (!clearMove1 || !clearMove2)) || selfRevealed}
                variant="primary"
                className="w-full py-3 text-lg"
              >
                {loading ? "Submitting..." : selfRevealed ? "✅ Revealed" : isWithdrawPhase ? "Reveal Withdrawal" : "Reveal Move"}
              </Button>
            </div>
          )}

          {/* Winner Section - Only show if both revealed */}
          {bothRevealed && (
            <div className="space-y-4">
              {/* Moves Comparison */}
              <div className="border-2 border-slate-300 dark:border-slate-600 p-6 rounded-lg bg-slate-50 dark:bg-slate-800">
                <h2 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white text-center">
                  {isMinusOne ? "Final Moves (After Withdrawal)" : "Final Moves"}
                </h2>
                
                {isMinusOne && gameDetails ? (
                  <div className="space-y-6">
                    {/* Show all moves including withdrawn ones for MinusOne */}
                    <div className="flex items-center justify-center gap-8">
                      {/* Your Moves */}
                      <div className="flex flex-col items-center space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 mb-2">You</span>
                        <div className="flex gap-2">
                          <div className={`flex flex-col items-center p-2 rounded ${
                            (whoAmI === "player1" ? gameDetails.playerA.withdrawn : gameDetails.playerB.withdrawn) === 1 
                              ? "opacity-40 bg-red-100 dark:bg-red-900" 
                              : "bg-green-100 dark:bg-green-900"
                          }`}>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Move 1</span>
                            <span className="text-3xl">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerA.move1 : gameDetails.playerB.move1)]?.icon}
                            </span>
                            <span className="text-xs">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerA.move1 : gameDetails.playerB.move1)]?.name}
                            </span>
                            {(whoAmI === "player1" ? gameDetails.playerA.withdrawn : gameDetails.playerB.withdrawn) === 1 && (
                              <span className="text-xs text-red-600 dark:text-red-400">Withdrawn</span>
                            )}
                          </div>
                          <div className={`flex flex-col items-center p-2 rounded ${
                            (whoAmI === "player1" ? gameDetails.playerA.withdrawn : gameDetails.playerB.withdrawn) === 2 
                              ? "opacity-40 bg-red-100 dark:bg-red-900" 
                              : "bg-green-100 dark:bg-green-900"
                          }`}>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Move 2</span>
                            <span className="text-3xl">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerA.move2 : gameDetails.playerB.move2)]?.icon}
                            </span>
                            <span className="text-xs">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerA.move2 : gameDetails.playerB.move2)]?.name}
                            </span>
                            {(whoAmI === "player1" ? gameDetails.playerA.withdrawn : gameDetails.playerB.withdrawn) === 2 && (
                              <span className="text-xs text-red-600 dark:text-red-400">Withdrawn</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* VS */}
                      <div className="flex flex-col items-center">
                        <span className="text-4xl text-slate-400 dark:text-slate-500">VS</span>
                      </div>

                      {/* Opponent Moves */}
                      <div className="flex flex-col items-center space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Opponent</span>
                        <div className="flex gap-2">
                          <div className={`flex flex-col items-center p-2 rounded ${
                            (whoAmI === "player1" ? gameDetails.playerB.withdrawn : gameDetails.playerA.withdrawn) === 1 
                              ? "opacity-40 bg-red-100 dark:bg-red-900" 
                              : "bg-green-100 dark:bg-green-900"
                          }`}>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Move 1</span>
                            <span className="text-3xl">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerB.move1 : gameDetails.playerA.move1)]?.icon}
                            </span>
                            <span className="text-xs">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerB.move1 : gameDetails.playerA.move1)]?.name}
                            </span>
                            {(whoAmI === "player1" ? gameDetails.playerB.withdrawn : gameDetails.playerA.withdrawn) === 1 && (
                              <span className="text-xs text-red-600 dark:text-red-400">Withdrawn</span>
                            )}
                          </div>
                          <div className={`flex flex-col items-center p-2 rounded ${
                            (whoAmI === "player1" ? gameDetails.playerB.withdrawn : gameDetails.playerA.withdrawn) === 2 
                              ? "opacity-40 bg-red-100 dark:bg-red-900" 
                              : "bg-green-100 dark:bg-green-900"
                          }`}>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Move 2</span>
                            <span className="text-3xl">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerB.move2 : gameDetails.playerA.move2)]?.icon}
                            </span>
                            <span className="text-xs">
                              {MOVES[String(whoAmI === "player1" ? gameDetails.playerB.move2 : gameDetails.playerA.move2)]?.name}
                            </span>
                            {(whoAmI === "player1" ? gameDetails.playerB.withdrawn : gameDetails.playerA.withdrawn) === 2 && (
                              <span className="text-xs text-red-600 dark:text-red-400">Withdrawn</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-8">
                    {/* Classic game - Your Move (always on left) */}
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

                    {/* Classic game - Opponent Move (always on right) */}
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
                )}
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
                {gameDetails && outcome !== 0 && (
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
        </>
      )}
    </div>
  );
}
