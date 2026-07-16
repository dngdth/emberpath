import { Circle, Line } from 'react-konva';

interface StairsSymbolProps {
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth?: number;
  isDashed?: boolean;
}

export function StairsSymbol({
  width,
  height,
  strokeColor,
  strokeWidth = 1.5,
  isDashed = false,
}: StairsSymbolProps) {
  const landingHeight = height * 0.15;
  const flightHeight = height - landingHeight;

  const c1Left = 0;
  const c1Right = width * 0.3;
  const c2Left = width * 0.35;
  const c2Right = width * 0.65;
  const c3Left = width * 0.7;
  const c3Right = width;

  const numSteps = 7;
  const stepElements: JSX.Element[] = [];
  const dashProp = isDashed ? [4, 4] : undefined;

  for (let i = 0; i <= numSteps; i++) {
    const yPos = landingHeight + (flightHeight * i) / (numSteps + 1);
    stepElements.push(
      <Line
        key={`step-l-${i}`}
        points={[c1Left, yPos, c1Right, yPos]}
        stroke={strokeColor}
        strokeWidth={1}
        dash={dashProp}
        listening={false}
      />,
      <Line
        key={`step-m-${i}`}
        points={[c2Left, yPos, c2Right, yPos]}
        stroke={strokeColor}
        strokeWidth={1}
        dash={dashProp}
        listening={false}
      />,
      <Line
        key={`step-r-${i}`}
        points={[c3Left, yPos, c3Right, yPos]}
        stroke={strokeColor}
        strokeWidth={1}
        dash={dashProp}
        listening={false}
      />
    );
  }

  // Vertical boundary lines
  stepElements.push(
    <Line
      key="wall-l-r"
      points={[c1Right, landingHeight, c1Right, height]}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      dash={dashProp}
      listening={false}
    />,
    <Line
      key="wall-m-l"
      points={[c2Left, landingHeight, c2Left, height]}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      dash={dashProp}
      listening={false}
    />,
    <Line
      key="wall-m-r"
      points={[c2Right, landingHeight, c2Right, height]}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      dash={dashProp}
      listening={false}
    />,
    <Line
      key="wall-r-l"
      points={[c3Left, landingHeight, c3Left, height]}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      dash={dashProp}
      listening={false}
    />
  );

  // Landing horizontal divider
  stepElements.push(
    <Line
      key="landing-line"
      points={[0, landingHeight, width, landingHeight]}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      dash={dashProp}
      listening={false}
    />
  );

  // Arrows
  const leftArrowX = width * 0.15;
  const rightArrowX = width * 0.85;
  const midArrowX = width * 0.5;
  const arrowYTop = landingHeight * 0.5;

  // Start circles
  stepElements.push(
    <Circle
      key="circle-l"
      x={leftArrowX}
      y={height - 6}
      radius={2.5}
      fill={strokeColor}
      listening={false}
    />,
    <Circle
      key="circle-r"
      x={rightArrowX}
      y={height - 6}
      radius={2.5}
      fill={strokeColor}
      listening={false}
    />
  );

  // Paths
  stepElements.push(
    <Line
      key="arrow-path-l"
      points={[leftArrowX, height - 6, leftArrowX, arrowYTop, midArrowX, arrowYTop, midArrowX, height - 12]}
      stroke={strokeColor}
      strokeWidth={1.2}
      dash={dashProp}
      listening={false}
    />,
    <Line
      key="arrow-path-r"
      points={[rightArrowX, height - 6, rightArrowX, arrowYTop, midArrowX, arrowYTop]}
      stroke={strokeColor}
      strokeWidth={1.2}
      dash={dashProp}
      listening={false}
    />
  );

  // Arrowhead (downward at middle bottom)
  stepElements.push(
    <Line
      key="arrowhead"
      points={[midArrowX - 3.5, height - 16, midArrowX, height - 10, midArrowX + 3.5, height - 16]}
      stroke={strokeColor}
      strokeWidth={1.5}
      dash={dashProp}
      listening={false}
    />
  );

  return <>{stepElements}</>;
}
