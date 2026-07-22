import React, { useRef } from 'react';
import clsx from 'clsx';
import {
  RectangleHorizontal,
  PenTool,
  LogOut,
  TrendingUp,
  ArrowUpDown,
  Cpu,
  Cable,
  Fence,
  Type,
  LayoutGrid,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { tokenLibrary } from '../../data/initialMockData';
import { useThemeStore } from '../../store/themeStore';
import { FloorPlanObject } from '../../types/editor';
import { DragPreviews } from './SubComponents/DragPreviews';

function getIcon(type: string) {
  const size = 18;
  switch (type) {
    case 'floor_base':
      return <RectangleHorizontal size={size} />;
    case 'floor_base-pen':
      return <PenTool size={size} />;
    case 'exit':
      return <LogOut size={size} />;
    case 'stairs':
      return <TrendingUp size={size} />;
    case 'elevator':
      return <ArrowUpDown size={size} />;
    case 'sensor':
      return <Cpu size={size} />;
    case 'led_wire-pen':
      return <Cable size={size} />;
    case 'wall-pen':
      return <Fence size={size} />;
    case 'label':
      return <Type size={size} />;
    default:
      return <Cpu size={size} />;
  }
}

function getDragImageOffset(type: string): { x: number; y: number } {
  switch (type) {
    case 'floor_base':
    case 'floor_base-pen':
      return { x: 60, y: 40 };
    case 'exit':
      return { x: 40, y: 20 };
    case 'stairs':
    case 'elevator':
      return { x: 40, y: 40 };
    case 'sensor':
      return { x: 50, y: 24 };
    case 'led_wire-pen':
    case 'wall-pen':
      return { x: 50, y: 15 };
    case 'label':
      return { x: 40, y: 15 };
    default:
      return { x: 25, y: 25 };
  }
}

function getIconStyles(type: string, isActive: boolean, isDark: boolean) {
  const colorMap: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
    floor_base: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      darkBg: 'bg-slate-800',
      darkText: 'text-slate-400'
    },
    'floor_base-pen': {
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      darkBg: 'bg-violet-950/40',
      darkText: 'text-violet-400'
    },
    exit: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      darkBg: 'bg-emerald-950/40',
      darkText: 'text-emerald-400'
    },
    stairs: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      darkBg: 'bg-amber-950/40',
      darkText: 'text-amber-400'
    },
    elevator: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      darkBg: 'bg-yellow-950/40',
      darkText: 'text-yellow-400'
    },
    sensor: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      darkBg: 'bg-sky-950/40',
      darkText: 'text-sky-400'
    },
    'led_wire-pen': {
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      darkBg: 'bg-pink-950/40',
      darkText: 'text-pink-400'
    },
    'wall-pen': {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      darkBg: 'bg-rose-950/40',
      darkText: 'text-rose-400'
    },
    label: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      darkBg: 'bg-indigo-950/40',
      darkText: 'text-indigo-400'
    }
  };

  const style = colorMap[type] || {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    darkBg: 'bg-slate-800',
    darkText: 'text-slate-400'
  };

  if (isActive) {
    const isPen = type.endsWith('-pen');
    const ringColor = isPen ? 'ring-violet-500/30' : 'ring-blue-500/30';
    return isDark
      ? `${style.darkBg.replace('/40', '')} ${style.darkText} ring-1 ${ringColor}`
      : `${style.bg.replace('-50', '-100')} ${style.text} ring-1 ${ringColor.replace('/30', '/20')}`;
  }

  return isDark ? `${style.darkBg} ${style.darkText}` : `${style.bg} ${style.text}`;
}

