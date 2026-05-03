import { useState, useEffect } from 'react'
import { CalendarClock, AlertCircle, Users, CreditCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const STATUS_COLORS = {
  new: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-amber-100 text-amber-700',
  enrolled: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ today: 0, overdue: 0, week: 0, pendingFees: 0 })
  const [followUps, setFollowUps] = useState([])
  const [recentEnquiries, setRecentEnquiries] = useState([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin'

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    try {
      const [
        { count: todayCount },
        { count: overdueCount },
        { count: weekCount },
        { count: feesCount },
        { data: followUpData },
        { data: recentData },
      ] = await Promise.all([
        supabase.from('enquiries')
          .select('id', { count: 'exact', head: true })
          .eq('follow_up_date', today)
          .neq('status', 'enrolled')
          .neq('status', 'lost'),

        supabase.from('enquiries')
          .select('id', { count: 'exact', head: true })
          .lt('follow_up_date', today)
          .neq('status', 'enrolled')
          .neq('status', 'lost'),

        supabase.from('enquiries')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),

        supabase.from('installments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('due_date', today),

        supabase.from('enquiries')
          .select('*')
          .lte('follow_up_date', today)
          .not('follow_up_date', 'is', null)
          .neq('status', 'enrolled')
          .neq('status', 'lost')
          .order('follow_up_date', { ascending: true })
          .limit(20),

        supabase.from('enquiries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        today: todayCount || 0,
        overdue: overdueCount || 0,
        week: weekCount || 0,
        pendingFees: feesCount || 0,
      })
      setFollowUps(followUpData || [])
      setRecentEnquiries(recentData || [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  function daysOverdueLabel(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.floor((now - date) / 86400000)
    if (diff <= 0) return 'Today'
    if (diff === 1) return '1 day overdue'
    return `${diff} days overdue`
  }

  const STAT_CARDS = [
    {
      label: 'Follow-ups today',
      value: stats.today,
      icon: CalendarClock,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueBg: stats.today > 0 ? 'text-[#1742b5]' : 'text-gray-900',
    },
    {
      label: 'Overdue follow-ups',
      value: stats.overdue,
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      valueBg: stats.overdue > 0 ? 'text-red-600' : 'text-gray-900',
    },
    {
      label: 'New enquiries (7 days)',
      value: stats.week,
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueBg: 'text-gray-900',
    },
    {
      label: 'Pending fee installments',
      value: stats.pendingFees,
      icon: CreditCard,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      valueBg: stats.pendingFees > 0 ? 'text-orange-600' : 'text-gray-900',
    },
  ]

  return (
    <div className="p-6 max-w-6xl">
      {/* Greeting */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, iconBg, iconColor, valueBg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`text-3xl font-bold mt-1.5 ${loading ? 'text-gray-300' : valueBg}`}>
                  {loading ? '—' : value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon size={19} className={iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-5 gap-5">
        {/* Follow-ups list */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Follow-ups Due</h2>
            <p className="text-xs text-gray-400 mt-0.5">Today and overdue active leads</p>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : followUps.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-gray-400 text-sm">No follow-ups due</p>
              <p className="text-gray-300 text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {followUps.map(lead => {
                const label = daysOverdueLabel(lead.follow_up_date)
                const isOverdue = label !== 'Today'
                return (
                  <div key={lead.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{lead.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {lead.phone}
                        {lead.source ? ` · ${lead.source}` : ''}
                        {lead.course_interested ? ` · ${lead.course_interested}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                      isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#1742b5]'
                    }`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent enquiries */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Enquiries</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 5 leads added</p>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : recentEnquiries.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No enquiries yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentEnquiries.map(lead => (
                <div key={lead.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                  {lead.course_interested && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{lead.course_interested}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                      {lead.status}
                    </span>
                    <span className="text-xs text-gray-300">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
