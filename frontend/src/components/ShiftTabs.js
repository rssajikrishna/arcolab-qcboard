import React from 'react';
import { useNavigate } from 'react-router-dom';

const ShiftTabs = ({ basePath, currentShift }) => {
  const navigate = useNavigate();
  const shifts = ['1', '2', '3'];

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {shifts.map((shift) => (
        <button
          key={shift}
          type="button"
          onClick={() => navigate(`${basePath}/${shift}`)}
          className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${currentShift === shift
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Shift {shift}
        </button>
      ))}
    </div>
  );
};

export default ShiftTabs;
