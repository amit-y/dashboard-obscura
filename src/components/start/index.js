import "./styles.scss";

const Start = () => {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        Hello, world!
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center font-[family-name:var(--font-geist-mono)]">
        <span className="flex items-center gap-2 text-xs">
          &copy; 2025. New Relic. Built with
          <span role="img" aria-label="blood" title="blood">
            🩸
          </span>
          <span role="img" aria-label="sweat" title="sweat">
            💧
          </span>{" "}
          and
          <span role="img" aria-label="heart" title="heart">
            ❤️
          </span>{" "}
          by team Pied Piper
        </span>
      </footer>
    </div>
  );
};

export default Start;
