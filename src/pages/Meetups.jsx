import { useState, useEffect } from 'react'
import { Plus, X, MapPin, Star, Copy, Check, Trash2, Wifi, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

function generateEventCode() {
  return 'NYG' + Math.random().toString(36).substring(2, 7).toUpperCase()
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatShortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const EMPTY_MEETUP = { title: '', date: '', type: 'offline', location: '', description: '', event_code: '', xp_reward: 50 }
const EMPTY_ATTENDEE = { name: '', phone: '', is_student: false, student_profile_id: '' }

export default function Meetups() {
  const [meetups, setMeetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMeetup, setSelectedMeetup] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMeetup, setNewMeetup] = useState({ ...EMPTY_MEETUP, event_code: generateEventCode() })
  const [saving, setSaving] = useState(false)
  const [newAttendee, setNewAttendee] = useState(EMPTY_ATTENDEE)
  const [savingAttendee, setSavingAttendee] = useState(false)
  const [students, setStudents] = useState([])
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => { fetchMeetups() }, [])

  useEffect(() => {
    if (selectedMeetup) fetchAttendance(selectedMeetup.id)
    else setAttendance([])
  }, [selectedMeetup?.id])

  useEffect(() => {
    supabase.from('students').select('profile_id, name').order('name')
      .then(({ data }) => setStudents(data || []))
  }, [])

  async function fetchMeetups() {
    const { data } = await supabase
      .from('meetups')
      .select('*, meetup_attendance(count)')
      .order('date', { ascending: false })
    setMeetups(data || [])
    setLoading(false)
  }

  async function fetchAttendance(meetupId) {
    setLoadingAttendance(true)
    const { data } = await supabase
      .from('meetup_attendance')
      .select('*')
      .eq('meetup_id', meetupId)
      .order('attended_at', { ascending: false })
    setAttendance(data || [])
    setLoadingAttendance(false)
  }

  async function handleAddMeetup(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = { ...newMeetup, xp_reward: Number(newMeetup.xp_reward) || 50 }
    if (!payload.location) delete payload.location
    if (!payload.description) delete payload.description
    const { data, error } = await supabase.from('meetups').insert(payload).select('*').single()
    if (error) {
      console.error('Create meetup error:', error)
      setSaveError(error.message)
      setSaving(false)
      return
    }
    // Attach a zero count so MeetupCard renders without a separate fetch
    setMeetups(prev => [{ ...data, meetup_attendance: [{ count: 0 }] }, ...prev])
    setShowAddModal(false)
    setNewMeetup({ ...EMPTY_MEETUP, event_code: generateEventCode() })
    setSaving(false)
  }

  async function handleAddAttendee(e) {
    e.preventDefault()
    if (!newAttendee.name.trim()) return
    setSavingAttendee(true)
    const payload = {
      meetup_id: selectedMeetup.id,
      name: newAttendee.name.trim(),
      phone: newAttendee.phone.trim() || null,
      is_student: newAttendee.is_student,
      student_profile_id: newAttendee.is_student && newAttendee.student_profile_id ? newAttendee.student_profile_id : null,
    }
    const { data, error } = await supabase.from('meetup_attendance').insert(payload).select().single()
    if (!error && data) {
      setAttendance(prev => [data, ...prev])
      setNewAttendee(EMPTY_ATTENDEE)
      // bump count on the meetup in the list
      setMeetups(prev => prev.map(m =>
        m.id === selectedMeetup.id
          ? { ...m, meetup_attendance: [{ count: (m.meetup_attendance?.[0]?.count ?? 0) + 1 }] }
          : m
      ))
    }
    setSavingAttendee(false)
  }

  async function handleDeleteMeetup() {
    setDeleting(true)
    const { error } = await supabase.from('meetups').delete().eq('id', selectedMeetup.id)
    if (!error) {
      setMeetups(prev => prev.filter(m => m.id !== selectedMeetup.id))
      setSelectedMeetup(null)
      setShowDeleteConfirm(false)
    }
    setDeleting(false)
  }

  function copyEventCode(code) {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const now = new Date()
  const upcoming = meetups.filter(m => new Date(m.date) >= now)
  const thisMonth = meetups.filter(m => {
    const d = new Date(m.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meetups</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? '...' : `${meetups.length} total · ${upcoming.length} upcoming`}
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setSaveError('') }}
          className="flex items-center gap-2 bg-[#1742b5] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1338a0] transition-colors"
        >
          <Plus size={16} />
          Add Meetup
        </button>
      </div>

      {/* Stats */}
      <div className="px-6 pt-5 grid grid-cols-3 gap-4 flex-shrink-0">
        <StatCard label="Total Meetups" value={loading ? '—' : meetups.length} color="blue" />
        <StatCard label="This Month" value={loading ? '—' : thisMonth.length} color="gray" />
        <StatCard label="Upcoming" value={loading ? '—' : upcoming.length} color="green" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : meetups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
            No meetups yet. Create your first one.
          </div>
        ) : (
          <div className="space-y-3">
            {meetups.map(m => (
              <MeetupCard
                key={m.id}
                meetup={m}
                isUpcoming={new Date(m.date) >= now}
                onClick={() => setSelectedMeetup(m)}
                active={selectedMeetup?.id === m.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add Meetup Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-semibold text-gray-900">Add Meetup</h2>
              <button onClick={() => { setShowAddModal(false); setNewMeetup({ ...EMPTY_MEETUP, event_code: generateEventCode() }) }}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleAddMeetup} className="p-6 space-y-4">
              <Field label="Title *">
                <input required value={newMeetup.title}
                  onChange={e => setNewMeetup(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Bi-weekly Yoga Meetup"
                  className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date & Time *">
                  <input required type="datetime-local" value={newMeetup.date}
                    onChange={e => setNewMeetup(p => ({ ...p, date: e.target.value }))}
                    className={inputCls} />
                </Field>
                <Field label="Type">
                  <select value={newMeetup.type}
                    onChange={e => setNewMeetup(p => ({ ...p, type: e.target.value }))}
                    className={selectCls}>
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </Field>
              </div>
              <Field label={newMeetup.type === 'online' ? 'Meeting Link / Platform' : 'Venue / Location'}>
                <input value={newMeetup.location}
                  onChange={e => setNewMeetup(p => ({ ...p, location: e.target.value }))}
                  placeholder={newMeetup.type === 'online' ? 'e.g. Google Meet link' : 'e.g. NYG Studio, Kochi'}
                  className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea value={newMeetup.description} rows={3}
                  onChange={e => setNewMeetup(p => ({ ...p, description: e.target.value }))}
                  placeholder="What's this meetup about?"
                  className={`${inputCls} resize-none`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Event Code">
                  <div className="flex gap-2">
                    <input value={newMeetup.event_code}
                      onChange={e => setNewMeetup(p => ({ ...p, event_code: e.target.value.toUpperCase() }))}
                      placeholder="Auto-generated"
                      className={`${inputCls} font-mono tracking-wider`} />
                    <button type="button"
                      onClick={() => setNewMeetup(p => ({ ...p, event_code: generateEventCode() }))}
                      className="px-3 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 flex-shrink-0 whitespace-nowrap">
                      New
                    </button>
                  </div>
                </Field>
                <Field label="XP Reward">
                  <input type="number" value={newMeetup.xp_reward} min={0}
                    onChange={e => setNewMeetup(p => ({ ...p, xp_reward: e.target.value }))}
                    className={inputCls} />
                </Field>
              </div>
              {saveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setShowAddModal(false); setSaveError(''); setNewMeetup({ ...EMPTY_MEETUP, event_code: generateEventCode() }) }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#1742b5] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1338a0] transition-colors disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Meetup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Meetup Detail Panel ── */}
      {selectedMeetup && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedMeetup(null)} />
          <div className="absolute right-0 top-0 h-full w-[440px] bg-white shadow-2xl flex flex-col">

            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div className="flex-1 min-w-0 mr-3">
                <h2 className="font-semibold text-gray-900 leading-snug">{selectedMeetup.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(selectedMeetup.date)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setSelectedMeetup(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* Details section */}
              <div className="p-5 space-y-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${selectedMeetup.type === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    <Wifi size={11} />
                    {selectedMeetup.type === 'online' ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(selectedMeetup.date)}</span>
                </div>

                {selectedMeetup.location && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{selectedMeetup.location}</span>
                  </div>
                )}

                {selectedMeetup.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                    {selectedMeetup.description}
                  </p>
                )}

                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Event Code</p>
                    <p className="font-mono font-bold text-gray-900 text-base mt-0.5 tracking-widest">
                      {selectedMeetup.event_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copyEventCode(selectedMeetup.event_code)}
                    className="p-2 text-gray-400 hover:text-[#1742b5] hover:bg-blue-50 rounded-lg transition-colors">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-amber-500 fill-amber-400" />
                  <span className="text-sm text-gray-700 font-medium">{selectedMeetup.xp_reward} XP reward</span>
                </div>
              </div>

              {/* Attendance section */}
              <div className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Attendance · {attendance.length}
                </p>

                {/* Add attendee form */}
                <form onSubmit={handleAddAttendee} className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500">Mark Attendance</p>
                  <input
                    value={newAttendee.name}
                    onChange={e => setNewAttendee(p => ({ ...p, name: e.target.value }))}
                    placeholder="Full name *"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1742b5]"
                  />
                  <input
                    value={newAttendee.phone}
                    onChange={e => setNewAttendee(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1742b5]"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newAttendee.is_student}
                      onChange={e => setNewAttendee(p => ({ ...p, is_student: e.target.checked, student_profile_id: '' }))}
                      className="rounded border-gray-300"
                    />
                    Existing student
                  </label>
                  {newAttendee.is_student && (
                    <select
                      value={newAttendee.student_profile_id}
                      onChange={e => {
                        const s = students.find(s => s.profile_id === e.target.value)
                        setNewAttendee(p => ({ ...p, student_profile_id: e.target.value, name: s?.name || p.name }))
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1742b5]"
                    >
                      <option value="">Select student…</option>
                      {students.map(s => (
                        <option key={s.profile_id} value={s.profile_id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                  <button type="submit" disabled={savingAttendee || !newAttendee.name.trim()}
                    className="w-full bg-[#1742b5] text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-[#1338a0] transition-colors disabled:opacity-50">
                    {savingAttendee ? 'Adding…' : 'Mark as Attended'}
                  </button>
                </form>

                {/* Attendance list */}
                {loadingAttendance ? (
                  <div className="py-8 text-center text-gray-300 text-xs">Loading…</div>
                ) : attendance.length === 0 ? (
                  <div className="py-8 text-center text-gray-300 text-xs">No attendees yet</div>
                ) : (
                  <div className="space-y-2">
                    {attendance.map(a => (
                      <div key={a.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${a.is_student ? 'bg-[#1742b5]/10 text-[#1742b5]' : 'bg-gray-100 text-gray-500'}`}>
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                          {a.phone && <p className="text-xs text-gray-400">{a.phone}</p>}
                        </div>
                        {a.is_student && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 flex-shrink-0">
                            Student
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">Delete Meetup?</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Permanently delete <strong>{selectedMeetup?.title}</strong> and all attendance records? This cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <button onClick={handleDeleteMeetup} disabled={deleting}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, Delete Meetup'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MeetupCard({ meetup, isUpcoming, onClick, active }) {
  const count = meetup.meetup_attendance?.[0]?.count ?? 0
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border px-5 py-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${active ? 'border-[#1742b5]/40 shadow-sm' : 'border-gray-200'}`}
    >
      {/* Date block */}
      <div className="flex-shrink-0 w-12 text-center">
        <p className="text-lg font-bold text-gray-900 leading-none">
          {new Date(meetup.date).getDate()}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(meetup.date).toLocaleDateString('en-IN', { month: 'short' })}
        </p>
        <p className="text-xs text-gray-300">
          {new Date(meetup.date).getFullYear()}
        </p>
      </div>

      <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-gray-900 truncate">{meetup.title}</p>
          {isUpcoming && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 flex-shrink-0">
              Upcoming
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${meetup.type === 'online' ? 'text-blue-600' : 'text-gray-500'}`}>
            <Wifi size={10} />
            {meetup.type === 'online' ? 'Online' : 'Offline'}
          </span>
          {meetup.location && (
            <span className="text-xs text-gray-400 flex items-center gap-1 truncate max-w-[180px]">
              <MapPin size={10} className="flex-shrink-0" />
              {meetup.location}
            </span>
          )}
        </div>
      </div>

      {/* Right side stats */}
      <div className="flex-shrink-0 text-right space-y-1">
        <div className="flex items-center gap-1.5 justify-end">
          <Users size={12} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{count}</span>
        </div>
        <p className="text-[10px] font-mono text-gray-300 tracking-wider">{meetup.event_code}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colorMap = { blue: 'text-[#1742b5]', green: 'text-green-600', gray: 'text-gray-700' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1742b5] focus:border-transparent transition-shadow'
const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1742b5] focus:border-transparent transition-shadow'
