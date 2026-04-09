import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Save,
  Lock, CheckCircle2, ShieldAlert, Package, Wrench, Clock, ClipboardCheck,
} from 'lucide-react';
import axios from 'axios';

// ── Helpers ────────────────────────────────────────────────────────────────────
const perfColor = (p) => {
  if (p == null) return null;
  return p >= 90 ? 'green' : 'red';
};
const minorStatus = (value, threshold, zeroIsGreen) => {
  if (value == null) return null;
  if (zeroIsGreen) return value === 0 ? 'green' : 'red';
  return value <= threshold ? 'green' : 'red';
};

const emptyDay = (i) => ({
  date: i + 1,
  planned: null, actual: null, performance: null,
  equipmentBreakdown: null, delayedPBRMinutes: null, delayedPMQCMinutes: null,
  isHoliday: false,
});

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Component ──────────────────────────────────────────────────────────────────
const Delivery = ({ shift }) => {
  const navigate = useNavigate();

  const user           = JSON.parse(localStorage.getItem('userInfo')) || { role: 'supervisor' };
  const isSuperAdmin   = user.role === 'superadmin';
  const isSupervisor   = user.role === 'supervisor';
  const userDept       = user?.department?.toUpperCase() || '';
  const isDeliverySup  = isSupervisor && (userDept.includes('DELIVERY') || userDept === 'D');
  const canUpdate      = isDeliverySup || isSuperAdmin;

  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const currentMonthName = months[currentMonthIndex];

  const [allMonthsData, setAllMonthsData] = useState(() => {
    const init = {};
    months.forEach(m => { init[m] = Array.from({ length: 31 }, (_, i) => emptyDay(i)); });
    return init;
  });

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedDay, setSelectedDay]   = useState(null);
  const [activeTab, setActiveTab]       = useState('major'); // 'major' | 'minor'

  const [form, setForm] = useState({
    planned: '', actual: '',
    equipmentBreakdown: '', delayedPBRMinutes: '', delayedPMQCMinutes: '',
    isHoliday: false,
  });

  const showNotify = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  // ── Fetch month data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/delivery', {
          params: { month: currentMonthName, year: 2026, dept: 'DELIVERY', shift: shift || '1' },
        });
        if (data?.days?.length > 0) {
          setAllMonthsData(prev => ({ ...prev, [currentMonthName]: data.days }));
        } else {
          setAllMonthsData(prev => ({
            ...prev,
            [currentMonthName]: Array.from({ length: 31 }, (_, i) => emptyDay(i)),
          }));
        }
      } catch {
        setAllMonthsData(prev => ({
          ...prev,
          [currentMonthName]: Array.from({ length: 31 }, (_, i) => emptyDay(i)),
        }));
      }
    };
    fetchData();
  }, [currentMonthName, shift]);

  // ── Live performance preview ─────────────────────────────────────────────────
  const livePerf = (() => {
    const p = parseFloat(form.planned);
    const a = parseFloat(form.actual);
    if (p > 0 && !isNaN(a)) return Math.round((a / p) * 1000) / 10;
    return null;
  })();

  // ── Open modal ───────────────────────────────────────────────────────────────
  const openModal = (day) => {
    if (!canUpdate) { showNotify('Access Denied: You are not the Delivery Supervisor', 'error'); return; }
    if (day.performance != null && !isSuperAdmin) {
      showNotify('Security Lock: Only Super Admin can modify saved entries', 'error'); return;
    }
    setSelectedDay(day);
    setForm({
      planned:            day.planned            ?? '',
      actual:             day.actual             ?? '',
      equipmentBreakdown: day.equipmentBreakdown ?? '',
      delayedPBRMinutes:  day.delayedPBRMinutes  ?? '',
      delayedPMQCMinutes: day.delayedPMQCMinutes ?? '',
      isHoliday:          day.isHoliday          || false,
    });
    setActiveTab('major');
    setIsModalOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canUpdate) return;
    const payload = {
      month: currentMonthName, year: 2026, dept: 'DELIVERY', shift: shift || '1',
      date: selectedDay.date,
      planned:            form.planned            !== '' ? Number(form.planned)            : null,
      actual:             form.actual             !== '' ? Number(form.actual)             : null,
      equipmentBreakdown: form.equipmentBreakdown !== '' ? Number(form.equipmentBreakdown) : null,
      delayedPBRMinutes:  form.delayedPBRMinutes  !== '' ? Number(form.delayedPBRMinutes)  : null,
      delayedPMQCMinutes: form.delayedPMQCMinutes !== '' ? Number(form.delayedPMQCMinutes) : null,
      isHoliday: form.isHoliday,
    };
    try {
      const { data } = await axios.post('http://localhost:5000/api/delivery/update', payload);
      const updated = allMonthsData[currentMonthName].map(d =>
        d.date === selectedDay.date
          ? data.record.days.find(r => r.date === selectedDay.date) || d
          : d
      );
      setAllMonthsData(prev => ({ ...prev, [currentMonthName]: updated }));
      setIsModalOpen(false);
      showNotify('Entry Saved Successfully', 'success');
    } catch (err) {
      showNotify(err.response?.data?.message || 'System Error: Unable to Save', 'error');
    }
  };

  // ── Day card color ───────────────────────────────────────────────────────────
  const cardStyle = (day) => {
    if (day.isHoliday) return 'bg-slate-800 text-white shadow-lg shadow-slate-300 border-transparent';
    if (day.performance != null) {
      return day.performance >= 90
        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-transparent'
        : 'bg-rose-500 text-white shadow-lg shadow-rose-200 border-transparent';
    }
    return 'bg-white border-slate-100 text-slate-400';
  };

  const isLocked = (day) => (day.performance != null && !isSuperAdmin) || !canUpdate;

  // ── Minor metric dot ─────────────────────────────────────────────────────────
  const MinorDot = ({ ok }) => (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-300' : 'bg-rose-300'}`} />
  );

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900">

      {/* NOTIFICATION */}
      {notification.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-8 duration-500">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl border-t border-white/10 min-w-[320px] ${
            notification.type === 'error'
              ? 'bg-slate-900/95 border-rose-500/50 text-rose-400'
              : 'bg-slate-900/95 border-emerald-500/50 text-emerald-400'
          }`}>
            <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
              {notification.type === 'error' ? <ShieldAlert size={24} /> : <CheckCircle2 size={24} />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">Delivery System</p>
              <p className="font-bold tracking-tight text-sm text-white">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* BACK */}
      <div className="mb-4">
        <button
          onClick={() => navigate(shift ? `/shift${shift}` : '/')}
          className="flex items-center gap-1 text-[#475569] font-bold text-xs uppercase hover:text-emerald-600 transition-all"
        >
          <ChevronLeft size={20} /> BACK TO DASHBOARD
        </button>
      </div>

      {/* HEADER */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Delivery</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2 w-2 rounded-full animate-pulse ${canUpdate ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">
              {isSuperAdmin ? 'Administrative Master' : isDeliverySup ? 'Supervisor Entry' : 'View Only Mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1.5 transition-all hover:shadow-2xl">
          <button
            onClick={() => setCurrentMonthIndex(p => (p === 0 ? 11 : p - 1))}
            className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
          ><ChevronLeft size={20} /></button>
          <span className="px-10 font-black uppercase tracking-widest text-xs w-44 text-center">{currentMonthName}</span>
          <button
            onClick={() => setCurrentMonthIndex(p => (p === 11 ? 0 : p + 1))}
            className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
          ><ChevronRight size={20} /></button>
        </div>
      </header>

      {/* Shift Header */}
      {shift && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Delivery — Shift {shift}
            </h2>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">
              Arcolab Continuous Improvement System
            </p>
          </div>
        </div>
      )}

      {/* LEGEND */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { color: 'bg-emerald-500', label: 'Performance ≥ 90%' },
          { color: 'bg-rose-500',    label: 'Performance < 90%' },
          { color: 'bg-slate-800',   label: 'Holiday' },
          { color: 'bg-white border border-slate-200', label: 'No data' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* DAY GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
        {allMonthsData[currentMonthName].map((day) => {
          const locked = isLocked(day);
          const hasMinor = day.equipmentBreakdown != null || day.delayedPBRMinutes != null || day.delayedPMQCMinutes != null;

          return (
            <div
              key={day.date}
              onClick={() => openModal(day)}
              className={`group relative cursor-pointer rounded-[2rem] h-36 p-5 transition-all duration-300 border-2 hover:scale-[1.03] flex flex-col justify-between ${cardStyle(day)} ${locked ? 'opacity-80' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-black text-2xl tracking-tighter">{day.date}</span>
                {locked
                  ? <Lock size={16} className="opacity-40" />
                  : <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                }
              </div>

              <div className="overflow-hidden">
                {day.isHoliday ? (
                  <p className="text-[10px] font-black uppercase tracking-wide">Holiday</p>
                ) : day.performance != null ? (
                  <div className="space-y-0.5">
                    <p className="text-lg font-black leading-none">{day.performance}%</p>
                    <p className="text-[9px] font-bold opacity-70 uppercase tracking-wide">
                      {day.actual}/{day.planned} dispensed
                    </p>
                    {hasMinor && (
                      <div className="flex gap-1 mt-1">
                        {day.equipmentBreakdown != null && (
                          <MinorDot ok={day.equipmentBreakdown === 0} />
                        )}
                        {day.delayedPBRMinutes != null && (
                          <MinorDot ok={day.delayedPBRMinutes <= 30} />
                        )}
                        {day.delayedPMQCMinutes != null && (
                          <MinorDot ok={day.delayedPMQCMinutes <= 30} />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-1 w-8 bg-slate-100 rounded-full group-hover:w-12 transition-all" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {isModalOpen && canUpdate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.25)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300">

            {/* Modal header */}
            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <h2 className="font-black uppercase tracking-widest text-xs text-slate-400">Data Entry</h2>
                <p className="text-2xl font-black text-slate-900">{selectedDay?.date} {currentMonthName}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-12 w-12 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
              ><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6">
              {/* Holiday toggle */}
              <button
                onClick={() => setForm(f => ({ ...f, isHoliday: !f.isHoliday }))}
                className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                  form.isHoliday
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {form.isHoliday ? 'Mark as Holiday (tap to undo)' : 'Mark as Holiday / Non-Working Day'}
              </button>

              {!form.isHoliday && (
                <>
                  {/* Tab switcher */}
                  <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                    {[
                      { key: 'major', icon: <Package size={14} />, label: 'Major' },
                      { key: 'minor', icon: <Wrench size={14} />, label: 'Minor' },
                    ].map(({ key, icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          activeTab === key
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {icon}{label}
                      </button>
                    ))}
                  </div>

                  {/* ── MAJOR TAB ── */}
                  {activeTab === 'major' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                      <div className="relative">
                        <input
                          type="number" min="0" placeholder="0"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                          value={form.planned}
                          onChange={e => setForm(f => ({ ...f, planned: e.target.value }))}
                        />
                        <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Materials Planned
                        </label>
                      </div>

                      <div className="relative">
                        <input
                          type="number" min="0" placeholder="0"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                          value={form.actual}
                          onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                        />
                        <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Materials Actually Dispensed
                        </label>
                      </div>

                      {/* Live performance preview */}
                      {livePerf != null && (
                        <div className={`rounded-2xl p-5 text-center transition-all ${
                          livePerf >= 90 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-rose-50 border-2 border-rose-200'
                        }`}>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Performance</p>
                          <p className={`text-4xl font-black ${livePerf >= 90 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {livePerf}%
                          </p>
                          <p className={`text-[10px] font-bold mt-1 uppercase tracking-wide ${livePerf >= 90 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {livePerf >= 90 ? 'Target Met' : 'Below Target'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── MINOR TAB ── */}
                  {activeTab === 'minor' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                      {/* Equipment Breakdown */}
                      <div className="relative">
                        <input
                          type="number" min="0" placeholder="0"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                          value={form.equipmentBreakdown}
                          onChange={e => setForm(f => ({ ...f, equipmentBreakdown: e.target.value }))}
                        />
                        <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-1">
                          <Wrench size={10} /> No. of Equipment Breakdowns
                        </label>
                        {form.equipmentBreakdown !== '' && (
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wide ${
                            Number(form.equipmentBreakdown) === 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {Number(form.equipmentBreakdown) === 0 ? 'OK' : 'Alert'}
                          </span>
                        )}
                      </div>

                      {/* Delayed PBR Indent */}
                      <div className="relative">
                        <input
                          type="number" min="0" placeholder="0"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                          value={form.delayedPBRMinutes}
                          onChange={e => setForm(f => ({ ...f, delayedPBRMinutes: e.target.value }))}
                        />
                        <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-1">
                          <Clock size={10} /> Delayed PBR Indent (mins deviated)
                        </label>
                        {form.delayedPBRMinutes !== '' && (
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wide ${
                            Number(form.delayedPBRMinutes) <= 30 ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {Number(form.delayedPBRMinutes) <= 30 ? '≤30 min' : '>30 min'}
                          </span>
                        )}
                      </div>

                      {/* Delayed PM/QC Approval */}
                      <div className="relative">
                        <input
                          type="number" min="0" placeholder="0"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                          value={form.delayedPMQCMinutes}
                          onChange={e => setForm(f => ({ ...f, delayedPMQCMinutes: e.target.value }))}
                        />
                        <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-1">
                          <ClipboardCheck size={10} /> Delayed PM/QC Approval (mins deviated)
                        </label>
                        {form.delayedPMQCMinutes !== '' && (
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wide ${
                            Number(form.delayedPMQCMinutes) <= 30 ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {Number(form.delayedPMQCMinutes) <= 30 ? '≤30 min' : '>30 min'}
                          </span>
                        )}
                      </div>

                      {/* Minor status summary */}
                      {(form.equipmentBreakdown !== '' || form.delayedPBRMinutes !== '' || form.delayedPMQCMinutes !== '') && (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: 'Equip.',
                              val: form.equipmentBreakdown,
                              ok: form.equipmentBreakdown !== '' && Number(form.equipmentBreakdown) === 0,
                              filled: form.equipmentBreakdown !== '',
                            },
                            {
                              label: 'PBR',
                              val: form.delayedPBRMinutes,
                              ok: form.delayedPBRMinutes !== '' && Number(form.delayedPBRMinutes) <= 30,
                              filled: form.delayedPBRMinutes !== '',
                            },
                            {
                              label: 'PM/QC',
                              val: form.delayedPMQCMinutes,
                              ok: form.delayedPMQCMinutes !== '' && Number(form.delayedPMQCMinutes) <= 30,
                              filled: form.delayedPMQCMinutes !== '',
                            },
                          ].map(({ label, ok, filled }) => (
                            <div key={label} className={`rounded-xl p-3 text-center text-[9px] font-black uppercase tracking-widest transition-all ${
                              !filled ? 'bg-slate-50 text-slate-300' :
                              ok ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                   'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                                !filled ? 'bg-slate-200' : ok ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                              {label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 hover:bg-black hover:-translate-y-1 shadow-2xl shadow-slate-300"
              >
                <Save size={16} /> Secure Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;
