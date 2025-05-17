"use client";

import { useCallback, useState } from "react";

import Spinner from "../spinner";

import "./styles.scss";

const Dashboard = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleKeyPress = useCallback(
    async (event) => {
      if (event.key === "Enter") {
        if (!message.trim()) return;
        setLoading(true);
        const response = await fetch("/api/dashboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });
        const json = await response?.json?.();
        if (json?.data?.length === 2 && json.data[1].role === "assistant") {
          let data;
          try {
            data = JSON.parse(json.data[1].content);
          } catch (e) {
            setLoading(false);
            console.error("Unable to parse response", e.message);
          }

          if (data?.visualizations?.length) {
            const nerdgraphResponse = await fetch("/api/nerdgraph", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ visualizations: data.visualizations }),
            });
            const nerdgraphJson = await nerdgraphResponse?.json?.();

            const nrData = nerdgraphJson?.json?.data?.actor || {};
            console.log("data", data, nrData);
            setLoading(false);
          } else {
            setLoading(false);
            console.warn("No visualizations returned!", data);
          }
        } else {
          setLoading(false);
          console.error("Unable to parse response", json);
        }
      }
    },
    [message],
  );

  return (
    <div className="h-dvh flex flex-col gap-16 p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="grow flex items-center justify-center scroll-smooth overflow-auto">
        {loading ? <Spinner /> : null}
      </div>
      <div className="mb-4">
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