function getCardStyles(type: string, isActive: boolean, isDark: boolean) {
  const styles: Record<string, {
    activeBorder: string;
    activeBg: string;
    activeShadow: string;
    hoverBorder: string;
    hoverShadow: string;
    darkHoverBorder: string;
    darkHoverShadow: string;
    darkActiveBorder: string;
    darkActiveBg: string;
    darkActiveShadow: string;
  }> = {
    floor_base: {
      activeBorder: 'border-slate-400',
      activeBg: 'bg-slate-100/50',
      activeShadow: 'shadow-[0_0_12px_rgba(148,163,184,0.15)]',
      hoverBorder: 'hover:border-slate-400',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(148,163,184,0.15)]',
      darkHoverBorder: 'hover:border-slate-500/40',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(148,163,184,0.12)]',
      darkActiveBorder: 'border-slate-500',
      darkActiveBg: 'bg-slate-800/40',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(148,163,184,0.15)]',
    },
    'floor_base-pen': {
      activeBorder: 'border-violet-500',
      activeBg: 'bg-violet-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
      hoverBorder: 'hover:border-violet-400',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(139,92,246,0.15)]',
      darkHoverBorder: 'hover:border-violet-500/40',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(139,92,246,0.15)]',
      darkActiveBorder: 'border-violet-500',
      darkActiveBg: 'bg-violet-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(139,92,246,0.18)]',
    },
    exit: {
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      hoverBorder: 'hover:border-emerald-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      darkHoverBorder: 'hover:border-emerald-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      darkActiveBorder: 'border-emerald-500',
      darkActiveBg: 'bg-emerald-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.18)]',
    },
    stairs: {
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      hoverBorder: 'hover:border-amber-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]',
      darkHoverBorder: 'hover:border-amber-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]',
      darkActiveBorder: 'border-amber-500',
      darkActiveBg: 'bg-amber-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.18)]',
    },
    elevator: {
      activeBorder: 'border-yellow-500',
      activeBg: 'bg-yellow-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(234,179,8,0.15)]',
      hoverBorder: 'hover:border-yellow-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(234,179,8,0.15)]',
      darkHoverBorder: 'hover:border-yellow-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(234,179,8,0.15)]',
      darkActiveBorder: 'border-yellow-500',
      darkActiveBg: 'bg-yellow-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(234,179,8,0.18)]',
    },
    sensor: {
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]',
      hoverBorder: 'hover:border-sky-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(14,165,233,0.15)]',
      darkHoverBorder: 'hover:border-sky-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(14,165,233,0.15)]',
      darkActiveBorder: 'border-sky-500',
      darkActiveBg: 'bg-sky-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(14,165,233,0.18)]',
    },
    'led_wire-pen': {
      activeBorder: 'border-pink-500',
      activeBg: 'bg-pink-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]',
      hoverBorder: 'hover:border-pink-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(236,72,153,0.15)]',
      darkHoverBorder: 'hover:border-pink-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(236,72,153,0.15)]',
      darkActiveBorder: 'border-pink-500',
      darkActiveBg: 'bg-pink-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(236,72,153,0.18)]',
    },
    'wall-pen': {
      activeBorder: 'border-rose-500',
      activeBg: 'bg-rose-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      hoverBorder: 'hover:border-rose-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]',
      darkHoverBorder: 'hover:border-rose-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]',
      darkActiveBorder: 'border-rose-500',
      darkActiveBg: 'bg-rose-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(244,63,94,0.18)]',
    },
    label: {
      activeBorder: 'border-indigo-500',
      activeBg: 'bg-indigo-500/10',
      activeShadow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]',
      hoverBorder: 'hover:border-indigo-450',
      hoverShadow: 'hover:shadow-[0_0_12px_rgba(99,102,241,0.15)]',
      darkHoverBorder: 'hover:border-indigo-500/45',
      darkHoverShadow: 'hover:shadow-[0_0_12px_rgba(99,102,241,0.15)]',
      darkActiveBorder: 'border-indigo-500',
      darkActiveBg: 'bg-indigo-500/10',
      darkActiveShadow: 'shadow-[0_0_15px_rgba(99,102,241,0.18)]',
    }
  };

  const style = styles[type] || styles.floor_base;

  if (isActive) {
    return isDark
      ? `${style.darkActiveBorder} ${style.darkActiveBg} ${style.darkActiveShadow}`
      : `${style.activeBorder} ${style.activeBg} ${style.activeShadow}`;
  }

  return isDark
    ? `border-slate-800 bg-slate-900/60 hover:bg-slate-800/85 ${style.darkHoverBorder} ${style.darkHoverShadow}`
    : `border-slate-200 bg-slate-50 hover:bg-slate-100 ${style.hoverBorder} ${style.hoverShadow}`;
}

