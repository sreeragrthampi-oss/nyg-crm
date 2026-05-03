import { useAuth } from '../context/AuthContext'

export default function AccessDenied() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="text-center max-w-sm px-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl">✕</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          This dashboard is restricted to NYG admins. Your account does not have admin access.
        </p>
        <button
          onClick={signOut}
          className="bg-[#1742b5] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1338a0] transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
