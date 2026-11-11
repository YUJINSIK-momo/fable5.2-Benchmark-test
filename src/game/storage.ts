import type { EndingId } from "./types";

const KEY = "amugeona:endings";

/** 이 기기에서 본 엔딩. 저장소를 못 쓰는 환경(사생활 보호 창 등)에서는 빈 목록으로 돈다. */
export function loadSeen(): EndingId[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as EndingId[]) : [];
  } catch {
    return [];
  }
}

export function saveSeen(id: EndingId): EndingId[] {
  const seen = loadSeen();
  if (seen.includes(id)) return seen;
  const next = [...seen, id];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 안 돼도 게임은 계속된다
  }
  return next;
}
