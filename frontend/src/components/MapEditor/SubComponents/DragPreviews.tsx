import React from 'react';

export const DragPreviews: React.FC = () => {
  return (
    <div style={{ position: 'fixed', top: '-1000px', left: '-1000px', pointerEvents: 'none', zIndex: -9999 }}>
      <div id="drag-preview-floor_base" className="w-[120px] h-[80px] bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center text-[10px] text-blue-400 font-bold">Nền tầng</div>
      <div id="drag-preview-floor_base-pen" className="w-[120px] h-[80px] bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center text-[10px] text-blue-400 font-bold">Vẽ Nền</div>
      <div id="drag-preview-exit" className="w-[80px] h-[40px] bg-[#22c55e] border border-[#10b981] rounded-lg flex items-center justify-center text-xs text-white font-bold">EXIT</div>
      
      <div id="drag-preview-stairs" className="w-[80px] h-[80px] bg-[#cbd5e1] border border-[#475569] rounded-lg flex items-center justify-center relative overflow-hidden">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <rect x="0.75" y="0.75" width="78.5" height="78.5" rx="8" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5"/>
          <line x1="0" y1="12" x2="80" y2="12" stroke="#475569" strokeWidth="1.5"/>
          <line x1="24" y1="12" x2="24" y2="80" stroke="#475569" strokeWidth="1.5"/>
          <line x1="28" y1="12" x2="28" y2="80" stroke="#475569" strokeWidth="1.5"/>
          <line x1="52" y1="12" x2="52" y2="80" stroke="#475569" strokeWidth="1.5"/>
          <line x1="56" y1="12" x2="56" y2="80" stroke="#475569" strokeWidth="1.5"/>
          <line x1="0" y1="20" x2="24" y2="20" stroke="#475569" strokeWidth="1"/>
          <line x1="28" y1="20" x2="52" y2="20" stroke="#475569" strokeWidth="1"/>
          <line x1="56" y1="20" x2="80" y2="20" stroke="#475569" strokeWidth="1"/>
          <line x1="0" y1="28" x2="24" y2="28" stroke="#475569" strokeWidth="1"/>
          <line x1="28" y1="28" x2="52" y2="28" stroke="#475569" strokeWidth="1"/>
          <line x1="56" y1="28" x2="80" y2="28" stroke="#475569" stroke-width="1"/>
          <line x1="0" y1="36" x2="24" y2="36" stroke="#475569" strokeWidth="1"/>
          <line x1="28" y1="36" x2="52" y2="36" stroke="#475569" stroke-width="1"/>
          <line x1="56" y1="36" x2="80" y2="36" stroke="#475569" stroke-width="1"/>
          <line x1="0" y1="44" x2="24" y2="44" stroke="#475569" strokeWidth="1"/>
          <line x1="28" y1="44" x2="52" y2="44" stroke="#475569" stroke-width="1"/>
          <line x1="56" y1="44" x2="80" y2="44" stroke="#475569" stroke-width="1"/>
          <line x1="0" y1="52" x2="24" y2="52" stroke="#475569" stroke-width="1"/>
          <line x1="28" y1="52" x2="52" y2="52" stroke="#475569" stroke-width="1"/>
          <line x1="56" y1="52" x2="80" y2="52" stroke="#475569" stroke-width="1"/>
          <line x1="0" y1="60" x2="24" y2="60" stroke="#475569" stroke-width="1"/>
          <line x1="28" y1="60" x2="52" y2="60" stroke="#475569" stroke-width="1"/>
          <line x1="56" y1="60" x2="80" y2="60" stroke="#475569" stroke-width="1"/>
          <line x1="0" y1="68" x2="24" y2="68" stroke="#475569" stroke-width="1"/>
          <line x1="28" y1="68" x2="52" y2="68" stroke="#475569" stroke-width="1"/>
          <line x1="56" y1="68" x2="80" y2="68" stroke="#475569" stroke-width="1"/>
          <line x1="0" y1="76" x2="24" y2="76" stroke="#475569" stroke-width="1"/>
          <line x1="28" y1="76" x2="52" y2="76" stroke="#475569" stroke-width="1"/>
          <line x1="56" y1="76" x2="80" y2="76" stroke="#475569" stroke-width="1"/>
          <circle cx="12" cy="74" r="2.5" fill="#475569"/>
          <circle cx="68" cy="74" r="2.5" fill="#475569"/>
          <path d="M 12 74 L 12 6 L 40 6 L 40 68" fill="none" stroke="#475569" strokeWidth="1.2"/>
          <path d="M 68 74 L 68 6 L 40 6" fill="none" stroke="#475569" strokeWidth="1.2"/>
          <path d="M 36.5 62 L 40 68 L 43.5 62" fill="none" stroke="#475569" strokeWidth="1.5"/>
        </svg>
      </div>

      <div id="drag-preview-elevator" className="w-[80px] h-[80px] bg-[#e9f179] border border-[#cbd5e1] rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1 bottom-1 left-1/2 w-[1.5px] bg-[#475569] -translate-x-1/2" />
        <span className="text-[11px] font-bold text-[#003870] z-10 bg-[#e9f179] px-1 rounded select-none">Thang máy</span>
      </div>

      <div id="drag-preview-sensor" className="w-[100px] h-[80px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[#eef2ff] border-2 border-[#818cf8] flex items-center justify-center text-lg shadow-sm">📡</div>
        <span className="text-[10px] font-bold text-slate-800 bg-white/80 px-1.5 py-0.5 rounded mt-1 shadow-sm">Cảm biến</span>
      </div>

      <div id="drag-preview-led_wire-pen" className="w-[100px] h-[30px] flex items-center justify-center">
        <div className="w-full h-1 border-t-2 border-dashed border-[#818cf8]" />
        <span className="absolute text-[8px] font-bold text-[#818cf8] bg-slate-900 px-1 rounded">LED WIRE</span>
      </div>

      <div id="drag-preview-wall-pen" className="w-[100px] h-[30px] flex items-center justify-center">
        <div className="w-full h-2 bg-[#64748b] rounded" />
        <span className="absolute text-[8px] font-bold text-white bg-slate-900 px-1 rounded">WALL</span>
      </div>

      <div id="drag-preview-label" className="w-[80px] h-[30px] bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700">Nhãn chữ</div>
    </div>
  );
};

export default DragPreviews;