export function TokenLibrary({
  activeTool,
  onSelect,
  onAddCustomObject,
}: {
  activeTool: string;
  onSelect: (type: string) => void;
  onAddCustomObject?: (obj: FloorPlanObject) => void;
}) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || 800;
        let height = img.naturalHeight || 600;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const newImg: FloorPlanObject = {
          id: `image-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'image',
          name: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Hình ảnh sơ đồ',
          x: 100,
          y: 100,
          width,
          height,
          rotation: 0,
          src: dataUrl,
          opacity: 0.5,
          visible: true,
          locked: false,
        };

        onAddCustomObject?.(newImg);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group tokens: Pen tools vs Drag & Drop tools
  const penTools = React.useMemo(() => tokenLibrary.filter((t) => t.type.endsWith('-pen')), []);
  const dragTools = React.useMemo(() => tokenLibrary.filter((t) => !t.type.endsWith('-pen')), []);

  const renderTokenCard = (token: typeof tokenLibrary[0], isPen: boolean) => {
    const isActive = activeTool === token.type;

    return (
      <div
        key={token.type}
        draggable={!isPen}
        onDragStart={
          isPen
            ? undefined
            : (e) => {
              e.dataTransfer.setData('text/plain', token.type);
              const previewEl = document.getElementById(`drag-preview-${token.type}`);
              if (previewEl) {
                const offset = getDragImageOffset(token.type);
                e.dataTransfer.setDragImage(previewEl, offset.x, offset.y);
              }
            }
        }
        onClick={() => {
          if (activeTool === token.type) {
            onSelect('select');
          } else {
            onSelect(token.type);
          }
        }}
        className={clsx(
          'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200 select-none flex items-start gap-3 hover:scale-[1.01] shadow-sm',
          isPen ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
          getCardStyles(token.type, isActive, isDark)
        )}
      >
        {/* Left Icon Wrapper */}
        <div
          className={clsx(
            'drag-icon-wrapper p-2 rounded-xl shrink-0 flex items-center justify-center transition-colors',
            getIconStyles(token.type, isActive, isDark)
          )}
        >
          {getIcon(token.type)}
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={clsx(
                'text-xs font-bold leading-tight truncate',
                isActive
                  ? isPen
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-blue-500'
                  : isDark
                    ? 'text-slate-200'
                    : 'text-slate-800'
              )}
            >
              {token.label}
            </span>
            <span className={clsx(
              "text-[9px] opacity-40 font-mono tracking-wider ml-2 uppercase shrink-0",
              isActive && (isPen ? 'text-violet-400 opacity-80' : 'text-blue-450 opacity-80')
            )}>
              {isPen ? 'DRAW' : 'DRAG'}
            </span>
          </div>
          <div
            className={clsx(
              'mt-1 text-[10px] leading-tight opacity-75',
              isActive
                ? isPen
                  ? 'text-violet-400/80'
                  : 'text-blue-400/80'
                : isDark
                  ? 'text-slate-400'
                  : 'text-slate-500'
            )}
          >
            {token.description}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Section 0: Background Blueprint Image */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2 select-none">
          <ImageIcon size={11} className="text-amber-500 dark:text-amber-400" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 dark:text-amber-400">Ảnh mặt bằng nền (Trace)</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200 select-none flex items-start gap-3 hover:scale-[1.01] shadow-sm cursor-pointer',
            isDark
              ? 'border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300'
              : 'border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900'
          )}
        >
          <div className="p-2 rounded-xl shrink-0 flex items-center justify-center bg-amber-500/20 text-amber-400">
            <Upload size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold leading-tight truncate">Tải ảnh sơ đồ / Ctrl+V</span>
              <span className="text-[9px] font-mono opacity-80 uppercase">UPLOAD</span>
            </div>
            <div className="mt-1 text-[10px] leading-tight opacity-75">
              Chèn ảnh mặt bằng (PNG/JPG)
            </div>
          </div>
        </button>
      </div>

      {/* Section 1: Drawing Pen Tools */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2 select-none">
          <PenTool size={11} className="text-violet-500 dark:text-violet-400" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-500 dark:text-violet-400">Công cụ vẽ (Pen Tool)</span>
        </div>
        <div className="space-y-2">
          {penTools.map((t) => renderTokenCard(t, true))}
        </div>
      </div>

      {/* Section 2: Drag and Drop Objects */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2 select-none">
          <LayoutGrid size={11} className="text-blue-500 dark:text-blue-400" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-500 dark:text-blue-400">Vật thể thư viện (Kéo thả)</span>
        </div>
        <div className="space-y-2">
          {dragTools.map((t) => renderTokenCard(t, false))}
        </div>
      </div>

      {/* Hidden Drag Previews matching visual canvas shapes */}
      <DragPreviews />
    </div>
  );
}

export default TokenLibrary;