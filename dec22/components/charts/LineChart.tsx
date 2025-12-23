import React, { useState, useMemo } from 'react';

interface DataPoint {
    x: string | number;
    y: number;
    y2?: number;
    [key: string]: any;
}

interface LineChartProps {
    data: DataPoint[];
    y1Label: string;
    y2Label?: string;
    y1Color?: string;
    y2Color?: string;
    yAxisLabel?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, y1Label, y2Label, y1Color = "#3b82f6", y2Color = "#8b5cf6", yAxisLabel = "Score %" }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, data: DataPoint } | null>(null);
    const width = 500;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 50 };

    const { xScale, yScale, points, points2 } = useMemo(() => {
        const xValues = data.map(d => d.x);
        const yMax = 100;

        const xScale = (index: number) => padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
        const yScale = (value: number) => height - padding.bottom - (value / yMax) * (height - padding.top - padding.bottom);

        const points = data.map((d, i) => `${xScale(i)},${yScale(d.y)}`).join(' ');
        const points2 = y2Label ? data.map((d, i) => `${xScale(i)},${yScale(d.y2 ?? 0)}`).join(' ') : '';
        
        return { xScale, yScale, points, points2 };
    }, [data, width, height, padding, y2Label]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        const index = Math.round((cursorPoint.x - padding.left) / (width - padding.left - padding.right) * (data.length - 1));

        if (index >= 0 && index < data.length) {
            const d = data[index];
            setTooltip({ x: xScale(index), y: yScale(d.y), data: d });
        }
    };

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)} className="w-full h-auto">
                {/* Y Axis */}
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="currentColor" className="text-light-border dark:text-dark-border" />
                {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                        <text x={padding.left - 8} y={yScale(val) + 3} textAnchor="end" className="text-xs fill-current text-light-subtle dark:text-dark-subtle">{val}</text>
                        <line x1={padding.left} x2={width - padding.right} y1={yScale(val)} y2={yScale(val)} strokeDasharray="2" className="stroke-current text-light-border dark:text-dark-border" />
                    </g>
                ))}
                <text transform={`translate(15, ${height/2}) rotate(-90)`} textAnchor="middle" className="text-xs fill-current font-semibold text-light-subtle dark:text-dark-subtle">{yAxisLabel}</text>
                
                {/* X Axis */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="currentColor" className="text-light-border dark:text-dark-border" />
                {data.map((d, i) => (
                    <text key={i} x={xScale(i)} y={height - padding.bottom + 15} textAnchor="middle" className="text-xs fill-current text-light-subtle dark:text-dark-subtle">{d.x}</text>
                ))}

                {/* Data Lines */}
                {y2Label && <polyline fill="none" stroke={y2Color} strokeWidth="2" points={points2} />}
                <polyline fill="none" stroke={y1Color} strokeWidth="2" points={points} />
                
                {/* Tooltip */}
                {tooltip && (
                    <g>
                        <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={height - padding.bottom} strokeDasharray="3" className="stroke-current text-light-subtle dark:text-dark-subtle" />
                        <circle cx={tooltip.x} cy={yScale(tooltip.data.y)} r="4" fill={y1Color} />
                        {y2Label && <circle cx={tooltip.x} cy={yScale(tooltip.data.y2 ?? 0)} r="4" fill={y2Color} />}
                    </g>
                )}
            </svg>
            {tooltip && (
                <div className="absolute p-3 bg-light-surface dark:bg-dark-surface shadow-lg rounded-lg pointer-events-none transition-transform duration-100 text-sm" style={{ left: tooltip.x + 10, top: tooltip.y - 60 }}>
                    <p className="font-bold">{tooltip.data.details.title}</p>
                    <p className="text-light-subtle dark:text-dark-subtle text-xs mb-2">{tooltip.data.x}</p>
                    <p style={{ color: y1Color }}><span className="font-semibold">{y1Label}:</span> {tooltip.data.details.studentScore}/{tooltip.data.details.maxMark} ({tooltip.data.y.toFixed(1)}%)</p>
                    {y2Label && <p style={{ color: y2Color }}><span className="font-semibold">{y2Label}:</span> {tooltip.data.details.classAverage.toFixed(1)}/{tooltip.data.details.maxMark} ({tooltip.data.y2?.toFixed(1)}%)</p>}
                </div>
            )}
            <div className="flex justify-center items-center space-x-4 mt-4 text-sm">
                <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: y1Color }}></div>{y1Label}</div>
                {y2Label && <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: y2Color }}></div>{y2Label}</div>}
            </div>
        </div>
    );
};

export default LineChart;
