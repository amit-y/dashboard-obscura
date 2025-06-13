"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import "./styles.scss";

const Start = () => {
  const router = useRouter();

  const startHandler = useCallback(() => router.push("/dashboard"), [router]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <h1 className="text-gray-900 font-bold text-xl">Dashboard Obscura</h1>
        <button
          className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow cursor-pointer"
          onClick={startHandler}
        >
          Get started
        </button>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center font-[family-name:var(--font-geist-mono)]">
        <span className="flex flex-col md:flex-row items-center gap-2 text-gray-600 text-xs">
          &copy; 2025. New Relic.
          <span>
            Built with{" "}
            <span role="img" aria-label="blood" title="blood">
              🩸{" "}
            </span>
            <span role="img" aria-label="sweat" title="sweat">
              💧{" "}
            </span>
            and{" "}
            <span role="img" aria-label="heart" title="heart">
              ❤️{" "}
            </span>
            by team Pied Piper
          </span>
        </span>
      </footer>
    </div>
  );
};

export default Start;
