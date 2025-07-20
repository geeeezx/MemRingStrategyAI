import React from 'react';
import { getBezierPath } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: any;
  markerEnd?: any;
  data?: any;
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const { theme } = useTheme();
  
  // Determine if this is a suggestion/incomplete node
  const isSuggestion = data?.isSuggestion || false;
  
  // Get edge color based on theme
  const edgeColor = theme === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.6)';
  
  // Get stroke dash array based on node type
  const strokeDasharray = isSuggestion ? '5,5' : 'none';
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  console.log('CustomEdge path:', { id, edgePath, sourceX, sourceY, targetX, targetY, edgeColor });

  return (
    <g>
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M 0 0 L 0 6 L 6 3 z"
            fill={edgeColor}
          />
        </marker>
      </defs>
      <path
        d={edgePath}
        stroke={edgeColor}
        strokeWidth="3"
        strokeDasharray={strokeDasharray}
        fill="none"
        markerEnd={`url(#arrow-${id})`}
        style={{ opacity: 1 }}
      />
    </g>
  );
};

export default CustomEdge; 