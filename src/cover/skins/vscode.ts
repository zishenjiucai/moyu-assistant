/**
 * 伪装二：VSCode。
 * 移植自 game 项目 BossKey.tsx 的 CodeCover：50 行合理的 TS 代码 + 伪语法高亮。
 * 标题栏按钮按当前系统区分（mac 交通灯 / Windows 右侧三键）。
 */
import type { Skin } from "../registry";

const CODE_LINES: string[] = [
  'import { fetchOrders, fetchTargets, type Order } from "./api/orders";',
  'import { formatMoney, quarterOf } from "./utils/format";',
  "",
  "const QUARTER = quarterOf(new Date());",
  "",
  "interface RegionReport {",
  "  region: string;",
  "  revenue: number;",
  "  target: number;",
  "  completion: number;",
  "  topCustomers: string[];",
  "}",
  "",
  "export async function buildQuarterReport(region: string): Promise<RegionReport> {",
  "  const [orders, targets] = await Promise.all([",
  "    fetchOrders({ region, quarter: QUARTER }),",
  "    fetchTargets(QUARTER),",
  "  ]);",
  "",
  '  const valid = orders.filter((o) => o.status !== "void");',
  "  const revenue = valid.reduce((sum, o) => sum + o.amount, 0);",
  "  const target = targets[region] ?? 0;",
  "",
  "  return {",
  "    region,",
  "    revenue,",
  "    target,",
  "    completion: target > 0 ? revenue / target : 1,",
  "    topCustomers: topCustomersOf(valid, 5),",
  "  };",
  "}",
  "",
  "function topCustomersOf(orders: Order[], n: number): string[] {",
  "  const byCustomer = new Map<string, number>();",
  "  for (const o of orders) {",
  "    byCustomer.set(o.customer, (byCustomer.get(o.customer) ?? 0) + o.amount);",
  "  }",
  "  return [...byCustomer.entries()]",
  "    .sort((a, b) => b[1] - a[1])",
  "    .slice(0, n)",
  "    .map(([name]) => name);",
  "}",
  "",
  "// 完成率低于 80% 的区域需要备注原因，随周报一起发出",
  "export function flagRegions(reports: RegionReport[]): RegionReport[] {",
  "  return reports",
  "    .filter((r) => r.completion < 0.8)",
  "    .sort((a, b) => a.completion - b.completion);",
  "}",
  "",
  "export function renderSummary(reports: RegionReport[]): string {",
  "  const total = reports.reduce((s, r) => s + r.revenue, 0);",
  "  const lines = reports.map(",
  '    (r) => `${r.region}: ${formatMoney(r.revenue)} (${Math.round(r.completion * 100)}%)`',
  "  );",
  '  return ["本季度总营收 " + formatMoney(total), ...lines].join("\\n");',
  "}",
];

/** 伪语法高亮：注释/字符串/关键字/控制流/数字/类型/函数调用 */
const TOKEN_RE =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|var|interface|type|as|new|async|await|readonly|default)\b|\b(return|if|else|for|of|void)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Z][A-Za-z0-9_]*)\b|([a-zA-Z_$][\w$]*)(?=\()/g;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(line: string): string {
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > last) out.push(esc(line.slice(last, m.index)));
    const cls = m[1]
      ? "tk-com"
      : m[2]
        ? "tk-str"
        : m[3]
          ? "tk-kw"
          : m[4]
            ? "tk-ctl"
            : m[5]
              ? "tk-num"
              : m[6]
                ? "tk-type"
                : "tk-fn";
    out.push(`<span class="${cls}">${esc(m[0])}</span>`);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(esc(line.slice(last)));
  return out.join("");
}

const ACTIVITY_ICONS: { d: string; active?: boolean }[] = [
  { d: "M4 2h6l3 3v9H4z M10 2v3h3", active: true },
  { d: "M7 7m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M10 10l3.5 3.5" },
  { d: "M4 4m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0 M4 6v5 M4 11m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0 M11 4m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0 M11 6c0 3-6 2-6 5" },
  { d: "M6 2l7 6-7 6z M13 3v10", active: false },
  { d: "M3 3h4v4H3z M9 3h4v4H9z M3 9h4v4H3z M9 9h4v4H9z" },
];

