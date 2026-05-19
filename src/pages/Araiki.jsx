import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const start = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  return Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : `${d}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getStatus(daysSinceLog) {
  if (daysSinceLog === null || daysSinceLog >= 4) return 'red'
  if (daysSinceLog === 3) return 'yellow'
  return 'green'
}

const STATUS_ORDER = { red: 0, yellow: 1, green: 2 }

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  const colorMap = {
    blue:   'text-[#1742b5]',
    green:  'text-green-600',
    yellow: 'text-amber-600',
    red:    'text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    green:  { label: 'On Track', cls: 'bg-green-50 text-green-700 border border-green-100' },
    yellow: { label: 'At Risk',  cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
    red:    { label: 'Inactive', cls: 'bg-red-50 text-red-700 border border-red-100' },
  }[status]
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ConfirmModal({ count, onConfirm, onClose, loading }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={() => !loading && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Launch All Challenges?</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none disabled:opacity-50"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            This will set <strong>today</strong> as the practice start date for{' '}
            <strong>{count} student{count !== 1 ? 's' : ''}</strong> who have attunement records
            but haven't started their 21-day challenge yet.
          </p>
          <p className="text-xs text-gray-400 mt-3">This cannot be undone automatically.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium bg-[#f97316] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Launching…' : 'Yes, Launch All'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Araiki() {
  const [rows, setRows] = useState([])
  const [pendingIds, setPendingIds] = useState([])   // attunement record ids to launch
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [launching, setLaunching] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 1. All attunements, latest-first per student
    const { data: allAtt = [] } = await supabase
      .from('araiki_attunements')
      .select('*, profiles:student_profile_id(full_name)')
      .order('attunement_number', { ascending: false })

    // 2. Keep only the latest attunement per student
    const latestMap = {}
    allAtt.forEach(a => {
      if (!latestMap[a.student_profile_id]) latestMap[a.student_profile_id] = a
    })

    // Identify students eligible for global launch (no practice_start_date)
    const pending = Object.values(latestMap).filter(a => !a.practice_start_date)
    setPendingIds(pending.map(a => a.id))

    // Active challenges only
    const activeEntries = Object.values(latestMap).filter(a => a.practice_start_date)

    if (activeEntries.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    const activeProfileIds = activeEntries.map(a => a.student_profile_id)

    // 3. students table: profile_id → student.id (needed for practice_logs)
    const { data: studentRows = [] } = await supabase
      .from('students')
      .select('id, profile_id')
      .in('profile_id', activeProfileIds)

    const profileToStudentId = {}
    studentRows.forEach(s => { profileToStudentId[s.profile_id] = s.id })

    // 4. Latest Araiki practice log per student
    const studentIds = Object.values(profileToStudentId).filter(Boolean)
    const lastLogMap = {}

    if (studentIds.length > 0) {
      const { data: logs = [] } = await supabase
        .from('practice_logs')
        .select('student_id, created_at')
        .eq('practice_type', 'Araiki')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })

      logs.forEach(l => {
        if (!lastLogMap[l.student_id]) lastLogMap[l.student_id] = l.created_at
      })
    }

    // 5. Build display rows
    const built = activeEntries.map(att => {
      const studentId = profileToStudentId[att.student_profile_id]
      const lastLog   = studentId ? (lastLogMap[studentId] || null) : null
      const daysElapsed  = Math.max(0, daysSince(att.practice_start_date) ?? 0)
      const daysSinceLog = daysSince(lastLog)
      const status       = getStatus(daysSinceLog)
      const workingToward = att.attunement_number < 6 ? att.attunement_number + 1 : null

      return {
        profileId: att.student_profile_id,
        name: att.profiles?.full_name || 'Unknown',
        nygId: `NYG-${att.student_profile_id.slice(0, 8).toUpperCase()}`,
        attunementNumber: att.attunement_number,
        workingToward,
        daysElapsed,
        lastLogDate: lastLog,
        daysSinceLog,
        status,
      }
    })

    // Sort: red → yellow → green, tiebreak days elapsed desc
    built.sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return so !== 0 ? so : b.daysElapsed - a.daysElapsed
    })

    setRows(built)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleGlobalLaunch() {
    setLaunching(true)
    const today = todayISO()
    await supabase
      .from('araiki_attunements')
      .update({ practice_start_date: today })
      .in('id', pendingIds)
    setShowConfirm(false)
    setLaunching(false)
    fetchData()
  }

  // Summary stats
  const total    = rows.length
  const onTrack  = rows.filter(r => r.status === 'green').length
  const atRisk   = rows.filter(r => r.status === 'yellow').length
  const inactive = rows.filter(r => r.status === 'red').length

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Araiki</h1>
          <p className="text-gray-400 text-sm mt-0.5">Attunement tracker — 6 levels, 21-day practice gaps</p>
        </div>
        {pendingIds.length > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#f97316] text-white rounded-lg hover:bg-orange-600 transition-colors flex-shrink-0"
          >
            ▶ Launch All Challenges ({pendingIds.length})
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Challenges" value={loading ? '—' : total}    color="blue"   />
        <StatCard label="On Track"          value={loading ? '—' : onTrack}  color="green"  />
        <StatCard label="At Risk"           value={loading ? '—' : atRisk}   color="yellow" />
        <StatCard label="Inactive"          value={loading ? '—' : inactive} color="red"    />
      </div>

      {/* Live challenge table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Live Challenge Tracker</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No active challenges. Launch one from a student's Araiki tab.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">NYG ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Working Toward</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Days Elapsed</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Araiki Log</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.profileId}
                  className={`hover:bg-gray-50 transition-colors ${i < rows.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/students/${row.profileId}`}
                      className="font-medium text-gray-900 hover:text-[#1742b5] transition-colors"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{row.nygId}</td>
                  <td className="px-4 py-3.5">
                    {row.workingToward ? (
                      <span className="text-gray-800 font-medium">Attunement {row.workingToward}</span>
                    ) : (
                      <span className="text-xs text-gray-400">All complete</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-gray-800">{row.daysElapsed}</span>
                    <span className="text-xs text-gray-400 ml-1">days</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {row.lastLogDate
                      ? formatDate(row.lastLogDate)
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          count={pendingIds.length}
          onConfirm={handleGlobalLaunch}
          onClose={() => setShowConfirm(false)}
          loading={launching}
        />
      )}
    </div>
  )
}
