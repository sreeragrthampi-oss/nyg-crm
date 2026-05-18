import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Parameter definitions ─────────────────────────────────────────────────────
//   dir: -1 = lower is better, +1 = higher is better, 0 = neutral (no colouring)
const PARAMS = [
  { key: 'pulse_bpm',         label: 'Pulse',            unit: 'bpm',  dir: -1 },
  { key: 'systolic_bp',       label: 'Systolic BP',      unit: 'mmHg', dir: -1 },
  { key: 'diastolic_bp',      label: 'Diastolic BP',     unit: 'mmHg', dir: -1 },
  { key: 'respiratory_rate',  label: 'Respiratory Rate', unit: '/min', dir: -1 },
  { key: 'bhramari_time_sec', label: 'Bhramari Time',    unit: 'sec',  dir: +1 },
  { key: 'height_cm',         label: 'Height',           unit: 'cm',   dir:  0 },
  { key: 'weight_kg',         label: 'Weight',           unit: 'kg',   dir:  0 },
  { key: 'bmi',               label: 'BMI',              unit: '',     dir: -1 },
  { key: 'symptom_score',     label: 'Symptom Score',    unit: '/10',  dir: -1 },
]

const LABEL_OPTS = ['Intake', '1 Month', '3 Months', '6 Months', 'Custom']

