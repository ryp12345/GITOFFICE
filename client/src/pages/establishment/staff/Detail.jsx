// Reusable Detail component
export default function Detail({ label, value }) {
  return (
    <div className="mb-2">
      <span className="block text-sm font-semibold text-gray-600 mb-1">{label}</span>
      <span className="block text-base text-gray-900 bg-gray-50 rounded px-2 py-1 border border-gray-200">{value || '-'}</span>
    </div>
  );
}
