import React from 'react';

interface BarData {
    label: string;
    value1: number;
    value2: number;
    max: number;
}

interface BarChartProps {
    data: BarData[];
    label1: string;
    label2: string;
    color1?: string;
    color2?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, label1, label2, color1 = "#3b82f6", color2 = "#a78bfa" }) => {
    const width = 500;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 50 };

    const yMax = Math.max(...data.map(d => d.max), 0) || 100;
    const barWidth = (width - padding.left - padding.right) / data.length * 0.8;
    const barGap = (width - padding.left - padding.right) / data.length * 0.2;

    const yScale = (value: number) => height - padding.bottom - (value / yMax) * (height - padding.top - padding.bottom);

    return (
        <div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y Axis */}
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="currentColor" className="text-light-border dark:text-dark-border" />
                {[0, 0.25, 0.5, 0.75, 1].map(val => (
                    <g key={val}>
                        <text x={padding.left - 8} y={yScale(val * yMax) + 3} textAnchor="end" className="text-xs fill-current text-light-subtle dark:text-dark-subtle">{val * yMax}</text>
                        <line x1={padding.left} x2={width - padding.right} y1={yScale(val * yMax)} y2={yScale(val * yMax)} strokeDasharray="2" className="stroke-current text-light-border dark:text-dark-border" />
                    </g>
                ))}
                
                {/* X Axis */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="currentColor" className="text-light-border dark:text-dark-border" />

                {/* Bars */}
                {data.map((d, i) => {
                    const x = padding.left + i * (barWidth + barGap) + barGap / 2;
                    return (
                        <g key={i} className="group">
                            <rect x={x} y={yScale(d.value2)} width={barWidth / 2} height={height - padding.bottom - yScale(d.value2)} fill={color2} rx="2" className="transition-opacity opacity-70 group-hover:opacity-100" />
                            <rect x={x + barWidth / 2} y={yScale(d.value1)} width={barWidth / 2} height={height - padding.bottom - yScale(d.value1)} fill={color1} rx="2" className="transition-opacity opacity-90 group-hover:opacity-100" />
                            <text x={x + barWidth / 2} y={height - padding.bottom + 15} textAnchor="middle" className="text-[10px] fill-current text-light-subtle dark:text-dark-subtle">{d.label}</text>
                            
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <text x={x + barWidth / 2} y={yScale(Math.max(d.value1, d.value2)) - 5} textAnchor="middle" className="text-xs font-bold fill-current text-light-text dark:text-dark-text">
                                    {d.label}: {d.value1}/{d.max} vs Avg: {d.value2.toFixed(1)}/{d.max}
                                </text>
                            </g>
                        </g>
                    );
                })}
            </svg>
            <div className="flex justify-center items-center space-x-4 mt-4 text-sm">
                <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color1 }}></div>{label1}</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color2 }}></div>{label2}</div>
            </div>
        </div>
    );
};

export default BarChart;
