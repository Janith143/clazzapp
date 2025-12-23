import React from 'react';

interface RadarData {
    subject: string;
    score: number; // Percentage
}

interface RadarChartProps {
    data: RadarData[];
    size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, size = 300 }) => {
    if (data.length < 3) return <div className="text-center p-4 text-light-subtle dark:text-dark-subtle">Need at least 3 subjects to draw a radar chart.</div>;

    const center = size / 2;
    const radius = size * 0.4;
    const numLevels = 4; // 25, 50, 75, 100

    const angleSlice = (Math.PI * 2) / data.length;

    const points = data.map((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = radius * (d.score / 100);
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');

    const axis = data.map((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return {
            x1: center,
            y1: center,
            x2: center + radius * Math.cos(angle),
            y2: center + radius * Math.sin(angle),
        };
    });

    const labels = data.map((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const labelRadius = radius * 1.1;
        return {
            x: center + labelRadius * Math.cos(angle),
            y: center + labelRadius * Math.sin(angle),
            label: d.subject,
        };
    });

    const levels = Array.from({ length: numLevels }, (_, i) => {
        const levelRadius = radius * ((i + 1) / numLevels);
        const levelPoints = data.map((d, j) => {
            const angle = angleSlice * j - Math.PI / 2;
            return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
        }).join(' ');
        return levelPoints;
    });

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto h-auto">
            {/* Levels and Axes */}
            <g className="text-light-border dark:text-dark-border">
                {levels.map((levelPoints, i) => (
                    <polygon key={i} points={levelPoints} fill="none" stroke="currentColor" strokeWidth="0.5" />
                ))}
                {axis.map((line, i) => (
                    <line key={i} {...line} stroke="currentColor" strokeWidth="0.5" />
                ))}
            </g>

            {/* Labels */}
            {labels.map((l, i) => (
                <text key={i} x={l.x} y={l.y} textAnchor={l.x > center ? 'start' : (l.x < center ? 'end' : 'middle')} dominantBaseline="middle" className="text-xs font-semibold fill-current text-light-subtle dark:text-dark-subtle">
                    {l.label}
                </text>
            ))}

            {/* Data Shape */}
            <g>
                <polygon points={points} fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" strokeWidth="2" />
                {data.map((d, i) => {
                    const point = points.split(' ')[i].split(',');
                    return <circle key={i} cx={parseFloat(point[0])} cy={parseFloat(point[1])} r="3" fill="#3b82f6" />;
                })}
            </g>
        </svg>
    );
};

export default RadarChart;