const EMPTY = {
  label: 'Intake', recorded_at: '', pulse_bpm: '', systolic_bp: '', diastolic_bp: '',
  respiratory_rate: '', bhramari_time_sec: '', height_cm: '', weight_kg: '',
  symptom_score: '', notes: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const INPUT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1742b5]/20 focus:border-[#1742b5] w-full'

function calcBMI(h, w) {
  const hf = parseFloat(h), wf = parseFloat(w)
  if (!hf || !wf || hf <= 0) return ''
  return (wf / ((hf / 100) ** 2)).toFixed(2)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function toInt(v) { return v !== '' ? parseInt(v, 10) : null }
function toFloat(v) { return v !== '' ? parseFloat(v) : null }

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function EntryModal({ studentProfileId, entry, onClose, onSaved }) {
  const isEdit = !!entry

  const [form, setForm] = useState(() => isEdit ? {
    label:             entry.label            || 'Intake',
    recorded_at:       entry.recorded_at      || '',
    pulse_bpm:         entry.pulse_bpm        ?? '',
    systolic_bp:       entry.systolic_bp      ?? '',
    diastolic_bp:      entry.diastolic_bp     ?? '',
    respiratory_rate:  entry.respiratory_rate ?? '',
    bhramari_time_sec: entry.bhramari_time_sec ?? '',
    height_cm:         entry.height_cm        ?? '',
    weight_kg:         entry.weight_kg        ?? '',
    symptom_score:     entry.symptom_score    ?? '',
    notes:             entry.notes            || '',
  } : { ...EMPTY })

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }))
  const bmi = calcBMI(form.height_cm, form.weight_kg)

  async function handleSave() {
    if (!form.recorded_at) { setError('Date is required.'); return }
    setSaving(true)
    setError('')

    const payload = {
      student_profile_id: studentProfileId,
      label:              form.label || null,
      recorded_at:        form.recorded_at,
      pulse_bpm:          toInt(form.pulse_bpm),
      systolic_bp:        toInt(form.systolic_bp),
      diastolic_bp:       toInt(form.diastolic_bp),
      respiratory_rate:   toInt(form.respiratory_rate),
      bhramari_time_sec:  toInt(form.bhramari_time_sec),
      height_cm:          toFloat(form.height_cm),
      weight_kg:          toFloat(form.weight_kg),
      symptom_score:      toInt(form.symptom_score),
      notes:              form.notes || null,
    }

    const result = isEdit
      ? await supabase.from('progress_entries').update(payload).eq('id', entry.id)
      : await supabase.from('progress_entries').insert(payload)

    if (result.error) { setError(result.error.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Progress Entry' : 'Add Progress Entry'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Row 1 — label, date, symptom score */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Label">
              <select value={form.label} onChange={set('label')} className={INPUT}>
                {LABEL_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={form.recorded_at} onChange={set('recorded_at')} className={INPUT} />
            </Field>
            <Field label="Symptom Score (1–10)">
              <input
                type="number" min="1" max="10"
                value={form.symptom_score} onChange={set('symptom_score')}
                placeholder="1 = none, 10 = severe"
                className={INPUT}
              />
            </Field>
          </div>

          {/* Row 2 — cardio vitals */}
          <div className="grid grid-cols-4 gap-4">
            <Field label="Pulse (bpm)">
              <input type="number" value={form.pulse_bpm} onChange={set('pulse_bpm')} placeholder="72" className={INPUT} />
            </Field>
            <Field label="Systolic BP">
              <input type="number" value={form.systolic_bp} onChange={set('systolic_bp')} placeholder="120" className={INPUT} />
            </Field>
            <Field label="Diastolic BP">
              <input type="number" value={form.diastolic_bp} onChange={set('diastolic_bp')} placeholder="80" className={INPUT} />
            </Field>
            <Field label="Resp. Rate (/min)">
              <input type="number" value={form.respiratory_rate} onChange={set('respiratory_rate')} placeholder="16" className={INPUT} />
            </Field>
          </div>

          {/* Row 3 — body + bhramari */}
          <div className="grid grid-cols-4 gap-4">
            <Field label="Bhramari Time (sec)">
              <input type="number" value={form.bhramari_time_sec} onChange={set('bhramari_time_sec')} placeholder="0" className={INPUT} />
            </Field>
            <Field label="Height (cm)">
              <input type="number" value={form.height_cm} onChange={set('height_cm')} placeholder="165" className={INPUT} />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" value={form.weight_kg} onChange={set('weight_kg')} placeholder="62" className={INPUT} />
            </Field>
            <Field label="BMI (auto)">
              <div className="px-3 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700">
                {bmi || <span className="font-normal text-gray-400">—</span>}
              </div>
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes} onChange={set('notes')}
              rows={3} placeholder="Any observations or notes…"
              className={`${INPUT} resize-none`}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
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
            {saving ? 'Saving…' : isEdit ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Before / After comparison table ──────────────────────────────────────────
function ComparisonTable({ entries }) {
  const first  = entries[0]
  const latest = entries[entries.length - 1]

  function valueCls(param, value, baseEntry) {
    if (param.dir === 0) return 'text-gray-700'
    const base = parseFloat(baseEntry[param.key])
    const val  = parseFloat(value)
    if (isNaN(base) || isNaN(val) || base === val) return 'text-gray-700'
    const improved = param.dir === -1 ? val < base : val > base
    return improved ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'
  }

  function pctChange(param) {
    const f = parseFloat(first[param.key])
    const l = parseFloat(latest[param.key])
    if (isNaN(f) || isNaN(l) || f === 0) return null
    const pct = (l - f) / Math.abs(f) * 100
    const improved = param.dir === 0 ? null : param.dir === -1 ? pct < 0 : pct > 0
    return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, improved }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Before / After Comparison
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Parameter
              </th>
              {entries.map(e => (
                <th key={e.id} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <span className="whitespace-nowrap">{e.label}</span>
                  <span className="block font-normal normal-case text-gray-400 mt-0.5">
                    {formatDate(e.recorded_at)}
                  </span>
                </th>
              ))}
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span className="whitespace-nowrap">Change</span>
                <span className="block font-normal normal-case text-gray-400 mt-0.5">first → latest</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {PARAMS.map((param, i) => {
              const change = pctChange(param)
              return (
                <tr
                  key={param.key}
                  className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/40' : ''} ${
                    i === PARAMS.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-gray-700 whitespace-nowrap">
                    {param.label}
                    {param.unit && (
                      <span className="text-gray-400 font-normal ml-1 text-xs">({param.unit})</span>
                    )}
                  </td>
                  {entries.map((e, ei) => {
                    const val = e[param.key]
                    const cls = ei === 0 ? 'text-gray-700' : valueCls(param, val, first)
                    return (
                      <td key={e.id} className={`px-5 py-3 ${cls}`}>
                        {val != null ? val : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                  <td className="px-5 py-3">
                    {change ? (
                      <span className={
                        change.improved === true  ? 'font-semibold text-green-600' :
                        change.improved === false ? 'font-semibold text-red-500'   :
                        'text-gray-500'
                      }>
                        {change.text}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit }) {
  const filled = PARAMS.filter(p => entry[p.key] != null)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900">{entry.label}</span>
          <span className="text-sm text-gray-400">{formatDate(entry.recorded_at)}</span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-[#1742b5] border border-[#1742b5]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Edit
        </button>
      </div>

      {filled.length > 0 ? (
        <div className="grid grid-cols-4 gap-x-8 gap-y-4">
          {filled.map(param => (
            <div key={param.key}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{param.label}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {entry[param.key]}
                {param.unit && (
                  <span className="text-gray-400 font-normal ml-1 text-xs">{param.unit}</span>
                )}
              </p>
            </div>
          ))}
          {entry.notes && (
            <div className="col-span-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{entry.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No parameters recorded.</p>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ProgressTab({ studentProfileId }) {
  const [entries,   setEntries]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [editEntry, setEditEntry] = useState(null)

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('progress_entries')
      .select('*')
      .eq('student_profile_id', studentProfileId)
      .order('recorded_at', { ascending: true })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [studentProfileId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  if (loading) {
    return <div className="py-14 text-center text-gray-400 text-sm">Loading progress…</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1742b5] text-white rounded-lg hover:bg-[#1330a0] transition-colors"
        >
          + Add Entry
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No progress entries yet. Add the first entry to begin tracking.
        </div>
      ) : (
        <>
          {/* Comparison table — only when 2+ entries */}
          {entries.length >= 2 && <ComparisonTable entries={entries} />}

          {/* Entry cards — newest first */}
          <div className="space-y-4">
            {[...entries].reverse().map(entry => (
              <EntryCard key={entry.id} entry={entry} onEdit={() => setEditEntry(entry)} />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {showAdd && (
        <EntryModal
          studentProfileId={studentProfileId}
          entry={null}
          onClose={() => setShowAdd(false)}
          onSaved={fetchEntries}
        />
      )}
      {editEntry && (
        <EntryModal
          studentProfileId={studentProfileId}
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={fetchEntries}
        />
      )}
    </div>
  )
}