const ACTIVITY_BOTTOM: { d: string }[] = [
  { d: "M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z M8 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4" },
  { d: "M8 5a3 3 0 0 1 3 3v2l1.5 2h-9L5 10V8a3 3 0 0 1 3-3z" },
];

const FILE_TREE: { label: string; depth: number; chevron?: "down" | "right"; active?: boolean }[] = [
  { label: "MY-PROJECT", depth: 0, chevron: "down" },
  { label: "src", depth: 1, chevron: "down" },
  { label: "api", depth: 2, chevron: "down" },
  { label: "orders.ts", depth: 3 },
  { label: "utils", depth: 2, chevron: "down" },
  { label: "format.ts", depth: 3 },
  { label: "components", depth: 2, chevron: "right" },
  { label: "life.ts", depth: 2, active: true },
  { label: "sim.ts", depth: 2 },
  { label: "types.ts", depth: 2 },
  { label: "package.json", depth: 1 },
  { label: "tsconfig.json", depth: 1 },
  { label: "README.md", depth: 1 },
];

export const vscodeSkin: Skin = {
  id: "vscode",
  name: "VS Code",
  title: "life.ts - my-project - Visual Studio Code",
  desc: "TS 项目代码编辑器，带伪语法高亮",
  render(el) {
    const isMac = /mac/i.test(navigator.platform);
    const winControls = isMac
      ? `<span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>`
      : `<span class="wc">─</span><span class="wc">□</span><span class="wc close">✕</span>`;
    const codeHtml = CODE_LINES.map(
      (line, i) =>
        `<div class="line"><span class="ln num">${i + 1}</span><span class="code">${highlight(line)}</span></div>`
    ).join("");
    // minimap：确定性伪随机的微型代码条 + 视口指示
    const minimap = Array.from({ length: 46 }, (_, i) => {
      const w = 18 + ((i * 37) % 34);
      const indent = (i % 6) * 3;
      return `<i style="width:${w}%;margin-left:${indent}%"></i>`;
    }).join("");

    el.innerHTML = `
    <div class="mk-code num">
      <div class="vs-titlebar">
        <span class="traffic">${winControls}</span>
        <span class="vs-title">life.ts — my-project</span>
      </div>
      <div class="vs-main">
        <div class="vs-activity">
          ${ACTIVITY_ICONS.map(
            (ic) => `
          <span class="act ${ic.active ? "active" : ""}">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="${ic.d}" stroke="${ic.active ? "#ffffff" : "#858585"}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>`
          ).join("")}
          <span class="act-gap"></span>
          ${ACTIVITY_BOTTOM.map(
            (ic) => `
          <span class="act">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="${ic.d}" stroke="#858585" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>`
          ).join("")}
        </div>
        <div class="vs-sidebar">
          <p class="vs-side-head">资源管理器</p>
          ${FILE_TREE.map(
            (f) => `
          <div class="file ${f.active ? "active" : ""}" style="padding-left:${10 + f.depth * 12}px">
            ${f.chevron ? `<span class="chev">${f.chevron === "down" ? "⌄" : "›"}</span>` : ""}
            <span class="fname">${f.label}</span>
          </div>`
          ).join("")}
        </div>
        <div class="vs-editor">
          <div class="vs-tabs">
            <span class="tab active">life.ts <em>×</em></span>
            <span class="tab">sim.ts</span>
            <span class="tab">utils/format.ts</span>
          </div>
          <div class="vs-crumbs">src › life.ts › buildQuarterReport()</div>
          <div class="vs-codewrap">
            <div class="vs-code">${codeHtml}</div>
            <div class="vs-minimap">${minimap}<span class="viewport"></span></div>
          </div>
        </div>
      </div>
      <div class="vs-status">
        <span>⑂ main*</span>
        <span>⚠ 0  ✕ 0　　行 24, 列 8　　空格: 2 · UTF-8 · LF · TypeScript</span>
      </div>
    </div>`;
  },
};
