import React, { useState } from "react";

export function TimeSeriesChart({ data = [], height = 220, accentColor = "#6366f1" }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <div className="empty-state">No time-series click data available yet.</div>;
  }

  const width = 720;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 34;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxVal = Math.max(...data.map((d) => d.clicks), 4);

  const points = data.map((d, i) => {
    const x = padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = padTop + plotH - (d.clicks / maxVal) * plotH;
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${points[0].x},${padTop + plotH} ${polylinePoints} ${points[points.length - 1].x},${padTop + plotH}`;

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        <defs>
          <linearGradient id="pulseAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((step, idx) => {
          const y = padTop + plotH - step * plotH;
          const label = Math.round(step * maxVal);
          return (
            <g key={idx}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#1e293b" strokeDasharray="4 4" />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                {label}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill="url(#pulseAreaGrad)" />
        <polyline
          fill="none"
          stroke={accentColor}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {points.map((p, i) => {
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === i ? 6 : 3.5}
                fill={hoverIndex === i ? "#fff" : accentColor}
                stroke={accentColor}
                strokeWidth="2"
              />
              <rect x={p.x - 14} y={padTop} width="28" height={plotH} fill="transparent" />
              {showLabel && (
                <text x={p.x} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="10.5">
                  {p.date ? p.date.slice(5) : p.hour}
                </text>
              )}
            </g>
          );
        })}

        {hoverIndex !== null && points[hoverIndex] && (
          <g transform={`translate(${Math.min(Math.max(points[hoverIndex].x - 55, 10), width - 125)}, 6)`}>
            <rect width="110" height="36" rx="6" fill="#0f172a" stroke="#475569" />
            <text x="55" y="15" textAnchor="middle" fill="#cbd5e1" fontSize="10">
              {points[hoverIndex].date || points[hoverIndex].hour}
            </text>
            <text x="55" y="29" textAnchor="middle" fill="#fff" fontSize="11.5" fontWeight="bold">
              {points[hoverIndex].clicks} clicks
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function BreakdownList({ title, items = [], color = "#6366f1" }) {
  return (
    <div className="panel">
      <h4 className="panel-title">{title}</h4>
      {items.length === 0 ? (
        <p className="muted-text">No data recorded yet.</p>
      ) : (
        <div className="breakdown-list">
          {items.map((item) => (
            <div key={item.name} className="breakdown-item">
              <div className="breakdown-header">
                <span className="breakdown-name">{item.name}</span>
                <span className="breakdown-meta">
                  <strong>{item.count}</strong> ({item.percentage}%)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(item.percentage, 3)}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}