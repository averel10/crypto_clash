interface CommitProps {
  playMove: string;
  setPlayMove: (v: string) => void;
  handlePlay: () => void;
  loading: boolean;
  account: string;
  contract: any;
  bothPlayed: string;
  handleBothPlayed: () => void;
  revealTimeLeft: string;
  handleRevealTimeLeft: () => void;
}

export default function Commit({
  playMove,
  setPlayMove,
  handlePlay,
  loading,
  account,
  contract,
  bothPlayed,
  handleBothPlayed,
  revealTimeLeft,
  handleRevealTimeLeft,
}: Readonly<CommitProps>) {
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
        <button onClick={handleBothPlayed} className="bg-gray-200 px-2 py-1 rounded">bothPlayed</button>
        <span className="ml-2 text-xs">{bothPlayed}</span>
        <br />
        <button onClick={handleRevealTimeLeft} className="bg-gray-200 px-2 py-1 rounded">revealTimeLeft</button>
        <span className="ml-2 text-xs">{revealTimeLeft}</span>
      </div>
    </div>
  );
}
