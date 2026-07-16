import { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { ZoomIn, ZoomOut, Maximize, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FloorPlanObject } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import { getDefaultSize, isPointInPolygon } from '../../utils/geometryHelpers';

interface Props {
  objects: FloorPlanObject[];
  sensors: SensorDevice[];
  safePath: string[];
  onRoomSelect?: (roomId: string) => void;
  selectedStartRoomId?: string | null;
  evacuationActive: boolean;
  isDark: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function FloorPlanViewer({
  objects,
  sensors,
  safePath,
  onRoomSelect,
  selectedStartRoomId,
  evacuationActive,
  isDark,
  canvasWidth,
  canvasHeight,
}: Props) {
  const w = canvasWidth ?? 1600;
  const h = canvasHeight ?? 1000;

  const stageRef = useRef<Konva.Stage | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(0.7);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [viewport, setViewport] = useState({ width: 800, height: 480 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });

  const safePathLineRef = useRef<Konva.Line | null>(null);

  const gridPattern = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = isDark ? 'rgba(100, 116, 139, 0.4)' : 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(24, 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(24, 24);
    ctx.stroke();
    return canvas;
  }, [isDark]);

  // Handle auto viewport resizing with throttling to smooth out layout transitions
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    let timeoutId: any;
    let lastRan = 0;

    const updateViewport = () => {
      const run = () => {
        if (node) {
          setViewport({
            width: node.clientWidth,
            height: node.clientHeight,
          });
        }
      };

      const now = performance.now();
      const throttleMs = 60; // Throttled to ~15fps during transition

      if (now - lastRan >= throttleMs) {
        run();
        lastRan = now;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          run();
          lastRan = performance.now();
        }, throttleMs - (now - lastRan));
      }
    };

    // Initial size should set immediately
    setViewport({
      width: node.clientWidth,
      height: node.clientHeight,
    });

    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  // Center the view on objects
  const handleResetView = () => {
    if (objects.length === 0) return;
    
    // Find bounding box of objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      if (obj.type === 'connector' || obj.type === 'label') return;
      const oW = obj.width || 40;
      const oH = obj.height || 40;
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + oW);
      maxY = Math.max(maxY, obj.y + oH);
    });

    if (minX === Infinity) {
      minX = 100; minY = 100; maxX = 900; maxY = 600;
    }

    const planWidth = maxX - minX;
    const planHeight = maxY - minY;
    
    const newScale = Math.min(
      (viewport.width - 100) / planWidth,
      (viewport.height - 100) / planHeight,
      1.5
    );
    
    setScale(Math.max(0.4, newScale));
    setPosition({
      x: Math.round((viewport.width - planWidth * newScale) / 2 - minX * newScale),
      y: Math.round((viewport.height - planHeight * newScale) / 2 - minY * newScale),
    });
  };

  useEffect(() => {
    if (objects.length > 0 && viewport.width > 800) {
      handleResetView();
    }
  }, [objects.length, viewport.width]);

  // Zoom controls
  const handleZoom = (factor: number) => {
    const nextScale = Math.max(0.3, Math.min(3, scale * factor));
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    
    const worldPoint = {
      x: (center.x - position.x) / scale,
      y: (center.y - position.y) / scale,
    };

    setScale(nextScale);
    setPosition({
      x: Math.round(center.x - worldPoint.x * nextScale),
      y: Math.round(center.y - worldPoint.y * nextScale),
    });
  };

  // Mouse drag panning
  const handleMouseDown = (e: any) => {
    if (e.target === e.target.getStage() || e.target.hasName('workspace-empty')) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
      setPanOrigin({ x: position.x, y: position.y });
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isPanning) return;
    const dx = e.evt.clientX - panStart.x;
    const dy = e.evt.clientY - panStart.y;
    setPosition({
      x: panOrigin.x + dx,
      y: panOrigin.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const oldScale = scale;
    const nextScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    const clampedScale = Math.max(0.3, Math.min(3, nextScale));
    
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // 1. Map live sensor status to device objects
  const dangerDeviceIds = useMemo(() => {
    return new Set(
      sensors.filter((s) => s.latest_status === 'danger').map((s) => s.device_id)
    );
  }, [sensors]);

  const warningDeviceIds = useMemo(() => {
    return new Set(
      sensors
        .filter((s) => s.latest_status === 'safe' && s.latest_value >= s.threshold * 0.8)
        .map((s) => s.device_id)
    );
  }, [sensors]);

  const sensorValues = useMemo(() => {
    const map = new Map<string, { val: number; unit: string }>();
    sensors.forEach((s) => {
      map.set(s.device_id, { val: s.latest_value, unit: s.unit });
    });
    return map;
  }, [sensors]);

  // 2. Identify rooms that contain at least one danger sensor
  const dangerRooms = useMemo(() => {
    const rooms = new Set<string>();
    const dangerPositions: { x: number; y: number }[] = [];
    
    objects.forEach((obj) => {
      if (obj.type === 'mq2' || obj.type === 'temp') {
        if (dangerDeviceIds.has(obj.id)) {
          dangerPositions.push({ x: obj.x, y: obj.y });
        }
      }
    });

    objects.forEach((obj) => {
      if (obj.type === 'room') {
        const isPolygon = obj.shapeType === 'polygon';
        const pts = obj.points;

        if (isPolygon && pts && pts.length >= 6) {
          const poly = [];
          for (let i = 0; i < pts.length; i += 2) {
            poly.push({ x: obj.x + pts[i], y: obj.y + pts[i + 1] });
          }
          const hasDanger = dangerPositions.some((p) => isPointInPolygon(p.x, p.y, poly));
          if (hasDanger) {
            rooms.add(obj.id);
          }
        } else {
          const rx = obj.x;
          const ry = obj.y;
          const rw = obj.width || 240;
          const rh = obj.height || 140;
          
          const hasDanger = dangerPositions.some(
            (p) => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh
          );
          if (hasDanger) {
            rooms.add(obj.id);
          }
        }
      }
    });
    
    return rooms;
  }, [objects, dangerDeviceIds]);

  // 3. Process safe path coordinates
  const safePathPoints = useMemo(() => {
    if (!evacuationActive || !safePath || safePath.length < 2) return null;
    const points: number[] = [];
    safePath.forEach((id) => {
      const node = objects.find((o) => o.id === id);
      if (node) {
        const size = getDefaultSize(node.type);
        points.push(node.x + (node.width || size.width) / 2);
        points.push(node.y + (node.height || size.height) / 2);
      }
    });
    return points.length >= 4 ? points : null;
  }, [evacuationActive, safePath, objects]);

  // Room rendering style mapper
  const getRoomStyle = (room: FloorPlanObject) => {
    const isDanger = dangerRooms.has(room.id);
    const isSelected = selectedStartRoomId === room.id;
    
    if (isDanger) {
      return {
        fill: 'rgba(239, 68, 68, 0.45)',
        stroke: '#ef4444',
        strokeWidth: 3.5,
        shadowColor: '#ef4444',
        shadowBlur: 15,
      };
    }

    if (isSelected) {
      return {
        fill: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)',
        stroke: '#3b82f6',
        strokeWidth: 3,
        shadowColor: '#3b82f6',
        shadowBlur: 10,
      };
    }

    const isLobby = room.name?.toLowerCase().includes('lobby');
    if (isLobby) {
      return {
        fill: isDark ? '#1F2937' : '#f1f5f9',
        stroke: isDark ? '#374151' : '#cbd5e1',
        strokeWidth: 1.5,
        shadowBlur: 0,
        shadowColor: '',
      };
    }

    return {
      fill: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.05)',
      stroke: isDark ? '#10B981' : '#10b981',
      strokeWidth: 1.5,
      shadowBlur: 0,
      shadowColor: '',
    };
  };

  // Layering order: floor_base first, then others, then connectors
  const sortedObjects = useMemo(() => {
    const bases = objects.filter((o) => o.type === 'floor_base');
    const connectors = objects.filter((o) => o.type === 'connector');
    const others = objects.filter((o) => o.type !== 'floor_base' && o.type !== 'connector');
    return [...bases, ...others, ...connectors];
  }, [objects]);

  // Render objects on Konva layer
  const renderObject = (obj: FloorPlanObject) => {
    if (obj.visible === false) return null;
    const oW = obj.width || getDefaultSize(obj.type).width;
    const oH = obj.height || getDefaultSize(obj.type).height;

    const commonProps = {
      key: obj.id,
      x: obj.x,
      y: obj.y,
      rotation: obj.rotation || 0,
      onClick: () => {
        if (obj.type === 'room' && onRoomSelect) {
          onRoomSelect(obj.id);
        }
      },
      onTap: () => {
        if (obj.type === 'room' && onRoomSelect) {
          onRoomSelect(obj.id);
        }
      },
    };

    if (obj.type === 'floor_base') {
      const isPolygon = obj.shapeType === 'polygon';
      const pts = isPolygon ? obj.points || [] : [0, 0, oW, 0, oW, oH, 0, oH];
      return (
        <Group {...commonProps}>
          <Group
            clipFunc={(ctx) => {
              if (pts.length < 4) return;
              ctx.beginPath();
              ctx.moveTo(pts[0], pts[1]);
              for (let i = 2; i < pts.length; i += 2) {
                ctx.lineTo(pts[i], pts[i + 1]);
              }
              ctx.closePath();
            }}
          >
            <Rect
              x={0}
              y={0}
              width={isPolygon ? 4000 : oW}
              height={isPolygon ? 4000 : oH}
              fill={isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(203, 213, 225, 0.5)'}
            />
          </Group>
          <Line
            points={pts}
            closed={true}
            stroke={isDark ? '#334155' : '#cbd5e1'}
            strokeWidth={2}
            listening={false}
          />
        </Group>
      );
    }

    if (obj.type === 'room') {
      const style = getRoomStyle(obj);
      const isDanger = dangerRooms.has(obj.id);
      const isPolygon = obj.shapeType === 'polygon';
      const pts = obj.points || [];

      return (
        <Group {...commonProps}>
          {isPolygon && pts.length >= 6 ? (
            <Line
              name={isDanger ? "danger-blink" : undefined}
              points={pts}
              closed={true}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              shadowColor={style.shadowColor}
              shadowBlur={style.shadowBlur}
              shadowOpacity={0.6}
            />
          ) : (
            <Rect
              name={isDanger ? "danger-blink" : undefined}
              width={oW}
              height={oH}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              cornerRadius={16}
              shadowColor={style.shadowColor}
              shadowBlur={style.shadowBlur}
              shadowOpacity={0.6}
            />
          )}
          {/* Room Name */}
          <Text
            text={obj.name || 'Room'}
            x={isPolygon ? pts[0] + 16 : 16}
            y={isPolygon ? pts[1] + 16 : 14}
            fontSize={15}
            fontStyle="bold"
            fill={isDanger ? '#ef4444' : isDark ? '#f8fafc' : '#334155'}
          />

          {/* Pulsing Danger Badge */}
          {isDanger && (
            <Group x={isPolygon ? pts[0] + 16 : 16} y={isPolygon ? pts[1] + 38 : 36}>
              <Rect
                width={80}
                height={20}
                fill="#ef4444"
                cornerRadius={6}
              />
              <Text
                text="⚠️ DANGER"
                x={8}
                y={5}
                fontSize={10}
                fontStyle="bold"
                fill="#ffffff"
              />
            </Group>
          )}
        </Group>
      );
    }

    if (obj.type === 'door') {
      return (
        <Group {...commonProps}>
          <Rect
            width={oW}
            height={oH}
            fill={isDark ? '#4b5563' : '#d9a36b'}
            cornerRadius={4}
          />
        </Group>
      );
    }

    if (obj.type === 'exit') {
      return (
        <Group {...commonProps}>
          <Rect
            width={oW}
            height={oH}
            fill={isDark ? '#065f46' : '#10b981'}
            stroke="#10b981"
            strokeWidth={1.5}
            cornerRadius={8}
          />
          <Text
            text={obj.name || 'EXIT'}
            width={oW}
            align="center"
            y={oH / 2 - 7}
            fontStyle="bold"
            fontSize={13}
            fill="#ffffff"
          />
        </Group>
      );
    }

    if (obj.type === 'stairs') {
      return (
        <Group {...commonProps}>
          <Rect
            width={oW}
            height={oH}
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeWidth={1.5}
            dash={[6, 4]}
            cornerRadius={8}
            fill={isDark ? '#1e293b' : '#cbd5e1'}
          />
          <Text
            text="🪜 Stairs"
            width={oW}
            align="center"
            y={oH / 2 - 7}
            fontSize={12}
            fontStyle="bold"
            fill={isDark ? '#cbd5e1' : '#475569'}
          />
        </Group>
      );
    }

    if (obj.type === 'elevator') {
      return (
        <Group {...commonProps}>
          <Rect
            width={oW}
            height={oH}
            fill={isDark ? '#334155' : '#e2e8f0'}
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeWidth={1.5}
            cornerRadius={8}
          />
          <Line
            points={[oW / 2, 4, oW / 2, oH - 4]}
            stroke={isDark ? '#475569' : '#94a3b8'}
            strokeWidth={1.5}
          />
          <Text
            text="🛗 Lift"
            width={oW}
            align="center"
            y={oH / 2 - 7}
            fontSize={11}
            fontStyle="bold"
            fill={isDark ? '#cbd5e1' : '#475569'}
          />
        </Group>
      );
    }

    if (obj.type === 'wall') {
      return (
        <Group {...commonProps}>
          <Rect
            width={oW}
            height={oH}
            fill={isDark ? '#475569' : '#64748b'}
            stroke={isDark ? '#1e293b' : '#475569'}
            strokeWidth={1}
            cornerRadius={2}
          />
        </Group>
      );
    }

    if (obj.type === 'mq2' || obj.type === 'temp') {
      const isDanger = dangerDeviceIds.has(obj.id);
      const isWarning = warningDeviceIds.has(obj.id);
      
      let badgeColor = isDark ? '#334155' : '#f1f5f9';
      let strokeColor = isDark ? '#475569' : '#cbd5e1';
      let textColor = isDark ? '#f8fafc' : '#475569';

      if (isDanger) {
        badgeColor = '#ef4444';
        strokeColor = '#fca5a5';
        textColor = '#ffffff';
      } else if (isWarning) {
        badgeColor = '#f59e0b';
        strokeColor = '#fde68a';
        textColor = '#ffffff';
      }

      const reading = sensorValues.get(obj.id);
      const label = `${obj.name || (obj.type === 'mq2' ? 'MQ2' : 'Temp')}`;
      const valueStr = reading ? `${reading.val} ${reading.unit}` : '--';

      return (
        <Group {...commonProps}>
          <Circle
            name={isDanger ? "danger-blink-sensor" : isWarning ? "warning-blink-sensor" : undefined}
            radius={22}
            x={22}
            y={22}
            fill={badgeColor}
            stroke={strokeColor}
            strokeWidth={2}
            shadowColor={isDanger ? '#ef4444' : ''}
            shadowBlur={isDanger ? 10 : 0}
          />
          <Text
            text={obj.type === 'mq2' ? '💨' : '🌡️'}
            x={13}
            y={13}
            fontSize={16}
          />
          <Text
            text={label}
            x={-15}
            y={48}
            width={74}
            align="center"
            fontSize={11}
            fontStyle="bold"
            fill={isDark ? '#cbd5e1' : '#475569'}
          />
          <Group x={-10} y={64}>
            <Rect
              width={64}
              height={16}
              fill={isDark ? '#0f172a' : '#f8fafc'}
              stroke={isDanger ? '#ef4444' : isDark ? '#334155' : '#e2e8f0'}
              strokeWidth={1}
              cornerRadius={4}
            />
            <Text
              text={valueStr}
              width={64}
              align="center"
              y={3}
              fontSize={9}
              fontStyle="bold"
              fill={isDanger ? '#ef4444' : isDark ? '#38bdf8' : '#3b82f6'}
            />
          </Group>
        </Group>
      );
    }

    if (obj.type === 'led') {
      const isDanger = obj.nodeStatus === 'danger';
      return (
        <Group {...commonProps}>
          <Circle
            radius={10}
            fill={isDanger ? '#ef4444' : '#10b981'}
            stroke="#ffffff"
            strokeWidth={1.5}
            shadowColor={isDanger ? '#ef4444' : '#10b981'}
            shadowBlur={isDanger ? 8 : 4}
          />
        </Group>
      );
    }

    if (obj.type === 'connector') {
      const fromNode = objects.find((o) => o.id === obj.fromNodeId);
      const toNode = objects.find((o) => o.id === obj.toNodeId);
      if (!fromNode || !toNode) return null;

      const fromSize = getDefaultSize(fromNode.type);
      const toSize = getDefaultSize(toNode.type);

      const fromX = fromNode.x + (fromNode.width || fromSize.width) / 2;
      const fromY = fromNode.y + (fromNode.height || fromSize.height) / 2;
      const toX = toNode.x + (toNode.width || toSize.width) / 2;
      const toY = toNode.y + (toNode.height || toSize.height) / 2;

      return (
        <Group {...commonProps} x={0} y={0}>
          <Line
            points={[fromX, fromY, toX, toY]}
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeWidth={1.5}
            dash={[5, 8]}
            opacity={0.6}
          />
        </Group>
      );
    }

    return (
      <Group {...commonProps}>
        <Text
          text={obj.name || ''}
          fontSize={obj.fontSize || 18}
          fontStyle="bold"
          fill={
            obj.textColor || obj.color
              ? ((obj.textColor === '#f8fafc' || obj.color === '#f8fafc') && !isDark)
                ? '#475569'
                : (obj.textColor || obj.color)
              : (isDark ? '#94a3b8' : '#475569')
          }
        />
      </Group>
    );
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let dashOffset = 0;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time;

      // 1. Animate evacuation path line dashOffset
      if (safePathLineRef.current && evacuationActive) {
        const timeDiff = frame.timeDiff;
        dashOffset = (dashOffset - (timeDiff * 0.05)) % 40;
        safePathLineRef.current.dashOffset(dashOffset);
      }

      // 2. Animate blinking danger rooms & warning sensors (500ms intervals)
      const isAlt = Math.floor(time / 500) % 2 === 0;

      const dangerRoomsNodes = stage.find('.danger-blink');
      dangerRoomsNodes.forEach((node) => {
        (node as any).fill(isAlt ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.25)');
      });

      const dangerSensors = stage.find('.danger-blink-sensor');
      dangerSensors.forEach((node) => {
        node.opacity(isAlt ? 1.0 : 0.4);
      });

      const warningSensors = stage.find('.warning-blink-sensor');
      warningSensors.forEach((node) => {
        node.opacity(isAlt ? 1.0 : 0.6);
      });
    });

    anim.start();
    return () => {
      anim.stop();
    };
  }, [objects, dangerRooms, safePathPoints, evacuationActive]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-[520px] overflow-hidden rounded-[24px] border shadow-soft transition-all duration-300 ${
        isDark
          ? 'bg-[#0F172A] border-slate-800'
          : 'bg-slate-50 border-slate-200'
      }`}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseLeave={handleMouseUp}
    >
      <Stage
        ref={stageRef}
        width={viewport.width}
        height={viewport.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Workspace Canvas Board (Drawing sheet background) */}
        <Layer>
          <Group x={position.x} y={position.y}>
            <Rect
              name="workspace-empty"
              x={0}
              y={0}
              width={w * scale}
              height={h * scale}
              fill={isDark ? '#0f172a' : '#f8fafc'}
              stroke={isDark ? '#1e293b' : '#cbd5e1'}
              strokeWidth={1.5}
              cornerRadius={8}
            />
            {gridPattern && (
              <Rect
                x={0}
                y={0}
                width={w * scale}
                height={h * scale}
                fillPatternImage={gridPattern as any}
                fillPatternScaleX={scale}
                fillPatternScaleY={scale}
                fillPatternRepeat="repeat"
                opacity={1.0}
                listening={false}
              />
            )}
          </Group>
        </Layer>

        {/* Dynamic Floor Plan layer */}
        <Layer>
          <Group
            x={position.x}
            y={position.y}
            scaleX={scale}
            scaleY={scale}
          >
            {/* Render all structural objects (Layered bases first) */}
            {sortedObjects.map(renderObject)}

            {/* Evacuation Flow Route (High Fidelity Green Glowing Arrow Path) */}
            {safePathPoints && (
              <Line
                ref={safePathLineRef}
                points={safePathPoints}
                stroke="#10b981"
                strokeWidth={7}
                lineJoin="round"
                lineCap="round"
                dash={[20, 15]}
                shadowColor="#10b981"
                shadowBlur={16}
                shadowOpacity={0.9}
              />
            )}
          </Group>
        </Layer>
      </Stage>

      {/* Dynamic Controls panel overlays */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(1.2)}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
            isDark
              ? 'bg-[#1E293B] border-slate-700 hover:bg-slate-800 text-white'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(0.83)}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
            isDark
              ? 'bg-[#1E293B] border-slate-700 hover:bg-slate-800 text-white'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleResetView}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
            isDark
              ? 'bg-[#1E293B] border-slate-700 hover:bg-slate-800 text-white'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
          title="Fit View"
        >
          <Maximize size={16} />
        </button>
      </div>

      {/* Selected room helper or guides */}
      <div
        className={`absolute bottom-4 left-4 z-20 px-4 py-2 rounded-xl text-xs border shadow-md flex items-center gap-2 ${
          isDark
            ? 'bg-[#1E293B] border-slate-800 text-slate-300'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <span>🖱️ Kéo vùng trống để di chuyển • Cuộn chuột để phóng to/thu nhỏ</span>
        {selectedStartRoomId && (
          <span className={`px-2 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30`}>
            📍 Điểm chọn: {objects.find(o => o.id === selectedStartRoomId)?.name}
          </span>
        )}
      </div>

      {/* Evacuation path active badge */}
      {evacuationActive && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/90 text-white text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-400">
          <ShieldCheck size={14} className="animate-bounce" />
          <span>ĐƯỜNG THOÁT HIỂM ĐANG HOẠT ĐỘNG</span>
        </div>
      )}
    </div>
  );
}
export default FloorPlanViewer;
