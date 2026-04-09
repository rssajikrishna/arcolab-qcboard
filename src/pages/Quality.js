import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Star, Maximize2, X, Edit3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line
} from 'recharts';
import CircularTracker from '../components/CircularTracker';
import ShiftTabs from '../components/ShiftTabs';
import { dashboardMetrics as initialData } from '../dashboardData';

const API_BASE = 'http://localhost:5000/api/metrics';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const QualityPage = () => {
  const navigate = useNavigate();
  const params   = useParams();
  const user     = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const shift    = params.shift || user?.shift || '1';

  const [loading, setLoading]         = useState(true);
  const [metrics, setMetrics]         = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customDate, setCustomDate]   = useState(new Date().toISOString().split('T')[0]);
  const [selectedIssue, setSelectedIssue] = useState('Target Met');
  const [customReason, setCustomReason] = useState('');
  const [viewDate, setViewDate]       = useState(new Date());

  const viewMonth     = viewDate.getMonth();
  const viewYear      = viewDate.getFullYear();
  const viewMonthName = MONTHS[viewMonth].toUpperCase();

  const handleMonthChange = (offset) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + offset);
    setViewDate(d);
  };

  // ── Fetch from DB ──────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res    = await fetch(API_BASE);
        const dbData = await res.json();
        if (dbData?.length > 0) {
          setMetrics(initialData.map(b => dbData.find(d => d.letter === b.letter) || b));
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch_();
  }, []);

  const qData = useMemo(() => {
    const found = metrics.find(m => m.letter === 'Q') || metrics[0];
    return { ...found, issueLogs: Array.isArray(found.issueLogs) ? found.issueLogs : [] };
  }, [metrics]);

  // ── Build days for the viewed month from issueLogs ────────────
  const daysInViewMonth = useMemo(() =>
    new Date(viewYear, viewMonth + 1, 0).getDate(), [viewDate]);

  const dynamicDaysData = useMemo(() => {
    const days = Array(daysInViewMonth).fill('none');
    qData.issueLogs.forEach(log => {
      if (!log.rawDate) return;
      const d = new Date(log.rawDate);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        const idx = d.getDate() - 1;
        if (idx >= 0 && idx < days.length)
          days[idx] = log.reason === 'Target Met' ? 'success' : 'fail';
      }
    });
    return days;
  }, [qData.issueLogs, viewDate, daysInViewMonth]);

  const stats = useMemo(() => ({
    alerts:  dynamicDaysData.filter(s => s === 'fail').length,
    success: dynamicDaysData.filter(s => s === 'success').length,
    holiday: dynamicDaysData.filter(s => s === 'none').length,
  }), [dynamicDaysData]);

  // ── Annual trend for bottom charts ────────────────────────────
  const annualTrend = useMemo(() =>
    MONTHS.map((m, i) => {
      const mLogs = qData.issueLogs.filter(l => {
        const d = new Date(l.rawDate);
        return d.getMonth() === i && d.getFullYear() === viewYear;
      });
      return {
        name: m.slice(0, 3),
        fail: mLogs.filter(l => l.reason !== 'Target Met').length,
        pass: mLogs.filter(l => l.reason === 'Target Met').length,
      };
    }), [qData.issueLogs, viewYear]);

  // ── Logs for this month's table ───────────────────────────────
  const monthLogs = useMemo(() =>
    qData.issueLogs
      .filter(l => {
        if (!l.rawDate) return false;
        const d = new Date(l.rawDate);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      })
      .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)),
    [qData.issueLogs, viewDate]);

  // ── Save to DB ────────────────────────────────────────────────
  const handleUpdateStatus = async () => {
    let updatedLogs = [...qData.issueLogs];
    const [y, m, d] = customDate.split('-');
    const fullReason = customReason.trim() ? `${selectedIssue}: ${customReason}` : selectedIssue;
    const newEntry  = { date: `${d}/${m}/${y}`, rawDate: customDate, reason: fullReason };
    const idx       = updatedLogs.findIndex(l => l.rawDate === customDate);
    if (idx !== -1) updatedLogs[idx] = newEntry; else updatedLogs.push(newEntry);

    try {
      const res = await fetch(`${API_BASE}/update`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...qData, issueLogs: updatedLogs }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMetrics(prev => prev.map(m => m.letter === 'Q' ? saved : m));
        setIsModalOpen(false);
      }
    } catch (e) { alert('Sync failed. Check backend connection.'); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F0F4F8]">
      <div className="text-blue-500 font-black uppercase tracking-widest text-sm animate-pulse">Loading Quality Data...</div>
    </div>
  );

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#F0F4F8] font-sans flex flex-col">

      {/* ── Nav ── */}
      <nav className="flex justify-between items-center px-4 sm:px-6 py-4">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1 text-slate-500 font-bold text-xs uppercase hover:text-blue-600 transition-colors">
          <ChevronLeft size={20} /> Back
        </button>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95">
          Update {viewMonthName.slice(0, 3)}
        </button>
      </nav>
      <div className="px-4 sm:px-6">
        <ShiftTabs basePath="/q" currentShift={shift} />
      </div>

      {/* ── Main Grid ── */}
      <main className="flex-1 grid grid-cols-12 gap-4 sm:gap-5 px-4 sm:px-6 pb-6 lg:overflow-hidden">

        {/* ── LEFT: Sidebar ── */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col items-center">

          {/* Month nav */}
          <div className="flex items-center justify-between w-full mb-6 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <button onClick={() => handleMonthChange(-1)} className="text-blue-500 hover:scale-110 transition p-1"><ChevronLeft size={22}/></button>
            <span className="text-[12px] font-black text-blue-600 tracking-widest">{viewMonthName} {viewYear}</span>
            <button onClick={() => handleMonthChange(1)}  className="text-blue-500 hover:scale-110 transition p-1"><ChevronRight size={22}/></button>
          </div>

          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</span>
          <span className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-6">Quality</span>

          <div className="flex items-center justify-center w-full">
            <CircularTracker letter="Q" daysData={dynamicDaysData} size={240} />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full mt-6">
            <StatBox val={stats.alerts}  label="Alerts"  color="red" />
            <StatBox val={stats.success} label="Success" color="green" />
            <StatBox val={stats.holiday} label="Open"    color="slate" />
          </div>
        </div>

        {/* ── MIDDLE: Table columns ── */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-5 lg:overflow-hidden">

          {/* Alert History Table */}
          <ChartCard title={`${viewMonthName} ALERT HISTORY`}>
            <div className="overflow-y-auto flex-1 custom-scrollbar" style={{ maxHeight: 280 }}>
              <table className="w-full text-[11px] border-separate border-spacing-0">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-left font-black text-slate-500 rounded-tl-lg">Date</th>
                    <th className="p-2.5 text-left font-black text-slate-500 rounded-tr-lg">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {monthLogs.length > 0 ? monthLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold text-slate-500">{log.date}</td>
                      <td className={`p-2.5 font-black uppercase flex items-center gap-2 ${log.reason === 'Target Met' ? 'text-green-500' : 'text-red-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${log.reason === 'Target Met' ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
                        {log.reason}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="2" className="p-10 text-center text-slate-300 font-bold uppercase italic text-[10px] tracking-widest">No alerts recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* Annual Summary Table */}
          <ChartCard title={`${viewYear} PERFORMANCE SUMMARY`}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-[520px] lg:min-w-full text-[10px] border-collapse">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase sticky top-0">
                  <tr>
                    <th className="p-2.5 text-left border-b border-slate-100">Category</th>
                    {annualTrend.map(m => <th key={m.name} className="p-2.5 text-center border-b border-slate-100">{m.name}</th>)}
                  </tr>
                </thead>
                <tbody className="font-bold">
                  <tr className="border-b border-slate-50">
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">Alerts</td>
                    {annualTrend.map((m, i) => (
                      <td key={i} className={`p-2.5 text-center ${m.fail > 0 ? 'text-red-500' : 'text-slate-200'}`}>{m.fail || '--'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">Success</td>
                    {annualTrend.map((m, i) => (
                      <td key={i} className={`p-2.5 text-center ${m.pass > 0 ? 'text-green-500' : 'text-slate-200'}`}>{m.pass || '--'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* ── RIGHT: Charts ── */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col gap-5 lg:overflow-hidden">

          <ChartCard title={`${viewMonthName} DISTRIBUTION`}>
            <div className="h-[200px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Alerts',  value: stats.alerts },
                  { name: 'Success', value: stats.success },
                  { name: 'Open',    value: stats.holiday },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                    <Cell fill="#EF4444" />
                    <Cell fill="#22C55E" />
                    <Cell fill="#94A3B8" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title={`${viewYear} PERFORMANCE TREND`}>
            <div className="h-[200px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={annualTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700 }} />
                  <YAxis fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="fail" stroke="#EF4444" strokeWidth={3}
                    dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Alerts" />
                  <Line type="monotone" dataKey="pass" stroke="#22C55E" strokeWidth={3}
                    dot={{ r: 4, fill: '#22C55E', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Success" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </main>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[360px] p-6 sm:p-8 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2 text-slate-700">
                <Edit3 size={16} className="text-blue-500" /> LOG RECORD
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">Date</label>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">Status</label>
                <select value={selectedIssue} onChange={e => setSelectedIssue(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-blue-400">
                  <option value="Target Met">✅ Target Met</option>
                  <option value="Machine Breakdown">⚠️ Machine Breakdown</option>
                  <option value="No Power">⚠️ No Power</option>
                  <option value="No Manpower">⚠️ No Manpower</option>
                  <option value="Quality Reject">⚠️ Quality Reject</option>
                  <option value="Material Shortage">⚠️ Material Shortage</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">Custom Reason (Optional)</label>
                <textarea 
                  value={customReason || ''} 
                  onChange={e => setCustomReason(e.target.value)} 
                  placeholder="Enter detailed reason..."
                  rows={3}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-blue-400 resize-none"
                />
              </div>
              <button onClick={handleUpdateStatus}
                className="w-full bg-blue-600 py-4 rounded-xl font-black uppercase text-[11px] text-white tracking-widest hover:bg-blue-700 active:scale-95 transition-all mt-2">
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────
const StatBox = ({ val, label, color }) => (
  <div className={`text-center p-2 rounded-xl border bg-${color}-50 border-${color}-100`}>
    <div className={`text-lg font-black text-${color}-500`}>{val}</div>
    <div className={`text-[8px] font-bold uppercase text-${color}-400`}>{label}</div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-white">
      <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-[9px] sm:text-[10px] tracking-widest">
        <Star size={13} className="text-blue-500" /> {title}
      </div>
      <Maximize2 size={12} className="text-slate-300 hidden sm:block" />
    </div>
    <div className="p-4 flex-1 min-h-0">{children}</div>
  </div>
);

export default QualityPage;