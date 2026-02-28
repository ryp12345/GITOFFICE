import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';

export default function UserDashboard() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Establishment Dashboard</h2>
            <p className="mt-2 text-slate-600">Welcome to the Establishment panel.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
