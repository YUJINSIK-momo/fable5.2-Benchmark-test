/** 한국 시간 기준 오늘. 같은 날 접속한 사람은 같은 판을 받는다. */
export function todayKST(now: Date = new Date()): { key: string; dow: number } {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { key: k.toISOString().slice(0, 10), dow: k.getUTCDay() };
}

/** 날짜에서 뽑는 영수증 번호. 같은 날이면 모두 같다. */
export function receiptNo(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 10000).padStart(4, "0");
}
