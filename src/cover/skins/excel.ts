/**
 * 伪装一：Excel（Windows Excel 365 风格完整仿真）。
 * 结构：标题栏（快速访问+窗口按钮）→ 功能选项卡 → 多分组功能区 → 名称框/编辑栏
 * → 表格（选中单元格 H12 + 行列高亮 + 批注角标）→ 工作表标签 → 状态栏（统计+缩放）。
 * 数据与合计全部实时计算，保持内部自洽。
 */
import type { Skin } from "../registry";

type SalesRow = {
  id: string;
  date: string;
  customer: string;
  product: string;
  qty: number;
  price: number;
  owner: string;
  region: string;
  status: string;
};

const SALES_ROWS: SalesRow[] = [
  { id: "SO-26031", date: "7月1日", customer: "华信集团", product: "企业版授权", qty: 12, price: 8600, owner: "陈晓", region: "华东", status: "已回款" },
  { id: "SO-26032", date: "7月3日", customer: "启明传媒", product: "增值服务包", qty: 30, price: 1200, owner: "李墨", region: "华北", status: "已回款" },
  { id: "SO-26033", date: "7月5日", customer: "恒诺科技", product: "定制开发", qty: 1, price: 186000, owner: "王一舟", region: "华东", status: "已发货" },
  { id: "SO-26034", date: "7月8日", customer: "蓝湾文旅", product: "硬件终端", qty: 45, price: 2350, owner: "赵倩", region: "华南", status: "待回款" },
  { id: "SO-26035", date: "7月11日", customer: "中科慧联", product: "年度维保", qty: 3, price: 42800, owner: "陈晓", region: "华北", status: "已回款" },
  { id: "SO-26036", date: "7月15日", customer: "盛世广告", product: "数据服务", qty: 8, price: 9800, owner: "孙立", region: "华东", status: "已开票" },
  { id: "SO-26037", date: "7月18日", customer: "云图网络", product: "企业版授权", qty: 20, price: 8600, owner: "周雯", region: "西南", status: "已回款" },
  { id: "SO-26038", date: "7月22日", customer: "瑞和实业", product: "硬件终端", qty: 60, price: 2350, owner: "郑北", region: "华北", status: "已发货" },
  { id: "SO-26039", date: "7月25日", customer: "三禾商贸", product: "增值服务包", qty: 15, price: 1200, owner: "李墨", region: "华中", status: "已回款" },
  { id: "SO-26040", date: "7月29日", customer: "光谷电子", product: "定制开发", qty: 1, price: 142000, owner: "王一舟", region: "华中", status: "待回款" },
  { id: "SO-26041", date: "8月2日", customer: "泓远物流", product: "硬件终端", qty: 80, price: 2350, owner: "赵倩", region: "华南", status: "已回款" },
  { id: "SO-26042", date: "8月5日", customer: "天启教育", product: "企业版授权", qty: 10, price: 8600, owner: "孙立", region: "华东", status: "已开票" },
  { id: "SO-26043", date: "8月9日", customer: "汇金投资", product: "数据服务", qty: 5, price: 9800, owner: "周雯", region: "华北", status: "已回款" },
  { id: "SO-26044", date: "8月12日", customer: "帆顺制造", product: "年度维保", qty: 2, price: 42800, owner: "郑北", region: "东北", status: "待回款" },
  { id: "SO-26045", date: "8月16日", customer: "极光软件", product: "企业版授权", qty: 25, price: 8600, owner: "陈晓", region: "华东", status: "已回款" },
  { id: "SO-26046", date: "8月19日", customer: "泰和医药", product: "增值服务包", qty: 40, price: 1200, owner: "李墨", region: "华北", status: "已发货" },
  { id: "SO-26047", date: "8月23日", customer: "沃野农业", product: "硬件终端", qty: 35, price: 2350, owner: "赵倩", region: "西南", status: "已回款" },
  { id: "SO-26048", date: "8月26日", customer: "拓维智造", product: "定制开发", qty: 1, price: 210000, owner: "王一舟", region: "华东", status: "已开票" },
  { id: "SO-26049", date: "9月1日", customer: "星辰影视", product: "数据服务", qty: 6, price: 9800, owner: "孙立", region: "华东", status: "已回款" },
  { id: "SO-26050", date: "9月4日", customer: "京原贸易", product: "企业版授权", qty: 18, price: 8600, owner: "周雯", region: "华北", status: "待回款" },
  { id: "SO-26051", date: "9月9日", customer: "恒诺科技", product: "年度维保", qty: 1, price: 42800, owner: "郑北", region: "华东", status: "已回款" },
  { id: "SO-26052", date: "9月13日", customer: "蓝湾文旅", product: "增值服务包", qty: 22, price: 1200, owner: "李墨", region: "华南", status: "已回款" },
  { id: "SO-26053", date: "9月18日", customer: "华信集团", product: "硬件终端", qty: 50, price: 2350, owner: "陈晓", region: "华东", status: "已发货" },
  { id: "SO-26054", date: "9月24日", customer: "极光软件", product: "数据服务", qty: 4, price: 9800, owner: "周雯", region: "华东", status: "已开票" },
];

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const FIELDS = ["订单编号", "日期", "客户名称", "产品类型", "数量", "单价", "金额", "负责人", "区域", "状态"];
const STATUS_CLS: Record<string, string> = {
  已回款: "st-paid",
  待回款: "st-due",
  已发货: "st-ship",
  已开票: "st-invoiced",
};

