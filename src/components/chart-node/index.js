import { useMemo } from "react";

import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { LinePath, Bar as VisxBar, Pie } from "@visx/shape";
import { scaleLinear, scaleBand, scaleOrdinal, scaleTime } from "@visx/scale";

const width = 180;
const height = 100;
const margin = { top: 10, bottom: 20, left: 30, right: 10 };

const ChartNode = ({ data: viz }) => {
  const content = useMemo(() => {
    if (!viz.data) return null;
    const { type } = viz;

    if (type === "LINE") {
      const data = viz.data.map(
        ({ beginTimeSeconds, endTimeSeconds, ...chartData }) => ({
          x: ((beginTimeSeconds + endTimeSeconds) / 2) * 1000,
          y: chartData[Object.keys(chartData)?.[0]] || 0,
        }),
      );
      const xExtent = [
        Math.min(...data.map((d) => d.x)),
        Math.max(...data.map((d) => d.x)),
      ];
      const yExtent = [
        Math.min(...data.map((d) => d.y)),
        Math.max(...data.map((d) => d.y)),
      ];
      const xScale = scaleTime({
        domain: xExtent,
        range: [0, width - margin.left - margin.right],
      });
      const yScale = scaleLinear({
        domain: yExtent,
        range: [height - margin.top - margin.bottom, 0],
      });

      return (
        <svg width={width} height={height}>
          <Group top={margin.top} left={margin.left}>
            <LinePath
              data={data}
              x={(d) => xScale(d.x)}
              y={(d) => yScale(d.y)}
              stroke="#222"
              strokeWidth={2}
            />
            <AxisBottom
              scale={xScale}
              top={height - margin.top - margin.bottom}
            />
            <AxisLeft scale={yScale} />
          </Group>
        </svg>
      );
    } else if (type === "BAR") {
      const data = viz.data.map(({ facet, ...chartData }) => {
        const cols = Object.keys(chartData);
        const colToUse = cols?.find(
          (col) => typeof chartData[col] === "number",
        );
        return { facet, y: colToUse ? chartData[colToUse] : 0 };
      });
      const facets = data.map((d) => d.facet);
      const xScale = scaleBand({
        domain: facets,
        range: [0, width - margin.left - margin.right],
        padding: 0.1,
      });
      const yMax = Math.max(...data.map((d) => d.y));
      const yScale = scaleLinear({
        domain: [0, yMax],
        range: [height - margin.top - margin.bottom, 0],
      });

      return (
        <svg width={width} height={height}>
          <Group top={margin.top} left={margin.left}>
            {data.map((d, i) => (
              <VisxBar
                key={i}
                x={xScale(d.facet)}
                y={yScale(d.y)}
                width={xScale.bandwidth()}
                height={height - margin.top - margin.bottom - yScale(d.y)}
              />
            ))}
            <AxisBottom
              scale={xScale}
              top={height - margin.top - margin.bottom}
            />
            <AxisLeft scale={yScale} />
          </Group>
        </svg>
      );
    } else if (type === "PIE") {
      const data = viz.data.map(({ facet, ...chartData }) => {
        const cols = Object.keys(chartData);
        const colToUse = cols?.find(
          (col) => typeof chartData[col] === "number",
        );
        return { label: facet, value: colToUse ? chartData[colToUse] : 0 };
      });
      const radius = Math.min(width, height) / 2 - 10;
      const colorScale = scaleOrdinal({
        domain: data.map((d) => d.label),
        range: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99"],
      });

      return (
        <svg width={width} height={height}>
          <Group top={height / 2} left={width / 2}>
            <Pie
              data={data}
              pieValue={(d) => d.value}
              outerRadius={radius}
              cornerRadius={3}
              padAngle={0.02}
            >
              {(pie) =>
                pie.arcs.map((arc) => (
                  <path
                    key={arc.data.label}
                    d={pie.path(arc)}
                    fill={colorScale(arc.data.label)}
                  />
                ))
              }
            </Pie>
          </Group>
        </svg>
      );
    } else if (type === "BILLBOARD") {
      const [res] = viz.data || [];
      const cols = Object.keys(res);
      const display = cols.length ? res[cols[0]] : "";
      return (
        <div className="font-[family-name:var(--font-geist-mono)] font-bold text-4xl">
          {display}
        </div>
      );
    }

    return null;
  }, [viz]);

  return (
    <div className="w-3xs font-[family-name:var(--font-geist-sans)] p-8 rounded-sm bg-white text-center">
      <div className="font-bold text-xl mb-5">{viz.title}</div>
      {content}
    </div>
  );
};

export default ChartNode;
