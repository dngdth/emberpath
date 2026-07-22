import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { ZoomIn, ZoomOut, Maximize, RefreshCw, AlertTriangle, ShieldCheck, Lock, Unlock, MousePointer } from 'lucide-react';
import { FloorPlanObject, FloorItem, SafePathResult } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import { getDefaultSize, isPointInPolygon } from '../../utils/geometryHelpers';
import { StairsSymbol } from '../MapEditor/StairsSymbol';
import { DangerSensorsPanel } from './DangerSensorsPanel';

// Reuse shape components from editor
import { FloorBaseShape } from '../MapEditor/Shapes/FloorBaseShape';
import { RoomShape } from '../MapEditor/Shapes/RoomShape';
import { DoorShape } from '../MapEditor/Shapes/DoorShape';
import { ExitShape } from '../MapEditor/Shapes/ExitShape';
import { StairsShape } from '../MapEditor/Shapes/StairsShape';
import { ElevatorShape } from '../MapEditor/Shapes/ElevatorShape';
import { WallShape } from '../MapEditor/Shapes/WallShape';
import { SensorShape } from '../MapEditor/Shapes/SensorShape';
import { LedWireShape } from '../MapEditor/Shapes/LedWireShape';
import { LedShape } from '../MapEditor/Shapes/LedShape';
import { ConnectorShape } from '../MapEditor/Shapes/ConnectorShape';
import { LabelShape } from '../MapEditor/Shapes/LabelShape';
import { ImageShape } from '../MapEditor/Shapes/ImageShape';

interface Props {
  floorId: number | null;
  objects: FloorPlanObject[];
  sensors: SensorDevice[];
  safePath: SafePathResult | null;
  onRoomSelect?: (roomId: string) => void;
  selectedStartRoomId?: string | null;
  evacuationActive: boolean;
  isDark: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  dangerSensors: SensorDevice[];
  floors: FloorItem[];
  onSelectDangerSensor?: (sensor: SensorDevice) => void;
}

