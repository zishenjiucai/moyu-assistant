/**
 * 伪装三：Word（Windows Word 365 风格完整仿真）。
 * 结构：蓝色标题栏 → 功能选项卡 → 多分组功能区（含样式库）→ 标尺
 * → 灰底居中 A4 纸张（等线排版公文）→ 状态栏（页码/字数/缩放）。
 */
import type { Skin } from "../registry";

const DOC_SECTIONS: { heading: string; items?: string[]; text?: string }[] = [
  {
    heading: "一、季度工作回顾",
    items: [
      "完成 Q3 经营数据看板的口径校准，修复环比统计的两处偏差，报表已同步至部门共享盘。",
      "与渠道组完成 7、8、9 月连续对账，差异共 5 笔（合计 11,240 元），全部核销归档。",
      "供应商年度续约完成两轮谈判，整体报价下浮 4.5%，合同已进入法务审核阶段。",
      "牵头新同事入职培训 6 场，覆盖 68 人，课件与录播已沉淀至知识库。",
      "配合 IT 完成工单系统二期上线试运行，日均处理量提升至 210 单，超时率下降至 1.2%。",
    ],
  },
  {
    heading: "二、关键数据指标",
    text: "本季度营收完成年度目标的 82.6%，同比 +14.2%；回款率 91.4%，达成月度连续三次达标；客诉率 0.8%，较上季度回落 0.5 个百分点；库存周转天数 38 天，优于基线 6 天。",
  },
  {
    heading: "三、四季度工作计划",
    items: [
      "10 月中旬前输出 Q4 预算初稿并提交部门评审。",
      "启动年度供应商评分，完成 12 家核心供应商初评与面谈。",
      "完成知识库第二阶段迁移与权限梳理，目标 11 月底验收。",
      "组织跨部门流程复盘会，输出明年一季度流程优化清单。",
    ],
  },
  {
    heading: "四、风险与需要的支持",
    text: "库存系统接口在高并发时段偶发超时（周均 3 次），已提工单并附复现路径，需要 IT 组在 10 月内支持排期处理；供应商合同审核如延后，可能影响 11 月首批订单交付，请法务侧协助加急。",
  },
];

const isMac = /mac/i.test(navigator.platform);

function winControls(): string {
  return isMac
    ? `<span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>`
    : `<span class="wc">─</span><span class="wc">▢</span><span class="wc close">✕</span>`;
}

export const wordSkin: Skin = {
  id: "word",
  name: "Word 文档",
  title: "Q3季度总结.docx - Word",
  desc: "季度工作总结文档，Word 排版风格",
  render(el) {
    const sections = DOC_SECTIONS.map(
      (s) => `
      <div class="wd-sec">
        <h2>${s.heading}</h2>
        ${s.items ? `<ol>${s.items.map((it) => `<li>${it}</li>`).join("")}</ol>` : `<p>${s.text}</p>`}
      </div>`
    ).join("");

    // 标尺刻度：每 24px 一小格，每 120px 一大格带数字
    const rulerTicks = Array.from({ length: 60 }, (_, i) => {
      const x = 30 + i * 24;
      const big = i % 5 === 0;
      return `<i class="${big ? "big" : ""}" style="left:${x}px">${big ? `<b>${i / 5 + 1}</b>` : ""}</i>`;
    }).join("");

    el.innerHTML = `
    <div class="mk-doc">
      <div class="wd-titlebar">
        <span class="wd-logo">W</span>
        <span class="qat"><svg width="13" height="13" viewBox="0 0 16 16"><path d="M3 1h8l3 3v11H3z" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M5 7h6M5 10h6" stroke="#fff" stroke-width="1.3"/></svg><span class="undo">↩</span><span class="undo">↪</span></span>
        <span class="wd-title">Q3季度总结.docx - Word</span>
        <span class="wd-search">🔍 <i>搜索</i></span>
        <span class="wd-account">运 营</span>
        <span class="winbtns">${winControls()}</span>
      </div>
      <div class="wd-tabs">
        <span class="file">文件</span>
        <span class="active">开始</span><span>插入</span><span>设计</span><span>布局</span><span>引用</span><span>邮件</span><span>审阅</span><span>视图</span><span>帮助</span>
        <span class="tell-me">🔍 告诉我</span>
      </div>
      <div class="wd-ribbon">
        <div class="rb-group">
          <button class="rb-big"><svg width="26" height="26" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="11" rx="1" fill="none" stroke="#5a5a5a" stroke-width="1.2"/><path d="M5 3V1h6v2" fill="none" stroke="#5a5a5a" stroke-width="1.2"/><path d="M5 8h6M5 11h4" stroke="#2b579a" stroke-width="1.4"/></svg><b>粘贴</b></button>
          <i class="rb-label">剪贴板</i>
        </div>
        <div class="rb-group">
          <div class="rb-col2">
            <div class="rb-row"><span class="dd wide">等线</span><span class="dd">小四</span></div>
            <div class="rb-row">
              <b class="bi">B</b><i class="bi it">I</i><u class="bi">U</u>
              <span class="bi ab">A</span><span class="dd">Aㅕ</span><span class="dd">αe</span>
            </div>
          </div>
          <i class="rb-label">字体</i>
        </div>
        <div class="rb-group">
          <div class="rb-col2">
            <div class="rb-row"><span class="dd">≡上</span><span class="dd">≡中</span><span class="dd">≡下</span></div>
            <div class="rb-row"><span class="dd">⯇</span><span class="dd">≡</span><span class="dd">⯈</span><span class="dd">☰▾</span><span class="dd">⮐</span></div>
          </div>
          <i class="rb-label">段落</i>
        </div>
        <div class="rb-group">
          <div class="rb-styles">
            <div class="style-box style-h1"><b>AaBbCc</b><u>标题 1</u></div>
            <div class="style-box style-h2"><b>AaBbCc</b><u>标题 2</u></div>
            <div class="style-box style-body on"><b>AaBbCc</b><u>正文</u></div>
            <div class="style-box style-plain"><b>AaBbCcDd</b><u>无间隔</u></div>
          </div>
          <i class="rb-label">样式</i>
        </div>
        <div class="rb-group">
          <div class="rb-col">
            <span class="rb-mini">🔍 查找　⇄ 替换</span>
            <span class="rb-mini">☰ 选择　✎ 查找并选中</span>
          </div>
          <i class="rb-label">编辑</i>
        </div>
        <div class="rb-group">
          <button class="rb-big"><svg width="26" height="26" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="#5a5a5a" stroke-width="1.2"/><path d="M5 6h6M5 9h6M5 12h4" stroke="#2b579a" stroke-width="1.3"/></svg><b>编辑器</b></button>
          <i class="rb-label">编辑器</i>
        </div>
      </div>
      <div class="wd-ruler">${rulerTicks}</div>
      <div class="wd-body">
        <div class="wd-paper">
          <h1>2026 年第三季度工作总结</h1>
          <p class="wd-sub">运营部 · 汇报周期 2026-07-01 至 2026-09-26 · 密级：内部</p>
          <hr />
          ${sections}
          <div class="wd-sign">
            <p>汇报人：运营部</p>
            <p>2026 年 9 月 27 日</p>
          </div>
        </div>
      </div>
      <div class="wd-status num">
        <span>第 1 页，共 2 页</span>
        <span>📝 1,186 个字　中文（中国）</span>
        <span class="views">▦ ⊞ ▤ ─ ●─ <b>130%</b> +</span>
      </div>
    </div>`;
  },
};
