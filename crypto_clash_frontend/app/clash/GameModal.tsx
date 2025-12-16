"use client";

import { useEffect, useState } from "react";
import Web3 from "web3";
import Commit from "./Commit";
import Reveal from "./Reveal";
import { showErrorToast } from "@/app/lib/toast";

export type Player = {
    addr: string;
    bet: string;
    // Classic mode fields
    encrMove?: string;
    move?: number;
    // MinusOne mode fields
    hash1?: string;
    hash2?: string;
    move1?: number;
    move2?: number;
    wHash?: string;
    withdrawn?: number;
    nickname: string;
};

export type GameDetails = {
    playerA: Player;
    playerB: Player;
    initialBet: string;
    outcome: number;
    isActive: boolean;
    returnGameId: number;
    gameMode?: string; // "classic" or "minusone"
    phase?: number; // GamePhase for minusone mode
};

interface GameModalProps {
    gameId?: number;
    isOpen: boolean;
    onClose: () => void;
    account: string;
    contract: any;
    config: Config | null;
    web3: Web3 | null;
    setStatus: (status: string) => void;
}

export default function GameModal({
  gameId,
  isOpen,
  onClose,
  account,
  contract,
  config,
  web3,
  setStatus,
}: Readonly<GameModalProps>) {
  const [phase, setPhase] = useState<"commit" | "reveal" | "withdrawCommit" | "withdrawReveal">("commit");
  const [whoAmI, setWhoAmI] = useState<"player1" | "player2" | "">("");
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  
  // Classic mode state
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  
  // MinusOne mode state
  const [selectedMove1, setSelectedMove1] = useState<string | null>(null);
  const [selectedMove2, setSelectedMove2] = useState<string | null>(null);
  const [secret1, setSecret1] = useState<string>("");
  const [secret2, setSecret2] = useState<string>("");
  const [withdrawChoice, setWithdrawChoice] = useState<string | null>(null);
  const [withdrawSecret, setWithdrawSecret] = useState<string>("");

  // Helper function to generate game-specific storage key
  const getGameStorageKey = () => `game_${gameDetails?.returnGameId}`;

  // Game storage object structure
  type GameStorage = {
    // Classic mode
    secret?: string;
    selectedMove?: string | null;
    playMove?: string;
    // MinusOne mode
    secret1?: string;
    secret2?: string;
    selectedMove1?: string | null;
    selectedMove2?: string | null;
    withdrawChoice?: string | null;
    withdrawSecret?: string;
    timestamp?: number;
  };

  // Constants for expiration
  const STORAGE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

  // Function to check and clean expired storage entries
  const cleanExpiredStorage = () => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("game_")) {
        try {
          const storedData = sessionStorage.getItem(key);
          if (storedData) {
            const parsed: GameStorage = JSON.parse(storedData);
            if (parsed.timestamp && now - parsed.timestamp > STORAGE_EXPIRATION_TIME) {
              keysToDelete.push(key);
            }
          }
        } catch (err) {
          console.error(`Failed to parse or clean storage key ${key}:`, err);
        }
      }
    }

    // Delete expired entries
    keysToDelete.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`Cleared expired session storage: ${key}`);
    });
  };

  // Storage helper functions
  const loadFromStorage = () => {
    if (!gameDetails) return;
    const storedData = sessionStorage.getItem(getGameStorageKey());
    if (storedData) {
      try {
        const parsed: GameStorage = JSON.parse(storedData);
        // Classic mode
        if (parsed.secret) setSecret(parsed.secret);
        if (parsed.selectedMove) setSelectedMove(parsed.selectedMove);
        // MinusOne mode
        if (parsed.secret1) setSecret1(parsed.secret1);
        if (parsed.secret2) setSecret2(parsed.secret2);
        if (parsed.selectedMove1) setSelectedMove1(parsed.selectedMove1);
        if (parsed.selectedMove2) setSelectedMove2(parsed.selectedMove2);
        if (parsed.withdrawChoice) setWithdrawChoice(parsed.withdrawChoice);
        if (parsed.withdrawSecret) setWithdrawSecret(parsed.withdrawSecret);
      } catch (err) {
        console.error("Failed to parse stored game data:", err);
      }
    }
  };

  const saveGameData = (updates: Partial<GameStorage>) => {
    const storedData = sessionStorage.getItem(getGameStorageKey());
    let currentData: GameStorage = { timestamp: Date.now() };
    
    if (storedData) {
      try {
        currentData = JSON.parse(storedData);
      } catch (err) {
        console.error("Failed to parse stored game data:", err);
      }
    }
    
    const updatedData = { ...currentData, ...updates, timestamp: Date.now() };
    sessionStorage.setItem(getGameStorageKey(), JSON.stringify(updatedData));
  };

  // Classic mode save functions
  const saveSecret = (value: string) => {
    setSecret(value);
    saveGameData({ secret: value });
  };

  const saveMoveSelection = (move: string | null) => {
    setSelectedMove(move);
    if (move !== null) {
      saveGameData({ selectedMove: move });
    }
  };

  const savePlayMove = (playMove: string) => {
    saveGameData({ playMove });
  };

  // MinusOne mode save functions
  const saveSecret1 = (value: string) => {
    setSecret1(value);
    saveGameData({ secret1: value });
  };

  const saveSecret2 = (value: string) => {
    setSecret2(value);
    saveGameData({ secret2: value });
  };

  const saveMoveSelection1 = (move: string | null) => {
    setSelectedMove1(move);
    if (move !== null) {
      saveGameData({ selectedMove1: move });
    }
  };

  const saveMoveSelection2 = (move: string | null) => {
    setSelectedMove2(move);
    if (move !== null) {
      saveGameData({ selectedMove2: move });
    }
  };

  const saveWithdrawChoice = (choice: string | null) => {
    setWithdrawChoice(choice);
    if (choice !== null) {
      saveGameData({ withdrawChoice: choice });
    }
  };

  const saveWithdrawSecret = (value: string) => {
    setWithdrawSecret(value);
    saveGameData({ withdrawSecret: value });
  };


  useEffect(() => {
    const fetchPlayerInfo = async () => {
        if (contract && account && gameId !== undefined) {
            try {
                let player = await contract.methods.whoAmI(gameId).call({ from: account });
                if(player == 1) player = "player1";
                else if(player == 2) player = "player2";
                else player = "";
                setWhoAmI(player);
            } catch (err: any) {
                showErrorToast("Error fetching player info: " + err.message);
            }
        }
    }
    const fetchGameDetails = async () => {
      if (contract && gameId !== undefined) {
        try {
          const details = await contract.methods.getGameDetails(gameId).call();
          console.log("Game details:", details);
          setGameDetails(details);
          
          // Determine game mode
          const isMinusOne = details.gameMode === "minusone";
          
          if (isMinusOne) {
            // MinusOne mode: use phase enum
            // GamePhase enum: Reg=0, InitC=1, FirstR=2, WithdC=3, WithdR=4, Done=5
            const gamePhase = Number(details.phase);
            
            if (gamePhase === 5) { // Done
              setPhase("reveal"); // Show final results
            } else if (gamePhase === 4) { // WithdR
              setPhase("withdrawReveal");
            } else if (gamePhase === 3) { // WithdC
              setPhase("withdrawCommit");
            } else if (gamePhase === 2) { // FirstR
              setPhase("reveal");
            } else { // InitC or Reg
              setPhase("commit");
            }
          } else {
            // Classic mode: check encrMove and move fields
            const playerAHasMove = details.playerA.encrMove && Number(details.playerA.encrMove) !== 0;
            const playerBHasMove = details.playerB.encrMove && Number(details.playerB.encrMove) !== 0;
            const playerARevealed = details.playerA.move && Number(details.playerA.move) !== 0;
            const playerBRevealed = details.playerB.move && Number(details.playerB.move) !== 0;
            
            // If both players have revealed their moves, show reveal phase (with results)
            if (playerARevealed && playerBRevealed) {
              setPhase("reveal");
            }
            // If both players have committed but not revealed, show reveal phase
            else if (playerAHasMove && playerBHasMove) {
              setPhase("reveal");
            }
            // Otherwise, show commit phase
            else {
              setPhase("commit");
            }
          }
        } catch (err: any) {
          showErrorToast("Error fetching game details: " + err.message);
        }
      }
    };

    // Only reset state when game ID actually changes (not on first render)
    if (gameDetails) {
      setSelectedMove(null);
      setSecret("");
    }

    fetchGameDetails();
    fetchPlayerInfo();

    // Refetch game details periodically every 2 seconds
    const intervalId = setInterval(fetchGameDetails, 2000);

    return () => clearInterval(intervalId);
    }, [contract, account, gameId]);

  // Load from storage after game details are fetched
  useEffect(() => {
    loadFromStorage();
  }, [gameDetails]);

  // Set up interval to clean expired storage entries every 5 minutes
  useEffect(() => {
    const cleanupIntervalId = setInterval(cleanExpiredStorage, 5 * 60 * 1000);
    return () => clearInterval(cleanupIntervalId);
  }, []);

  const handleClose = () => {
    // Reset state when closing
    setPhase("commit");
    setSelectedMove(null);
    setSecret("");
    setSelectedMove1(null);
    setSelectedMove2(null);
    setSecret1("");
    setSecret2("");
    setWithdrawChoice(null);
    setWithdrawSecret("");
    onClose();
  };

  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {gameId ? `Game #${gameId}` : "Game"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {phase === "commit" && "Commit your move"}
              {phase === "reveal" && "Reveal your move"}
              {phase === "withdrawCommit" && "Choose which move to withdraw"}
              {phase === "withdrawReveal" && "Reveal your withdrawal choice"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Phase Content */}
          <div>
            {phase === "commit" && (
              <Commit
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                whoAmI={whoAmI}
                gameDetails={gameDetails}
                setStatus={setStatus}
                selectedMove={selectedMove}
                setSelectedMove={saveMoveSelection}
                secret={secret}
                setSecret={saveSecret}
                savePlayMove={savePlayMove}
                // MinusOne mode props
                selectedMove1={selectedMove1}
                setSelectedMove1={saveMoveSelection1}
                selectedMove2={selectedMove2}
                setSelectedMove2={saveMoveSelection2}
                secret1={secret1}
                setSecret1={saveSecret1}
                secret2={secret2}
                setSecret2={saveSecret2}
              />
            )}
            {phase === "reveal" && (
              <Reveal
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
                selectedMove={selectedMove}
                secret={secret}
                gameDetails={gameDetails}
                whoAmI={whoAmI}
                // MinusOne mode props
                selectedMove1={selectedMove1}
                selectedMove2={selectedMove2}
                secret1={secret1}
                secret2={secret2}
              />
            )}
            {phase === "withdrawCommit" && (
              <Commit
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                whoAmI={whoAmI}
                gameDetails={gameDetails}
                setStatus={setStatus}
                selectedMove={withdrawChoice}
                setSelectedMove={saveWithdrawChoice}
                secret={withdrawSecret}
                setSecret={saveWithdrawSecret}
                savePlayMove={() => {}}
                isWithdrawPhase={true}
              />
            )}
            {phase === "withdrawReveal" && (
              <Reveal
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
                selectedMove={withdrawChoice}
                secret={withdrawSecret}
                gameDetails={gameDetails}
                whoAmI={whoAmI}
                isWithdrawPhase={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