export function FloorPlanViewer({
  floorId,
  objects,
  sensors,
  safePath,
  onRoomSelect,
  selectedStartRoomId,
  evacuationActive,
  isDark,
  canvasWidth,
  canvasHeight,
  dangerSensors,
  floors,
  onSelectDangerSensor,
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
  const [isFocused, setIsFocused] = useState(false);
  const [hoveredSensorId, setHoveredSensorId] = useState<string | null>(null);

  const longPressTimerRef = useRef<any>(null);

  const handleTouchStart = (objId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setHoveredSensorId(objId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setHoveredSensorId(null);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const hoveredSensorObj = useMemo(() => {
    if (!hoveredSensorId) return null;
    return objects.find((o) => o.id === hoveredSensorId) || null;
  }, [hoveredSensorId, objects]);

  const hoveredSensorData = useMemo(() => {
    if (!hoveredSensorId) return null;
    const found = sensors.find((s) => s.device_id === hoveredSensorId);
    if (found) return found;

    // Fallback info for mock/unlinked sensors
    if (hoveredSensorObj) {
      const isMq2 = hoveredSensorObj.type === 'mq2' || hoveredSensorObj.id.toLowerCase().includes('mq2');
      const isTemp = hoveredSensorObj.type === 'temp' || hoveredSensorObj.id.toLowerCase().includes('temp');
      return {
        device_id: hoveredSensorObj.id,
        name: hoveredSensorObj.name || (isMq2 ? 'CB Khói MQ2' : isTemp ? 'CB Nhiệt độ' : 'Cảm biến'),
        sensor_type: isMq2 ? 'mq2' : 'temp',
        latest_value: 0,
        threshold: isMq2 ? 100 : 60,
        latest_status: 'safe',
        unit: isMq2 ? 'ppm' : '°C',
        room_name: null,
      } as any;
    }
    return null;
  }, [hoveredSensorId, sensors, hoveredSensorObj]);

  const hasDraggedRef = useRef(false);

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

  // Click outside to defocus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Escape key to lock map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocused) {
        setIsFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocused]);

  // Center/Zoom or Reset View reactively
  useEffect(() => {
    if (objects.length === 0) return;
    if (selectedStartRoomId) {
      const obj = objects.find((o) => o.id === selectedStartRoomId);
      if (obj) {
        const objW = obj.width || 40;
        const objH = obj.height || 40;
        const targetX = obj.x + objW / 2;
        const targetY = obj.y + objH / 2;
        const targetScale = 1.2;
        setScale(targetScale);
        setPosition({
          x: Math.round(viewport.width / 2 - targetX * targetScale),
          y: Math.round(viewport.height / 2 - targetY * targetScale),
        });
        setIsFocused(true);
      }
    } else {
      handleResetView();
    }
  }, [objects, selectedStartRoomId, viewport.width, viewport.height]);

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
    if (!isFocused) return;
    setIsPanning(true);
    hasDraggedRef.current = false;
    setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
    setPanOrigin({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e: any) => {
    if (!isFocused || !isPanning) return;
    const dx = e.evt.clientX - panStart.x;
    const dy = e.evt.clientY - panStart.y;
    if (Math.hypot(dx, dy) > 3) {
      hasDraggedRef.current = true;
    }
    setPosition({
      x: panOrigin.x + dx,
      y: panOrigin.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: any) => {
    if (!isFocused) return;
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
      if (obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp') {
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
          const poly: { x: number; y: number }[] = [];
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

  const activeWireDirections = useMemo(() => {
    const directions = new Map<string, { reverse: boolean; status: 'safe' | 'danger' }>();
    if (!evacuationActive) return directions;
    for (const segment of safePath?.segments || []) {
      if (segment.kind === 'led_wire' && segment.wire_id && segment.floor_id === floorId) {
        directions.set(segment.wire_id, { reverse: segment.reverse, status: segment.status });
      }
    }
    return directions;
  }, [evacuationActive, floorId, safePath]);

  const activeStairIds = useMemo(() => {
    const ids = new Set<string>();
    if (!evacuationActive) return ids;
    for (const segment of safePath?.segments || []) {
      if (segment.kind !== 'stairs') continue;
      if (segment.from_floor_id === floorId) ids.add(segment.from_node_id);
      if (segment.to_floor_id === floorId) ids.add(segment.to_node_id);
    }
    return ids;
  }, [evacuationActive, floorId, safePath]);

  const objectById = useMemo(
    () => new Map(objects.map((object) => [object.id, object])),
    [objects],
  );



  // Render objects on Konva layer in array order (preserving user z-index choices)

  // Render objects on Konva layer
  const renderObject = (obj: FloorPlanObject) => {
    if (obj.visible === false) return null;

    const isSensorType = obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp';

    const commonProps = {
      x: obj.x,
      y: obj.y,
      rotation: obj.rotation || 0,
      onClick: () => {
        if (hasDraggedRef.current) return;
        if (['room', 'sensor', 'mq2', 'temp'].includes(obj.type) && onRoomSelect) {
          onRoomSelect(obj.id);
        }
      },
      onTap: () => {
        if (hasDraggedRef.current) return;
        if (['room', 'sensor', 'mq2', 'temp'].includes(obj.type) && onRoomSelect) {
          onRoomSelect(obj.id);
        }
      },
      onMouseEnter: isSensorType
        ? () => setHoveredSensorId(obj.id)
        : undefined,
      onMouseLeave: isSensorType
        ? () => setHoveredSensorId(null)
        : undefined,
      onTouchStart: isSensorType
        ? () => handleTouchStart(obj.id)
        : undefined,
      onTouchEnd: isSensorType
        ? () => handleTouchEnd()
        : undefined,
      onTouchMove: isSensorType
        ? () => handleTouchMove()
        : undefined,
    };

    if (obj.type === 'image') {
      return (
        <ImageShape
          object={obj}
          selected={false}
          isDark={isDark}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'floor_base') {
      return (
        <FloorBaseShape
          object={obj}
          selected={false}
          isDark={isDark}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'room') {
      const isDanger = dangerRooms.has(obj.id);
      return (
        <RoomShape
          object={obj}
          selected={selectedStartRoomId === obj.id}
          isDark={isDark}
          isRoomDanger={isDanger}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'door') {
      return (
        <DoorShape
          object={obj}
          selected={false}
          isDark={isDark}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'exit') {
      return (
        <ExitShape
          object={obj}
          selected={false}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'stairs') {
      return (
        <StairsShape
          object={obj}
          selected={false}
          isDark={isDark}
          active={activeStairIds.has(obj.id)}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'elevator') {
      return (
        <ElevatorShape
          object={obj}
          selected={false}
          isDark={isDark}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'wall') {
      return (
        <WallShape
          object={obj}
          selected={false}
          isDark={isDark}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp') {
      const isDanger = dangerDeviceIds.has(obj.id) || obj.nodeStatus === 'danger';
      const isWarning = warningDeviceIds.has(obj.id);
      const reading = sensorValues.get(obj.id);

      return (
        <SensorShape
          object={obj}
          selected={false}
          isDark={isDark}
          isDanger={isDanger}
          isWarning={isWarning}
          reading={reading}
          isHovered={hoveredSensorId === obj.id}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'led_wire') {
      const wireDirection = activeWireDirections.get(obj.id);
      return (
        <LedWireShape
          object={obj}
          selected={false}
          isDark={isDark}
          active={wireDirection !== undefined}
          reverse={wireDirection?.reverse ?? false}
          status={wireDirection?.status}
          fromNode={obj.fromNodeId ? objectById.get(obj.fromNodeId) : undefined}
          toNode={obj.toNodeId ? objectById.get(obj.toNodeId) : undefined}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'led') {
      return (
        <LedShape
          object={obj}
          selected={false}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'connector') {
      const fromNode = objects.find((o) => o.id === obj.fromNodeId);
      const toNode = objects.find((o) => o.id === obj.toNodeId);
      const wallObjects = objects.filter((o) => o.type === 'wall');

      return (
        <ConnectorShape
          object={obj}
          selected={false}
          isDark={isDark}
          fromNode={fromNode}
          toNode={toNode}
          wallObjects={wallObjects}
          commonProps={commonProps}
        />
      );
    }

    if (obj.type === 'label') {
      return (
        <LabelShape
          object={obj}
          isDark={isDark}
          commonProps={commonProps}
        />
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

      // 1. Animate evacuation path line dashOffset & LED wires
      if (evacuationActive) {
        const timeDiff = frame.timeDiff;
        dashOffset = (dashOffset - (timeDiff * 0.05)) % 40;
        const activeLedWires = stage.find('.active-led-wire');
        activeLedWires.forEach((node) => {
          (node as any).dashOffset(dashOffset);
        });
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
  }, [objects, dangerRooms, activeWireDirections, evacuationActive, activeStairIds]);

  return (
    <div
      ref={wrapperRef}
      onClick={() => {
        if (!isFocused) setIsFocused(true);
      }}
      className={`relative w-full h-[520px] overflow-hidden rounded-xl border shadow-soft transition-all duration-300 ${
        isDark
          ? 'bg-[#0F172A] border-slate-800'
          : 'bg-slate-50 border-slate-200'
      } ${
        isFocused
          ? isDark
            ? 'ring-[3px] ring-blue-500/40 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.25)]'
            : 'ring-[3px] ring-blue-600/40 border-blue-600 shadow-[0_0_25px_rgba(37,99,235,0.25)]'
          : ''
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
            {objects.map((object) => (
              <Fragment key={object.id}>{renderObject(object)}</Fragment>
            ))}

            {/* Hover Tooltip for Sensors */}
            {hoveredSensorObj && hoveredSensorData && (() => {
              const isLinked = sensors.some((s) => s.device_id === hoveredSensorId);
              const isMq2 = hoveredSensorData.sensor_type === 'mq2';
              
              const tooltipWidth = 190;
              const tooltipHeight = 96;
              
              const strokeColor = !isLinked
                ? (isDark ? '#475569' : '#cbd5e1')
                : hoveredSensorData.latest_status === 'danger'
                ? '#ef4444'
                : hoveredSensorData.latest_value >= hoveredSensorData.threshold * 0.8
                ? '#f59e0b'
                : isDark
                ? '#334155'
                : '#cbd5e1';

              const statusText = !isLinked
                ? 'CHƯA LIÊN KẾT 📡'
                : hoveredSensorData.latest_status === 'danger'
                ? 'NGUY HIỂM 🚨'
                : hoveredSensorData.latest_value >= hoveredSensorData.threshold * 0.8
                ? 'CẢNH BÁO ⚠️'
                : 'AN TOÀN ✅';

              const statusColor = !isLinked
                ? (isDark ? '#94a3b8' : '#64748b')
                : hoveredSensorData.latest_status === 'danger'
                ? '#ef4444'
                : hoveredSensorData.latest_value >= hoveredSensorData.threshold * 0.8
                ? '#d97706'
                : '#10b981';

              const valueText = isLinked
                ? `Chỉ số: ${hoveredSensorData.latest_value} ${hoveredSensorData.unit} / ${hoveredSensorData.threshold} ${hoveredSensorData.unit}`
                : `Chỉ số: -- / Ngưỡng: ${hoveredSensorData.threshold} ${hoveredSensorData.unit}`;

              const valueColor = !isLinked
                ? (isDark ? '#94a3b8' : '#64748b')
                : hoveredSensorData.latest_status === 'danger'
                ? '#ef4444'
                : hoveredSensorData.latest_value >= hoveredSensorData.threshold * 0.8
                ? '#f59e0b'
                : isDark
                ? '#38bdf8'
                : '#2563eb';

              return (
                <Group
                  x={hoveredSensorObj.x + 22 - tooltipWidth / 2}
                  y={hoveredSensorObj.y - tooltipHeight - 14}
                  listening={false}
                >
                  <Rect
                    width={tooltipWidth}
                    height={tooltipHeight}
                    fill={isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    cornerRadius={8}
                    shadowColor="rgba(0, 0, 0, 0.3)"
                    shadowBlur={12}
                    shadowOffset={{ x: 0, y: 4 }}
                    shadowOpacity={0.4}
                  />
                  <Text
                    text={hoveredSensorData.name}
                    x={10}
                    y={10}
                    fontSize={12}
                    fontStyle="bold"
                    fill={isDark ? '#f8fafc' : '#0f172a'}
                  />
                  <Text
                    text={`${
                      isMq2 ? '💨 Khói (MQ2)' : '🌡️ Nhiệt độ'
                    } • ID: ${hoveredSensorData.device_id.slice(0, 8)}`}
                    x={10}
                    y={26}
                    fontSize={9}
                    fill={isDark ? '#94a3b8' : '#64748b'}
                  />
                  <Line
                    points={[10, 40, 180, 40]}
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                    strokeWidth={1}
                  />
                  <Text
                    text={valueText}
                    x={10}
                    y={46}
                    fontSize={10}
                    fontStyle="bold"
                    fill={valueColor}
                  />
                  <Text
                    text={`Tình trạng: ${statusText}`}
                    x={10}
                    y={60}
                    fontSize={10}
                    fontStyle="bold"
                    fill={statusColor}
                  />
                  <Text
                    text={`Vị trí: ${hoveredSensorData.room_name || 'Chưa xác định'}`}
                    x={10}
                    y={75}
                    fontSize={9}
                    fill={isDark ? '#64748b' : '#94a3b8'}
                  />
                </Group>
              );
            })()}

          </Group>
        </Layer>
      </Stage>

      {/* Dynamic Controls panel overlays */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => setIsFocused(!isFocused)}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
            isFocused
              ? 'bg-blue-600 border-blue-500 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
              : isDark
                ? 'bg-[#1E293B] border-slate-700 hover:bg-slate-800 text-white'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
          title={isFocused ? 'Khóa Sơ đồ' : 'Tương tác Sơ đồ'}
        >
          {isFocused ? <Unlock size={16} /> : <Lock size={16} />}
        </button>
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
        className={`absolute bottom-4 left-4 z-20 px-4 py-2 rounded-xl text-xs border shadow-md flex flex-wrap items-center gap-2 transition-all duration-300 ${
          isDark
            ? 'bg-[#1E293B]/90 border-slate-800 text-slate-300 backdrop-blur-sm'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
        <span>
          {isFocused
            ? '🖱️ Kéo để di chuyển • Cuộn chuột để zoom • Nhấn Esc để khóa'
            : '🔒 Sơ đồ đang khóa • Bấm vào để kích hoạt di chuyển/thu phóng'}
        </span>
        {selectedStartRoomId && (
          <span className="px-2 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            📍 Điểm chọn: {objects.find(o => o.id === selectedStartRoomId)?.name}
          </span>
        )}
      </div>

      {/* Evacuation path active badge */}
      {evacuationActive && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/90 text-white text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-400">
          <ShieldCheck size={14} className="animate-bounce" />
          <span>
            {safePath?.mode === 'fallback'
              ? 'HƯỚNG TỚI VỊ TRÍ XA ĐÁM CHÁY'
              : safePath?.mode === 'mixed'
                ? 'CHỈ DẪN THOÁT HIỂM & VÙNG AN TOÀN'
                : 'ĐƯỜNG THOÁT HIỂM ĐANG HOẠT ĐỘNG'}
          </span>
        </div>
      )}

      {/* Floating Danger Sensors Panel (collapsible sidebar) */}
      <DangerSensorsPanel
        dangerSensors={dangerSensors}
        floors={floors}
        currentFloorId={sensors[0]?.floor_id || null}
        onSelectSensor={(sensor) => onSelectDangerSensor && onSelectDangerSensor(sensor)}
        isDark={isDark}
      />
    </div>
  );
}
export default FloorPlanViewer;
