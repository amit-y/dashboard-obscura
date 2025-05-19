"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";

import MessageBar from "../message-bar";
import ChartNode from "../chart-node";
import Spinner from "../spinner";

import "./styles.scss";
import "@xyflow/react/dist/style.css";

const cols = 3;
const horizontalSpacing = 250;
const verticalSpacing = 200;

const Dashboard = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseMessages, setResponseMessages] = useState([]);
  const [data, setData] = useState({});
  const [flowRect, setFlowRect] = useState({ height: 0, width: 0 });
  const [nodes, setNodes] = useState([]);
  const [edges] = useState([]);
  const flowRef = useRef(null);
  const flowSizeRef = useRef({ height: -1, width: -1 });

  useEffect(() => {
    if (!flowRef.current) return;

    const observer = new ResizeObserver(
      ([{ contentRect: { height, width } = {} }] = [{}]) => {
        if (
          height !== flowSizeRef.current.height ||
          width !== flowSizeRef.current.width
        ) {
          flowSizeRef.current = { height, width };
          setFlowRect({ height, width });
        }
      },
    );

    observer.observe(flowRef.current);
    return () => observer?.unobserve(flowRef.current);
  }, []);

  const handleKeyPress = useCallback(
    async (event) => {
      if (event.key === "Enter") {
        if (!message.trim()) return;
        setLoading(true);
        setResponseMessages([]);
        setData({});
        const response = await fetch("/api/dashboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });
        const json = await response?.json?.();
        if (json?.data?.length === 2 && json.data[1].role === "assistant") {
          let vizData;
          try {
            vizData = JSON.parse(json.data[1].content);
          } catch (e) {
            setLoading(false);
            console.error("Unable to parse response", e.message);
          }

          const { relations, visualizations } = vizData || {};
          if (visualizations?.length) {
            const nerdgraphResponse = await fetch("/api/nerdgraph", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ visualizations }),
            });
            const nerdgraphJson = await nerdgraphResponse?.json?.();

            const nrData = nerdgraphJson?.json?.data?.actor || {};
            setData(() => ({
              relations,
              visualizations: visualizations.map((viz, i) => ({
                ...viz,
                data: nrData[`v${i}`]?.results || [],
              })),
            }));
            setLoading(false);
          } else {
            setLoading(false);
            console.warn("No visualizations returned!", vizData);
            const responseObjects = Object.keys(vizData);
            if (responseObjects.length)
              setResponseMessages(() =>
                responseObjects.reduce(
                  (acc, key) => [...acc, { key, response: vizData[key] }],
                  [],
                ),
              );
          }
        } else {
          setLoading(false);
          console.error("Unable to parse response", json);
        }
      }
    },
    [message],
  );

  useEffect(
    () =>
      setNodes(
        () =>
          data.visualizations?.map((viz, i) => ({
            id: viz.id,
            type: "chartNode",
            data: viz,
            position: {
              x:
                (i % cols) * horizontalSpacing -
                (Math.floor(Math.random() * 10) + 1) * 10,
              y:
                Math.floor(i / cols) * verticalSpacing -
                (Math.floor(Math.random() * 10) + 1) * 10,
            },
          })) || [],
      ),
    [data],
  );

  const nodeTypes = useMemo(() => ({ chartNode: ChartNode }), []);

  return (
    <div className="h-dvh flex flex-col p-8 font-[family-name:var(--font-geist-sans)]">
      <div
        className="grow flex items-center justify-center scroll-smooth overflow-auto"
        ref={flowRef}
      >
        {loading ? <Spinner /> : null}
        {responseMessages.map(({ key, response }) => (
          <MessageBar key={key} id={key} message={response} />
        ))}
        {Object.keys(data)?.length ? (
          <div style={flowRect}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        ) : null}
      </div>
      <div className="mb-8">
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="message"
          type="text"
          placeholder="Describe dashboard you would like to build..."
          value={message}
          onChange={({ target: { value } = {} } = {}) =>
            setMessage(value || "")
          }
          onKeyDown={handleKeyPress}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