/** 选中单元格：G 列（金额）第 12 行 */
const SEL_ROW = 12; // 工作表行号（表头为第 1 行）
const SEL_COL = 6; // G 列索引
const isMac = /mac/i.test(navigator.platform);

function winControls(): string {
  return isMac
    ? `<span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>`
    : `<span class="wc">─</span><span class="wc">▢</span><span class="wc close">✕</span>`;
}

function fmt(n: number): string {
  return n.toLocaleString("zh-CN");
}

export const excelSkin: Skin = {
  id: "excel",
  name: "Excel 表格",
  title: "2026Q3经营分析.xlsx - Excel",
  desc: "销售数据明细表，带实时合计与状态栏",
  render(el) {
    const total = SALES_ROWS.reduce((s, r) => s + r.qty * r.price, 0);
    const qtyTotal = SALES_ROWS.reduce((s, r) => s + r.qty, 0);
    const avg = Math.round(total / SALES_ROWS.length);
    const sel = SALES_ROWS[SEL_ROW - 2]; // 第 12 行 → 数据下标 10
    const selAmount = sel.qty * sel.price;

    // 表头行(1) + 选中行之前的行数
    const dataRows = SALES_ROWS.map((r, i) => {
      const rowNo = i + 2;
      const selRow = rowNo === SEL_ROW ? " hl-row" : "";
      const c = (idx: number, extra: string, content: string) =>
        `<td class="td ${extra}${rowNo === SEL_ROW && idx === SEL_COL ? " sel" : ""}">${content}</td>`;
      return `
      <tr class="${i % 2 ? "odd" : ""}">
        <td class="idx${selRow}">${rowNo}</td>
        ${c(0, "num", r.id)}
        ${c(1, "", r.date)}
        ${c(2, "", r.customer)}
        ${c(3, "", r.product)}
        ${c(4, "num right", String(r.qty))}
        ${c(5, "num right", fmt(r.price))}
        ${c(6, "num right bold", fmt(r.qty * r.price))}
        ${c(7, "", r.owner)}
        ${c(8, "", r.region)}
        ${c(9, `num ${STATUS_CLS[r.status] ?? ""}`, r.status)}
      </tr>`;
    }).join("");

    const colHeaders = COLS.map(
      (c, i) => `<th class="colh${i === SEL_COL ? " hl" : ""}">${c}</th>`
    ).join("");

    el.innerHTML = `
    <div class="mk-sheet">
      <div class="xl-titlebar">
        <span class="qat">
          <svg width="13" height="13" viewBox="0 0 16 16"><path d="M3 1h8l3 3v11H3z" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M5 7h6M5 10h6" stroke="#fff" stroke-width="1.3"/></svg>
          <span class="undo">↩</span><span class="undo">↪</span>
        </span>
        <span class="xl-title">2026Q3经营分析.xlsx - Excel</span>
        <span class="xl-search">🔍 <i>搜索</i></span>
        <span class="xl-account">销</span>
        <span class="winbtns">${winControls()}</span>
      </div>      <div class="xl-tabs">
        <span class="file">文件</span>
        <span class="active">开始</span><span>插入</span><span>页面布局</span><span>公式</span><span>数据</span><span>审阅</span><span>视图</span><span>帮助</span>
        <span class="tell-me">🔍 告诉我</span>
      </div>
      <div class="xl-ribbon">
        <div class="rb-group">
          <button class="rb-big"><svg width="26" height="26" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="11" rx="1" fill="none" stroke="#5a5a5a" stroke-width="1.2"/><path d="M5 3V1h6v2" fill="none" stroke="#5a5a5a" stroke-width="1.2"/><path d="M5 8h6M5 11h4" stroke="#217346" stroke-width="1.4"/></svg><b>粘贴</b></button>
          <div class="rb-col">
            <span class="rb-mini">✂ 剪切</span>
            <span class="rb-mini">⧉ 复制</span>
            <span class="rb-mini">▦ 格式刷</span>
          </div>
          <i class="rb-label">剪贴板</i>
        </div>
        <div class="rb-group">
          <div class="rb-col2">
            <div class="rb-row"><span class="dd wide">Calibri</span><span class="dd">11</span><span class="dd">A¹▾</span></div>
            <div class="rb-row">
              <b class="bi">B</b><i class="bi it">I</i><u class="bi">U</u><span class="bi ab">A</span>
              <span class="dd">田▾</span><span class="dd">🛢▾</span>
            </div>
          </div>
          <i class="rb-label">字体</i>
        </div>
        <div class="rb-group">
          <div class="rb-col2">
            <div class="rb-row"><span class="dd">≡上</span><span class="dd">≡中</span><span class="dd">≡下</span><span class="dd">⊞</span></div>
            <div class="rb-row"><span class="dd">⯇</span><span class="dd">≡</span><span class="dd">⯈</span><span class="dd">⮐ 自动换行</span></div>
          </div>
          <i class="rb-label">对齐方式</i>
        </div>
        <div class="rb-group">
          <div class="rb-col2">
            <div class="rb-row"><span class="dd wide">会计专用</span><span class="dd">.0⇢</span></div>
            <div class="rb-row"><span class="dd">¥</span><span class="dd">%</span><span class="dd">,</span><span class="dd">⌫0</span></div>
          </div>
          <i class="rb-label">数字</i>
        </div>
        <div class="rb-group">
          <div class="rb-col">
            <span class="rb-mini">▦ 条件格式</span>
            <span class="rb-mini">⬛ 套用表格格式</span>
          </div>
          <i class="rb-label">样式</i>
        </div>
        <div class="rb-group">
          <div class="rb-col">
            <span class="rb-mini">⊞ 插入　⌫ 删除</span>
            <span class="rb-mini">□ 格式 ▾</span>
          </div>
          <i class="rb-label">单元格</i>
        </div>
        <div class="rb-group">
          <div class="rb-col">
            <span class="rb-mini">Σ 自动求和</span>
            <span class="rb-mini">⇩ 填充　　⌫ 清除</span>
            <span class="rb-mini">⇅ 排序和筛选　🔍 查找</span>
          </div>
          <i class="rb-label">编辑</i>
        </div>
      </div>
      <div class="xl-formula">
        <span class="cell-ref">G${SEL_ROW} <i>▾</i></span>
        <span class="fx"><i>fx</i> <b>✓</b> <b>✕</b></span>
        <span class="expr num">${selAmount}</span>
      </div>
      <div class="xl-body">
        <table class="num">
          <colgroup>
            <col style="width:34px"><col style="width:88px"><col style="width:64px"><col style="width:110px">
            <col style="width:104px"><col style="width:56px"><col style="width:78px"><col style="width:96px">
            <col style="width:72px"><col style="width:60px"><col style="width:72px">
          </colgroup>
          <thead>
            <tr><th class="idx corner"></th>${colHeaders}</tr>
          </thead>
          <tbody>
            <tr class="fields">
              <td class="idx">1</td>
              ${FIELDS.map((h) => `<td class="td">${h}</td>`).join("")}
            </tr>
            ${dataRows}
            <tr class="total">
              <td class="idx">${SALES_ROWS.length + 2}</td>
              <td class="td">合计</td>
              <td class="td" colspan="3"></td>
              <td class="td num right">${qtyTotal}</td>
              <td class="td"></td>
              <td class="td num right grand">${fmt(total)}</td>
              <td class="td" colspan="3"></td>
            </tr>
            ${Array.from({ length: 80 }, (_, i) => `
            <tr>
              <td class="idx">${SALES_ROWS.length + 3 + i}</td>
              ${COLS.map(() => `<td class="td"></td>`).join("")}
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="xl-sheets">
        <span class="nav">◂ ▸</span>
        <span class="active">销售明细</span><span>汇总</span><span>透视表</span><span>图表</span><span class="plus">⊕</span>
      </div>
      <div class="xl-status num">
        <span>就绪</span>
        <span>求和: ${fmt(total)}　计数: ${SALES_ROWS.length}　平均值: ${fmt(avg)}</span>
        <span class="views">▦ ⊞ ─ ─●─ <b>100%</b> +</span>
      </div>
    </div>`;
  },
};
