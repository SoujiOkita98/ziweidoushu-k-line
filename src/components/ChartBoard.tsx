import type { Palace, ZiweiChart } from "@/lib/types";

const chipClass = (tone: "main" | "sub" | "transform") => {
  if (tone === "main") return "text-purple-700";
  if (tone === "sub") return "text-sky-700";
  return "text-rose-700";
};

const PalaceCell = ({ palace }: { palace: Palace }) => {
  return (
    <div className="flex h-full flex-col gap-1 p-2 text-[11px] leading-snug">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{palace.name}</span>
        {palace.decadeRange ? (
          <span className="text-[10px] text-ink/50">{palace.decadeRange}</span>
        ) : null}
      </div>

      <div className="min-h-[16px] font-semibold">
        {palace.mainStars.length > 0 ? (
          <span className={chipClass("main")}>{palace.mainStars.join(" ")}</span>
        ) : (
          <span className="text-ink/20">&nbsp;</span>
        )}
      </div>

      <div className="min-h-[14px] text-[10px]">
        {palace.subStars.length > 0 ? (
          <span className={chipClass("sub")}>{palace.subStars.join(" ")}</span>
        ) : (
          <span className="text-ink/20">&nbsp;</span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-x-2 gap-y-1 text-[10px]">
        {palace.transforms.length > 0 ? (
          palace.transforms.map((tag) => (
            <span
              key={`${palace.name}-${tag}`}
              className={chipClass("transform")}
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-ink/20">&nbsp;</span>
        )}
      </div>
    </div>
  );
};

export default function ChartBoard({ chart }: { chart: ZiweiChart }) {
  const palacesByName = new Map(chart.palaces.map((p) => [p.name, p]));
  const colStart = [
    "",
    "col-start-1",
    "col-start-2",
    "col-start-3",
    "col-start-4"
  ];
  const rowStart = [
    "",
    "row-start-1",
    "row-start-2",
    "row-start-3",
    "row-start-4"
  ];

  // 固定 4x4 盘面布局，保持专业排版密度
  const layout = [
    { type: "palace", name: "父母", col: 1, row: 1 },
    { type: "palace", name: "福德", col: 2, row: 1 },
    { type: "palace", name: "田宅", col: 3, row: 1 },
    { type: "palace", name: "官禄", col: 4, row: 1 },
    { type: "palace", name: "兄弟", col: 1, row: 2 },
    { type: "palace", name: "交友", col: 4, row: 2 },
    { type: "palace", name: "夫妻", col: 1, row: 3 },
    { type: "palace", name: "迁移", col: 4, row: 3 },
    { type: "palace", name: "子女", col: 1, row: 4 },
    { type: "palace", name: "财帛", col: 2, row: 4 },
    { type: "palace", name: "疾厄", col: 3, row: 4 },
    { type: "palace", name: "命宫", col: 4, row: 4 },
    { type: "center", col: 2, row: 2, colSpan: 2, rowSpan: 2 }
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white/90 shadow-panel">
      <div className="grid grid-cols-4 grid-rows-4 gap-0">
      {layout.map((cell) => {
        if (cell.type === "center") {
          return (
            <div
              key="center"
              className={`${colStart[cell.col]} ${rowStart[cell.row]} col-span-2 row-span-2 flex h-full flex-col justify-between border border-ink/10 bg-[radial-gradient(circle_at_top,_rgba(176,138,74,0.10),_transparent_60%)] p-3 text-xs`}
            >
              <div className="text-sm font-semibold text-ink">
                基本信息
              </div>
              <div className="space-y-1 text-[11px] text-ink/80">
                <div>阳历: {chart.center.solarDate ?? "—"}</div>
                <div>阴历: {chart.center.lunarDate ?? "—"}</div>
                <div>时间: {chart.center.time}</div>
                <div>性别: {chart.center.gender === "male" ? "男" : "女"}</div>
                <div>命宫: {chart.center.fatePalace ?? "—"}</div>
                <div>身宫: {chart.center.bodyPalace ?? "—"}</div>
              </div>
              <div className="text-[10px] text-ink/60">
                四化: {chart.center.fourTransforms?.join(" ") ?? "—"}
              </div>
            </div>
          );
        }

        const palace = palacesByName.get(cell.name) ?? {
          name: cell.name,
          mainStars: [],
          subStars: [],
          transforms: []
        };

        return (
          <div
            key={cell.name}
            className={`${colStart[cell.col]} ${rowStart[cell.row]} border border-ink/10`}
          >
            <PalaceCell palace={palace} />
          </div>
        );
      })}
      </div>
    </div>
  );
}
