import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AddEnrollmentModal from './AddEnrollmentModal'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_METHOD_OPTS    = ['Cash', 'UPI', 'Bank Transfer', 'Other']
const INSTALLMENT_STATUS_OPTS = ['Paid', 'Pending', 'Overdue']

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function formatDate(d) {
  if (!d) return '—'
  // append time to force local-timezone interpretation of date-only strings
  return new Date(d.includes('T') ? d : `${d}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Badge colour maps ─────────────────────────────────────────────────────────
const ENROLLMENT_BADGE = {
  Active:    'bg-green-50 text-green-700 border border-green-100',
  Completed: 'bg-blue-50 text-blue-700 border border-blue-100',
  Dropped:   'bg-red-50 text-red-700 border border-red-100',
}

const INSTALLMENT_BADGE = {
  Paid:    'bg-green-50 text-green-700 border border-green-100',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  Overdue: 'bg-red-50 text-red-700 border border-red-100',
}

// ── Shared form primitives ────────────────────────────────────────────────────
const INPUT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1742b5]/20 focus:border-[#1742b5] w-full'

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Badge({ label, map }) {
  const cls = map[label] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 ${accent || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

// ── Add Installment Modal ─────────────────────────────────────────────────────
function AddInstallmentModal({ enrollmentId, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: '', due_date: '', paid_date: '', payment_method: '', status: 'Pending', receipt_notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('installments').insert({
      enrollment_id:  enrollmentId,
      amount:         form.amount !== '' ? parseFloat(form.amount) : null,
      due_date:       form.due_date   || null,
      paid_date:      form.paid_date  || null,
      payment_method: form.payment_method || null,
      status:         form.status,
      receipt_notes:  form.receipt_notes || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Installment</h2>
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
            <Field label="Amount (₹)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">₹</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={set('amount')}
                  placeholder="0"
                  min="0"
                  className={`${INPUT} pl-7`}
                />
              </div>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={INPUT}>
                {INSTALLMENT_STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Due Date">
              <input type="date" value={form.due_date} onChange={set('due_date')} className={INPUT} />
            </Field>
            <Field label="Paid Date (if paid)">
              <input type="date" value={form.paid_date} onChange={set('paid_date')} className={INPUT} />
            </Field>
          </div>

          <Field label="Payment Method">
            <select value={form.payment_method} onChange={set('payment_method')} className={INPUT}>
              <option value="">— Select —</option>
              {PAYMENT_METHOD_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Receipt Notes">
            <textarea
              value={form.receipt_notes}
              onChange={set('receipt_notes')}
              rows={2}
              placeholder="Reference number, any notes…"
              className={`${INPUT} resize-none`}
            />
          </Field>
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
            {saving ? 'Saving…' : 'Save Installment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Enrollment card ───────────────────────────────────────────────────────────
function EnrollmentCard({ enrollment, onAddInstallment }) {
  const installments = [...(enrollment.installments || [])].sort(
    (a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0)
  )

  const paidTotal = installments
    .filter(i => i.status === 'Paid')
    .reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className="font-semibold text-gray-900">{enrollment.course || 'Untitled Course'}</h4>
          <Badge label={enrollment.status || 'Active'} map={ENROLLMENT_BADGE} />
          {enrollment.fee_type && (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {enrollment.fee_type}
            </span>
          )}
        </div>
        <button
          onClick={onAddInstallment}
          className="flex-shrink-0 ml-4 text-xs font-medium text-[#1742b5] border border-[#1742b5]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          + Add Installment
        </button>
      </div>

      {/* Card meta row */}
      <div className="px-6 py-3 flex flex-wrap gap-6 bg-gray-50/60 border-b border-gray-100 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Start Date</span>
          <span className="font-medium text-gray-700 mt-0.5">{formatDate(enrollment.start_date)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Total Agreed</span>
          <span className="font-medium text-gray-700 mt-0.5">{formatINR(enrollment.total_fee_agreed)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Paid</span>
          <span className="font-semibold text-green-600 mt-0.5">{formatINR(paidTotal)}</span>
        </div>
        {enrollment.total_fee_agreed > 0 && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Outstanding</span>
            <span className={`font-semibold mt-0.5 ${(enrollment.total_fee_agreed - paidTotal) > 0 ? 'text-[#f97316]' : 'text-gray-500'}`}>
              {formatINR(enrollment.total_fee_agreed - paidTotal)}
            </span>
          </div>
        )}
        {enrollment.notes && (
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Notes</span>
            <span className="text-gray-600 mt-0.5 truncate">{enrollment.notes}</span>
          </div>
        )}
      </div>

      {/* Installments table */}
      {installments.length === 0 ? (
        <div className="px-6 py-6 text-sm text-gray-400 text-center">
          No installments recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Due Date</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Paid Date</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Method</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Receipt Notes</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst, i) => (
                <tr
                  key={inst.id}
                  className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} ${
                    i === installments.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(inst.due_date)}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">
                    {inst.amount != null ? formatINR(inst.amount) : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <Badge label={inst.status || 'Pending'} map={INSTALLMENT_BADGE} />
                  </td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(inst.paid_date)}</td>
                  <td className="px-6 py-3 text-gray-600">{inst.payment_method || '—'}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {inst.receipt_notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function FeesTab({ studentProfileId }) {
  const [enrollments,         setEnrollments]         = useState([])
  const [loading,             setLoading]             = useState(true)
  const [showAddEnrollment,   setShowAddEnrollment]   = useState(false)
  const [addInstallmentForId, setAddInstallmentForId] = useState(null)

  const fetchEnrollments = useCallback(async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, installments(*)')
      .eq('student_profile_id', studentProfileId)
      .order('start_date', { ascending: false })
    if (!error) setEnrollments(data || [])
    setLoading(false)
  }, [studentProfileId])

  useEffect(() => { fetchEnrollments() }, [fetchEnrollments])

  const allInstallments = enrollments.flatMap(e => e.installments || [])
  const totalAgreed     = enrollments.reduce((s, e) => s + (e.total_fee_agreed || 0), 0)
  const totalPaid       = allInstallments.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0)
  const outstanding     = totalAgreed - totalPaid

  if (loading) {
    return <div className="py-14 text-center text-gray-400 text-sm">Loading fees…</div>
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total Agreed"  value={formatINR(totalAgreed)} />
        <SummaryCard label="Total Paid"    value={formatINR(totalPaid)}   accent="text-green-600" />
        <SummaryCard
          label="Outstanding"
          value={formatINR(outstanding)}
          accent={outstanding > 0 ? 'text-[#f97316]' : 'text-gray-900'}
        />
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Enrollments
        </h3>
        <button
          onClick={() => setShowAddEnrollment(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1742b5] text-white rounded-lg hover:bg-[#1330a0] transition-colors"
        >
          + Add Enrollment
        </button>
      </div>

      {/* Enrollment cards */}
      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No enrollments yet. Use the button above to add one.
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map(enrollment => (
            <EnrollmentCard
              key={enrollment.id}
              enrollment={enrollment}
              onAddInstallment={() => setAddInstallmentForId(enrollment.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddEnrollment && (
        <AddEnrollmentModal
          studentProfileId={studentProfileId}
          onClose={() => setShowAddEnrollment(false)}
          onSaved={() => { setShowAddEnrollment(false); fetchEnrollments() }}
        />
      )}
      {addInstallmentForId && (
        <AddInstallmentModal
          enrollmentId={addInstallmentForId}
          onClose={() => setAddInstallmentForId(null)}
          onSaved={() => { setAddInstallmentForId(null); fetchEnrollments() }}
        />
      )}
    </div>
  )
}
