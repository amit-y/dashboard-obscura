import { useMemo } from "react";

import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { LinePath, Bar, Pie } from "@visx/shape";
import { scaleLinear, scaleBand, scaleOrdinal, scaleTime } from "@visx/scale";
import { curveNatural } from "@visx/curve";
import {
  GradientDarkgreenGreen,
  GradientLightgreenGreen,
  GradientOrangeRed,
  GradientPinkBlue,
  GradientPinkRed,
  GradientPurpleOrange,
  GradientPurpleRed,
  GradientTealBlue,
  RadialGradient,
  LinearGradient,
} from "@visx/gradient";

const margin = { top: 10, bottom: 30, left: 30, right: 10 };

const gradients = [
  GradientPinkRed,
  ({ id }) => <RadialGradient id={id} from="#55bdd5" to="#4f3681" r="80%" />,
  GradientOrangeRed,
  GradientPinkBlue,
  ({ id }) => (
    <LinearGradient id={id} from="#351CAB" to="#621A61" rotate="-45" />
  ),
  GradientLightgreenGreen,
  GradientPurpleOrange,
  GradientTealBlue,
  GradientPurpleRed,
  GradientDarkgreenGreen,
];

const ChartNode = ({ data: viz, width, height }) => {
  const content = useMemo(() => {
    if (!viz.data) return null;
    const { type } = viz;

    if (type === "LINE") {
      const data = viz.data.map(
        ({ beginTimeSeconds, endTimeSeconds, ...chartData }) => {
          let y;
          if (chartData.score) {
            y = chartData.score;
          } else {
            const cols = Object.keys(chartData);
            if (!cols.length) {
              y = 0;
            } else if (cols.length === 1) {
              y =
                typeof chartData[cols[0]] === "number" ? chartData[cols[0]] : 0;
            } else {
              if (cols.includes("score")) {
                y = chartData.score;
              } else {
                const colToUse = cols?.find(
                  (col) => typeof chartData[col] === "number",
                );
                y = colToUse ? chartData[colToUse] : 0;
              }
            }
          }

          return {
            x: ((beginTimeSeconds + endTimeSeconds) / 2) * 1000,
            y,
          };
        },
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

      const Gradient = gradients[viz.index];

      return (
        <svg width={width} height={height}>
          <Group top={margin.top} left={margin.left}>
            <Gradient id={viz.id} />
            <LinePath
              data={data}
              x={(d) => xScale(d.x)}
              y={(d) => yScale(d.y)}
              curve={curveNatural}
              stroke={`url(#${viz.id})`}
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
          {gradients.map((Gradient, i) => {
            const key = `g${i}`;
            return <Gradient key={key} id={key} />;
          })}
          <Group top={margin.top} left={margin.left + 20}>
            {data.map((d, i) => (
              <Bar
                key={i}
                x={xScale(d.facet)}
                y={yScale(d.y)}
                width={xScale.bandwidth()}
                height={height - margin.top - margin.bottom - yScale(d.y)}
                fill={`url(#g${i})`}
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
        range: [
          "rgba(255,255,255,0.9)",
          "rgba(255,255,255,0.8)",
          "rgba(255,255,255,0.7)",
          "rgba(255,255,255,0.6)",
          "rgba(255,255,255,0.5)",
          "rgba(255,255,255,0.4)",
          "rgba(255,255,255,0.3)",
          "rgba(255,255,255,0.2)",
          "rgba(255,255,255,0.1)",
        ],
      });

      const Gradient = gradients[viz.index];

      return (
        <svg width={width} height={height}>
          <Gradient id={viz.id} />
          <rect
            rx={14}
            width={width}
            height={height}
            fill={`url(#${viz.id})`}
          />
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
    <div className="w-full h-full items-center font-[family-name:var(--font-geist-sans)] p-8 rounded-sm bg-white bg-opacity-60 text-center">
      <div className="font-bold text-xl mb-5">{viz.title}</div>
      {content}
    </div>
  );
};

export default ChartNode;
