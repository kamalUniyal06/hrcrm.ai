export default function ErrorBox({ message, onRetry }) {
  return (
    <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <h3 className="font-semibold text-lg">Error Loading Data</h3>
      <p className="mt-1">{message}</p>

      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
      >
        Retry
      </button>
    </div>
  );
}
