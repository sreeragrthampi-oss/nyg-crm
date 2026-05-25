import { useState, useEffect, useCallback } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : `${d}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const start = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  return Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
}

const INPUT_CLS =
  'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1742b5]/20 focus:border-[#1742b5] w-full'

// ── Checklist helpers ─────────────────────────────────────────────────────────

const CHECKLIST_1 = [
  { field: 'checklist_video_sent',       label: 'Practice video sent' },
  { field: 'checklist_pdf_sent',         label: 'PDF sent' },
  { field: 'checklist_whatsapp_added',   label: 'Added to WhatsApp group' },
  { field: 'checklist_newsletter_added', label: 'Added to newsletter (Kit)' },
  { field: 'checklist_next_discussed',   label: 'Next attunement discussed' },
]

function getChecklistItems(attunement) {
  if (attunement.attunement_number === 1) return CHECKLIST_1
  const items = [
    { field: 'checklist_symbols_taught', label: '3 Symbols taught' },
  ]
  if (attunement.checklist_symbols_taught) {
    items.push({ field: 'checklist_symbols_pdf_sent', label: '3 Symbols PDF sent' })
  }
  items.push(
    { field: 'checklist_video_sent',     label: 'Practice video confirmed received' },
    { field: 'checklist_next_discussed', label: 'Next attunement discussed' },
  )
  return items
}

function getChecklistProgress(a) {
  if (!a) return { done: 0, total: 0 }
  const items = getChecklistItems(a)
  // For 2-6 with symbols_taught unchecked, base total excludes symbols_pdf_sent (already excluded by getChecklistItems)
  const done = items.filter(i => a[i.field]).length
  return { done, total: items.length }
}

function ChecklistBadge({ attunement }) {
  const { done, total } = getChecklistProgress(attunement)
  if (total === 0) return null
  return (
    <div className={`text-[10px] font-semibold mt-0.5 ${
      done === total ? 'text-green-600' : done > 0 ? 'text-orange-500' : 'text-gray-300'
    }`}>
      {done}/{total}
    </div>
  )
}

function AttunementChecklist({ attunement, onToggle }) {
  const items = getChecklistItems(attunement)
  const { done, total } = getChecklistProgress(attunement)
  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Post-Attunement Checklist</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          done === total && total > 0 ? 'bg-green-50 text-green-700' :
          done > 0 ? 'bg-orange-50 text-orange-600' :
          'bg-gray-100 text-gray-400'
        }`}>
          {done}/{total} complete
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map(({ field, label }) => (
          <button
            key={field}
            onClick={() => onToggle(attunement.id, field, attunement[field])}
            className="flex items-center justify-between w-full py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-sm text-gray-700">{label}</span>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 transition-colors ${attunement[field] ? 'bg-green-500' : 'bg-gray-200'}`}>
              {attunement[field] && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Add Attunement Modal ──────────────────────────────────────────────────────
function AddAttunementModal({ nextNumber, studentProfileId, onClose, onSaved }) {
  const [form, setForm] = useState({
    attunement_number: nextNumber,
    date_attended: todayISO(),
    practice_start_date: '',
    ready_for_next: false,
    admin_notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.date_attended) { setError('Date attended is required.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('araiki_attunements').insert({
      student_profile_id: studentProfileId,
      attunement_number: Number(form.attunement_number),
      date_attended: form.date_attended,
      practice_start_date: form.practice_start_date || null,
      ready_for_next: form.ready_for_next,
      admin_notes: form.admin_notes.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Attunement</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Attunement #</label>
              <select
                value={form.attunement_number}
                onChange={e => set('attunement_number', Number(e.target.value))}
                className={INPUT_CLS}
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date Attended</label>
              <input
                type="date"
                value={form.date_attended}
                onChange={e => set('date_attended', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Practice Start Date</label>
            <input
              type="date"
              value={form.practice_start_date}
              onChange={e => set('practice_start_date', e.target.value)}
              className={INPUT_CLS}
            />
            <p className="text-xs text-gray-400">When the 21-day practice begins (can be set later)</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ready for Next</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('ready_for_next', !form.ready_for_next)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.ready_for_next ? 'bg-[#1742b5]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.ready_for_next ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                {form.ready_for_next ? 'Yes — student is ready' : 'Not yet'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Admin Notes</label>
            <textarea
              value={form.admin_notes}
              onChange={e => set('admin_notes', e.target.value)}
              rows={3}
              placeholder="Any notes about this attunement…"
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1742b5]/20 focus:border-[#1742b5] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-[#1742b5] text-white rounded-lg hover:bg-[#1330a0] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Attunement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function AraikiTab({ studentProfileId }) {
  const [attunements, setAttunements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [launching, setLaunching] = useState(false)

  const fetchAttunements = useCallback(async () => {
    const { data } = await supabase
      .from('araiki_attunements')
      .select('*')
      .eq('student_profile_id', studentProfileId)
      .order('attunement_number', { ascending: true })
    setAttunements(data || [])
    setLoading(false)
  }, [studentProfileId])

  useEffect(() => { fetchAttunements() }, [fetchAttunements])

  const slotMap = {}
  attunements.forEach(a => { slotMap[a.attunement_number] = a })

  const completedCount = attunements.length
  const nextNumber = completedCount < 6 ? completedCount + 1 : null
  const latestAttunement = attunements[attunements.length - 1] || null

  const days = latestAttunement ? daysSince(latestAttunement.practice_start_date) : null
  const challengeStarted = !!(latestAttunement?.practice_start_date)
  const challengeComplete = days !== null && days >= 21
  const progressPct = days !== null && days >= 0 ? Math.min(100, Math.round((days / 21) * 100)) : 0

  async function launchChallenge() {
    if (!latestAttunement) return
    setLaunching(true)
    await supabase
      .from('araiki_attunements')
      .update({ practice_start_date: todayISO() })
      .eq('id', latestAttunement.id)
    await fetchAttunements()
    setLaunching(false)
  }

  async function handleChecklistToggle(attunementId, field, currentValue) {
    const newVal = !currentValue
    const { data, error } = await supabase
      .from('araiki_attunements')
      .update({ [field]: newVal })
      .eq('id', attunementId)
      .select()
      .single()
    if (!error && data) {
      setAttunements(prev => prev.map(a => a.id === attunementId ? data : a))
    }
  }

  if (loading) {
    return <div className="py-14 text-center text-gray-400 text-sm">Loading Araiki data…</div>
  }

  const selectedAttunement = selectedSlot ? slotMap[selectedSlot] : null
  const notesWithContent = attunements.filter(a => a.admin_notes)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Araiki Attunements</h3>
          <p className="text-xs text-gray-400 mt-0.5">{completedCount} of 6 completed</p>
        </div>
        {nextNumber && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1742b5] text-white rounded-lg hover:bg-[#1330a0] transition-colors"
          >
            + Add Attunement
          </button>
        )}
      </div>

      {/* Attunement Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start">
          {[1, 2, 3, 4, 5, 6].map((n, idx) => {
            const a = slotMap[n]
            const completed = !!a
            const isNext = n === nextNumber
            const isSelected = selectedSlot === n

            return (
              <div key={n} className="flex-1 flex flex-col items-center relative">
                {/* Left connector */}
                {idx > 0 && (
                  <div
                    className={`absolute top-7 left-0 right-1/2 h-0.5 z-0 ${
                      completed ? 'bg-[#1742b5]/30' : 'bg-gray-100'
                    }`}
                  />
                )}
                {/* Right connector */}
                {idx < 5 && (
                  <div
                    className={`absolute top-7 left-1/2 right-0 h-0.5 z-0 ${
                      slotMap[n + 1] ? 'bg-[#1742b5]/30' : 'bg-gray-100'
                    }`}
                  />
                )}

                {/* Circle */}
                <button
                  onClick={() => completed ? setSelectedSlot(isSelected ? null : n) : undefined}
                  className={[
                    'relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    completed
                      ? 'bg-[#1742b5] text-white shadow-md hover:shadow-lg hover:scale-105 cursor-pointer'
                      : isNext
                        ? 'border-2 border-[#f97316] text-[#f97316] bg-white cursor-default'
                        : 'border-2 border-gray-200 text-gray-300 bg-white cursor-default',
                    isSelected ? 'ring-4 ring-[#1742b5]/25 scale-110' : '',
                  ].join(' ')}
                >
                  {completed ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{n}</span>
                  )}
                </button>

                <div className="text-center mt-2">
                  <div className="text-xs font-semibold text-gray-600">Attunement {n}</div>
                  {completed ? (
                    <>
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(a.date_attended)}</div>
                      <ChecklistBadge attunement={a} />
                    </>
                  ) : isNext ? (
                    <div
                      className={`text-xs mt-0.5 font-medium ${
                        latestAttunement?.ready_for_next ? 'text-[#f97316]' : 'text-gray-400'
                      }`}
                    >
                      {latestAttunement?.ready_for_next ? 'Ready!' : 'Awaiting'}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 mt-0.5">—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel for selected slot */}
        {selectedAttunement && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-800">
                Attunement {selectedAttunement.attunement_number} — Details
              </h4>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Close ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date Attended</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(selectedAttunement.date_attended)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Practice Start</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(selectedAttunement.practice_start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ready for Next</p>
                <span
                  className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    selectedAttunement.ready_for_next
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {selectedAttunement.ready_for_next ? 'Yes' : 'Not yet'}
                </span>
              </div>
            </div>
            {selectedAttunement.admin_notes && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedAttunement.admin_notes}</p>
              </div>
            )}
            <AttunementChecklist
              attunement={selectedAttunement}
              onToggle={handleChecklistToggle}
            />
          </div>
        )}
      </div>

      {/* Practice Days Panel */}
      {latestAttunement && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Days Practiced Since Attunement {latestAttunement.attunement_number}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Admin decides when the 21-day mark is reached</p>
            </div>
            {!challengeStarted && (
              <button
                onClick={launchChallenge}
                disabled={launching}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#f97316] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex-shrink-0 ml-4"
              >
                {launching ? 'Setting…' : '▶ Launch 21-Day Challenge'}
              </button>
            )}
          </div>

          {!challengeStarted ? (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-5 py-4 text-center">
              <p className="text-sm text-orange-700 font-medium">Challenge not started yet</p>
              <p className="text-xs text-orange-500 mt-1">
                Click "Launch" to mark today as the practice start date
              </p>
            </div>
          ) : days !== null && days < 0 ? (
            <p className="text-sm text-gray-500">
              Practice starts on {formatDate(latestAttunement.practice_start_date)}
            </p>
          ) : challengeComplete ? (
            <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Challenge Complete</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {days} days since {formatDate(latestAttunement.practice_start_date)} — student is ready for the next attunement
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Day {days} of 21</span>
                <span className="text-xs text-gray-400">
                  {21 - days} day{21 - days !== 1 ? 's' : ''} remaining
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#1742b5] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Started: {formatDate(latestAttunement.practice_start_date)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Attunement Notes Timeline */}
      {notesWithContent.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">Attunement Notes</h3>
          <div className="space-y-5">
            {notesWithContent.map(a => (
              <div key={a.id} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1742b5] text-white text-xs font-bold flex items-center justify-center">
                  {a.attunement_number}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-600">
                      Attunement {a.attunement_number}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{formatDate(a.date_attended)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{a.admin_notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && nextNumber && (
        <AddAttunementModal
          nextNumber={nextNumber}
          studentProfileId={studentProfileId}
          onClose={() => setShowModal(false)}
          onSaved={fetchAttunements}
        />
      )}
    </div>
  )
}
