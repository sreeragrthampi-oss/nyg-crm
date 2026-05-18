import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import IntakeFormTab from '../components/IntakeFormTab'
import PracticeActivityTab from '../components/PracticeActivityTab'
import FeesTab from '../components/FeesTab'

const TABS = ['Intake Form', 'Progress', 'Practice Activity', 'Fees', 'Araiki', 'Notes']

function initials(name) {
  return (name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Intake Form')
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('students')
      .select(`
        id,
        profile_id,
        name,
        phone,
        email,
        xp,
        level_number,
        streak,
        profiles:profile_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('profile_id', id)
      .maybeSingle()
      .then(({ data }) => {
        setStudent(data)
        setLoading(false)
      })
  }, [id])

  const displayName = student?.name || student?.profiles?.full_name || 'Unknown Student'
  const avatarUrl   = student?.profiles?.avatar_url
  const nygId       = `NYG-${(id || '').slice(0, 8).toUpperCase()}`

  if (loading) {
    return <div className="p-6 py-16 text-center text-gray-400 text-sm">Loading student…</div>
  }

  return (
    <div className="p-6">
      {/* Back */}
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Students
      </button>

      {/* Student header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#1742b5] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials(displayName)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">{nygId}</p>
            {student?.level_number != null && (
              <span className="inline-block mt-2 text-xs bg-blue-50 text-[#1742b5] font-semibold px-2.5 py-0.5 rounded-full">
                Level {student.level_number}
              </span>
            )}
          </div>

          <div className="flex gap-8 text-center flex-shrink-0">
            <div>
              <div className="text-2xl font-bold text-gray-900">{student?.xp ?? 0}</div>
              <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">XP</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{student?.streak ?? 0}</div>
              <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 px-2 flex">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-[#1742b5] text-[#1742b5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="border border-gray-200 border-t-0 rounded-b-xl bg-[#f8fafc] p-6">
        {activeTab === 'Intake Form' && (
          <IntakeFormTab studentProfileId={id} />
        )}
        {activeTab === 'Practice Activity' && (
          <PracticeActivityTab
            studentId={student?.id}
            xp={student?.xp}
            streak={student?.streak}
          />
        )}
        {activeTab === 'Fees' && (
          <FeesTab studentProfileId={id} />
        )}
        {activeTab !== 'Intake Form' && activeTab !== 'Practice Activity' && activeTab !== 'Fees' && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            {activeTab} — coming soon
          </div>
        )}
      </div>
    </div>
  )
}
