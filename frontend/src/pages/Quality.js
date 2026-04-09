import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ChevronLeft, ChevronRight, Star, Maximize2,
  Download, Edit3, X, AlertTriangle, CheckCircle, User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line
} from 'recharts';
import CircularTracker from '../components/CircularTracker';
import { dashboardMetrics as initialData } from '../dashboardData';

const API_BASE_URL = 'http://localhost:5000/api/metrics';

const DEVIATION_OPTIONS = [
  { value: 'none',        label: 'No Deviation',   color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  { value: 'human_error', label: 'Human Error',     color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500' },
  { value: 'procedural',  label: 'Procedural',      color: 'text-orange-600',  bg: 'bg-orange-50',  dot: 'bg-orange-500' },
];

const DeviationBadge = ({ type }) => {
  const opt = DEVIATION_OPTIONS.find(o => o.value === type) || DEVIATION_OPTIONS[0];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${opt.bg} ${opt.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
      {opt.label}
    </span>
  );
};

const QualityPage = ({ shift }) => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const user           = JSON.parse(localStorage.getItem('userInfo'));
  const isSupervisor   = user?.role === 'supervisor';
  // Support both old ("Q", "QUALITY (Q)") and new ("QC & Microbiology & AD Lab") dept names
  const userDepts      = (user?.department || 'NONE').split(',').map(d => d.trim().toUpperCase());
  const isQualitySupervisor = isSupervisor && userDepts.some(d =>
    d.includes('QUALITY') || d === 'Q' || d.includes('QC')
  );
  const canUpdate = isQualitySupervisor;

  const [loading, setLoading]         = useState(true);
  const [metrics, setMetrics]         = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('Target Met');
  const [deviationType, setDeviationType] = useState('none');
  const [modalEmpId, setModalEmpId]   = useState(user?.employeeId || '');
  const [viewDate, setViewDate]       = useState(new Date());
  const [customDate, setCustomDate]   = useState(new Date().toISOString().split('T')[0]);

  const viewMonthName = viewDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const viewYear      = viewDate.getFullYear();

  const downloadPDF = async () => {
    const element = reportRef.current;
    const canvas  = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#F0F4F8' });
    const imgData = canvas.toDataURL('image/png');
    const pdf     = new jsPDF('l', 'mm', 'a4');
    const pdfWidth  = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Quality_Report_${viewMonthName}_${viewYear}.pdf`);
  };

  const handleMonthChange = (offset) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const url = `${API_BASE_URL}?shift=${shift || '1'}`;
        const response = await fetch(url);
        const dbData = await response.json();
        if (dbData?.length > 0) {
          const merged = initialData.map(blueprint => {
            const live = dbData.find(d => d.letter === blueprint.letter);
            return live ? { ...blueprint, ...live } : blueprint;
          });
          setMetrics(merged);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [shift]);

  const qData = useMemo(() => metrics.find(m => m.letter === 'Q') || initialData[0], [metrics]);
  const daysInViewMonth = useMemo(() => new Date(viewYear, viewDate.getMonth() + 1, 0).getDate(), [viewDate, viewYear]);

  const dynamicDaysData = useMemo(() => {
    const baseDays = Array(daysInViewMonth).fill('none');
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    logs.forEach(log => {
      const d = new Date(log.rawDate);
      if (d.getUTCMonth() === viewDate.getMonth() && d.getUTCFullYear() === viewYear) {
        const idx = d.getUTCDate() - 1;
        if (idx >= 0 && idx < baseDays.length) {
          baseDays[idx] = log.reason === 'Target Met' ? 'success' : 'fail';
        }
      }
    });
    return baseDays;
  }, [qData.issueLogs, viewDate, viewYear, daysInViewMonth]);

  const stats = useMemo(() => ({
    alerts:  dynamicDaysData.filter(s => s === 'fail').length,
    success: dynamicDaysData.filter(s => s === 'success').length,
    holiday: dynamicDaysData.filter(s => s === 'none').length
  }), [dynamicDaysData]);

  const annualTrend = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    return months.map((m, i) => {
      const mLogs = logs.filter(l => {
        const d = new Date(l.rawDate);
        return d.getUTCMonth() === i && d.getUTCFullYear() === viewYear;
      });
      return {
        name: m,
        fail: mLogs.filter(l => l.reason !== 'Target Met').length,
        pass: mLogs.filter(l => l.reason === 'Target Met').length
      };
    });
  }, [qData.issueLogs, viewYear]);

  // Logs for current month view (all entries, not just alerts)
  const currentMonthLogs = useMemo(() => {
    const logs = Array.isArray(qData.issueLogs) ? qData.issueLogs : [];
    return logs
      .filter(l => {
        const d = new Date(l.rawDate);
        return d.getUTCMonth() === viewDate.getMonth() && d.getUTCFullYear() === viewYear;
      })
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
  }, [qData.issueLogs, viewDate, viewYear]);

  const openModal = () => {
    setSelectedIssue('Target Met');
    setDeviationType('none');
    setModalEmpId(user?.employeeId || '');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!canUpdate) return;
    let updatedLogs = Array.isArray(qData.issueLogs) ? [...qData.issueLogs] : [];
    const [y, m, d] = customDate.split('-');
    const newEntry = {
      date: `${d}/${m}/${y}`,
      rawDate: customDate,
      reason: selectedIssue,
      empId: modalEmpId.trim(),
      deviationType: selectedIssue === 'Target Met' ? 'none' : deviationType,
      timestamp: new Date().toISOString(),
    };
    const idx = updatedLogs.findIndex(log => log.rawDate === customDate);
    if (idx !== -1) updatedLogs[idx] = newEntry; else updatedLogs.push(newEntry);

    try {
      const res = await fetch(`${API_BASE_URL}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...qData, shift: shift || '1', issueLogs: updatedLogs })
      });
      if (res.ok) {
        const saved = await res.json();
        setMetrics(prev => prev.map(m => m.letter === 'Q' ? saved : m));
        setIsModalOpen(false);
      }
    } catch (e) { alert('Sync failed'); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-emerald-600 font-bold uppercase tracking-widest">Syncing Arcolab Data...</div>;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#F0F4F8] text-[#334155] font-sans flex flex-col relative">

      <nav className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-4 bg-[#F0F4F8] gap-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-[#475569] font-bold text-xs uppercase self-start sm:self-center hover:text-emerald-600 transition-colors">
          <ChevronLeft size={20} /> BACK TO DASHBOARD
        </button>
        {canUpdate && (
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            UPDATE {viewMonthName.split(' ')[0]} LOGS
          </button>
        )}
      </nav>

      {shift && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quality — Shift {shift}</h1>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Arcolab Continuous Improvement System</p>
          </div>
        </div>
      )}

      <main ref={reportRef} className="flex-1 grid grid-cols-12 gap-4 sm:gap-5 px-4 sm:px-6 pb-6 lg:overflow-hidden bg-[#F0F4F8]">

        {/* Left panel */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-8 bg-[#F8FAFC] px-4 py-2 rounded-full border border-slate-100">
            <button onClick={() => handleMonthChange(-1)} className="text-emerald-500 hover:scale-110 transition p-1"><ChevronLeft size={24} /></button>
            <span className="text-[12px] sm:text-[13px] font-black text-emerald-600 tracking-widest text-center">{viewMonthName} {viewYear}</span>
            <button onClick={() => handleMonthChange(1)} className="text-emerald-500 hover:scale-110 transition p-1"><ChevronRight size={24} /></button>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Department</span>
          <span className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{qData.name}</span>

          <div className="flex-1 flex items-center justify-center min-h-[250px] w-full max-w-[300px] relative">
            <CircularTracker letter={qData.letter} daysData={dynamicDaysData} size={window.innerWidth < 640 ? 220 : 280} />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full mt-6">
            <StatBox val={stats.alerts}  label="Alerts"  type="red" />
            <StatBox val={stats.success} label="Success" type="green" />
            <StatBox val={stats.holiday} label="Holiday" type="slate" />
          </div>
        </div>

        {/* Middle panel */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-5 lg:overflow-hidden">
          <ChartCard title={`${viewMonthName} LOG HISTORY`}>
            <div className="overflow-auto custom-scrollbar max-h-[320px] min-h-[200px]">
              <table className="w-full text-[11px] border-separate border-spacing-0 min-w-[520px]">
                <thead className="bg-[#E2E8F0] sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-2.5 text-left font-black text-[#64748B] rounded-tl-xl whitespace-nowrap">Date</th>
                    <th className="p-2.5 text-left font-black text-[#64748B] whitespace-nowrap">Updated</th>
                    <th className="p-2.5 text-left font-black text-[#64748B] whitespace-nowrap">Emp ID</th>
                    <th className="p-2.5 text-left font-black text-[#64748B] whitespace-nowrap">Reason</th>
                    <th className="p-2.5 text-left font-black text-[#64748B] rounded-tr-xl whitespace-nowrap">Deviation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMonthLogs.length > 0 ? (
                    currentMonthLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold text-slate-600 whitespace-nowrap">{log.date}</td>
                        <td className="p-2.5 text-slate-400 whitespace-nowrap text-[9px]">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                            : '—'}
                        </td>
                        <td className="p-2.5 font-bold text-slate-500 whitespace-nowrap">
                          {log.empId || <span className="text-slate-200">—</span>}
                        </td>
                        <td className={`p-2.5 font-black uppercase tracking-tight whitespace-nowrap ${log.reason === 'Target Met' ? 'text-emerald-500' : 'text-red-500'}`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${log.reason === 'Target Met' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                            {log.reason}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <DeviationBadge type={log.deviationType || 'none'} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-300 font-bold uppercase italic tracking-widest">No records for this month</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title={`${viewYear} PERFORMANCE SUMMARY`}>
            <div className="overflow-x-auto h-full custom-scrollbar">
              <table className="min-w-[600px] lg:min-w-full text-left text-[10px] border-collapse">
                <thead className="bg-[#F1F5F9] text-[#64748B] font-black uppercase sticky top-0">
                  <tr>
                    <th className="p-3 border-b">Category</th>
                    {annualTrend.map(m => <th key={m.name} className="p-3 text-center border-b">{m.name}</th>)}
                  </tr>
                </thead>
                <tbody className="font-bold">
                  <tr className="border-b">
                    <td className="p-3 whitespace-nowrap text-slate-500">Alerts</td>
                    {annualTrend.map((m, i) => <td key={i} className={`p-3 text-center ${m.fail > 0 ? 'text-red-500' : 'text-slate-200'}`}>{m.fail || '--'}</td>)}
                  </tr>
                  <tr>
                    <td className="p-3 whitespace-nowrap text-slate-500">Success</td>
                    {annualTrend.map((m, i) => <td key={i} className={`p-3 text-center ${m.pass > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{m.pass || '--'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* Right panel */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col gap-5 lg:overflow-hidden">
          <ChartCard title={`${viewMonthName} DISTRIBUTION`}>
            <div className="h-[200px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Alerts',  value: stats.alerts },
                  { name: 'Success', value: stats.success },
                  { name: 'Holiday', value: stats.holiday }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="value" radius={[4,4,0,0]} barSize={50}>
                    <Cell fill="#EF4444" /><Cell fill="#10b981" /><Cell fill="#94A3B8" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title={`${viewYear} PERFORMANCE TREND`}>
            <div className="h-[200px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={annualTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="fail" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} name="Alerts" />
                  <Line type="monotone" dataKey="pass" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Success" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </main>

      <button
        onClick={downloadPDF}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-[90]"
      >
        <Download size={24} />
      </button>

      {/* MODAL */}
      {isModalOpen && canUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] p-6 sm:p-8 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2 text-slate-800">
                <Edit3 size={16} className="text-emerald-500" /> LOG RECORD
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                <input
                  type="date" value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-emerald-500"
                />
              </div>

              {/* Emp ID */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <User size={10} /> Employee ID
                </label>
                <input
                  type="text" placeholder="e.g. ARC-0042"
                  value={modalEmpId}
                  onChange={e => setModalEmpId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-emerald-500 font-bold uppercase"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status / Reason</label>
                <select
                  value={selectedIssue}
                  onChange={e => { setSelectedIssue(e.target.value); if (e.target.value === 'Target Met') setDeviationType('none'); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-emerald-500"
                >
                  <option value="Target Met">✅ Target Met</option>
                  <option value="Machine Breakdown">⚠️ Machine Breakdown</option>
                  <option value="No Power">⚠️ No Power</option>
                  <option value="No Manpower">⚠️ No Manpower</option>
                  <option value="Quality Reject">⚠️ Quality Reject</option>
                </select>
              </div>

              {/* Deviation type — only shown for non-target-met */}
              {selectedIssue !== 'Target Met' && (
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Minor Metric — Deviation Type
                  </label>
                  <div className="flex gap-2">
                    {DEVIATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDeviationType(opt.value)}
                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide border-2 transition-all ${
                          deviationType === opt.value
                            ? `${opt.bg} ${opt.color} border-current`
                            : 'border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleUpdateStatus}
                className="w-full bg-emerald-600 py-3 sm:py-4 rounded-xl font-black uppercase text-[11px] text-white tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
              >
                UPDATE DATA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const StatBox = ({ val, label, type }) => {
  const colors = {
    red:   'bg-red-50 border-red-100 text-red-500',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-500',
    slate: 'bg-slate-50 border-slate-100 text-slate-500'
  };
  return (
    <div className={`text-center p-2 rounded-xl border ${colors[type]}`}>
      <div className="text-lg font-black">{val}</div>
      <div className="text-[8px] font-bold uppercase opacity-70">{label}</div>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2 text-[#64748B] font-black uppercase text-[10px] tracking-widest">
        <Star size={14} className="text-emerald-500" /> {title}
      </div>
      <Maximize2 size={12} className="text-slate-300 hidden sm:block" />
    </div>
    <div className="p-4 flex-1 min-h-0">{children}</div>
  </div>
);

export default QualityPage;
