/** 皮肤注册表：伪装界面只做呈现，不持有任何状态（照搬 game 项目 BossKey 模式） */
export interface Skin {
  id: string;
  /** 托盘菜单 / 设置页显示名 */
  name: string;
  /** OS 窗口伪装标题（任务栏可见） */
  title: string;
  desc: string;
  render(el: HTMLElement): void;
}

import { excelSkin } from "./skins/excel";
import { vscodeSkin } from "./skins/vscode";
import { wordSkin } from "./skins/word";

export const SKINS: Skin[] = [excelSkin, vscodeSkin, wordSkin];

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
