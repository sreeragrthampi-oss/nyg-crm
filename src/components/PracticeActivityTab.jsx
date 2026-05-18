import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isBrahmamuhurta(ts) {
  const d = new Date(ts)
  const mins = d.getHours() * 60 + d.getMinutes()
  return mins >= 210 && mins < 360 // 3:30 AM–6:00 AM
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PracticeActivityTab({ studentId, xp, streak }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }
    supabase
      .from('practice_logs')
      .select('id, practice_type, duration_minutes, xp_earned, intensity, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) setLogs(data || [])
        setLoading(false)
      })
  }, [studentId])

  const totalSessions = logs.length
  const totalHours = (logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) / 60).toFixed(1)

  if (loading) {
    return <div className="py-14 text-center text-gray-400 text-sm">Loading activity…</div>
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={totalSessions} sub="all time" />
        <StatCard label="Total Hours"    value={totalHours}    sub="practice time" />
        <StatCard label="Current Streak" value={streak ?? 0}   sub="days" />
        <StatCard label="Total XP"       value={xp ?? 0}       sub="experience points" />
      </div>

      {/* Log table */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No practice logged yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Practice Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Intensity</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">XP Earned</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Brahmamuhurta</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-b border-gray-100 transition-colors ${
                    i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'
                  } ${i === logs.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {log.practice_type || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {log.duration_minutes ? `${log.duration_minutes} min` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {log.intensity != null ? (
                      <span>
                        {log.intensity}
                        <span className="text-gray-300">/10</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {log.xp_earned ? (
                      <span className="font-semibold text-[#1742b5]">+{log.xp_earned}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-center text-base">
                    {isBrahmamuhurta(log.created_at) ? '🌅' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 50 && (
            <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 text-center">
              Showing most recent 50 sessions
            </div>
          )}
        </div>
      )}
    </div>
  )
}
