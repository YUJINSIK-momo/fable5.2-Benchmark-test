import { tally } from "./engine";
import { receiptNo } from "./daily";
import type { EndingId, Logic, Scenario, Speaker } from "./types";

export interface Receipt {
  company: string;
  date: string;
  no: string;
  rows: { label: string; value: string }[];
  rank: string;
  title: string;
  blurb: string;
  hidden: boolean;
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

function nameOf(sc: Scenario, who: Speaker | undefined): string {
  if (!who) return "아무도";
  return who === "me" ? "나" : sc.characters[who].name;
}

export function buildReceipt(sc: Scenario, s: Logic, endingId: EndingId, dateKey: string): Receipt {
  const ending = sc.endings[endingId];
  const quote = `“${s.said[s.said.length - 1] ?? "…"}”`;
  const base = {
    company: "아무거나요㈜",
    date: `${dateKey} ${sc.dayLabel}`,
    no: receiptNo(dateKey),
    rank: ending.rank,
    title: ending.title,
    blurb: ending.blurb,
    hidden: Boolean(ending.hidden),
  };

  if (endingId === "soup") {
    const r = sc.restaurants[sc.desire];
    return {
      ...base,
      rows: [
        { label: "주문", value: `${r.full} × 2` },
        { label: "결제", value: `각자 카드 ${won(r.price)}` },
        { label: "최초 제안", value: "박 주임 (개인톡)" },
        { label: "식당 예약", value: "박 주임" },
        { label: "내가 한 말", value: quote },
        { label: "오늘의 직급", value: ending.rank },
      ],
    };
  }

  const winner = tally(sc, s);
  const r = sc.restaurants[winner];
  const proposer = s.proposers[winner];
  // 내 메뉴를 내 입으로 밀어서 이겼으면 예약도 내 몫이다
  const booker: Speaker | undefined = winner === sc.desire && s.named ? "me" : proposer;

  return {
    ...base,
    rows: [
      { label: "주문", value: `${r.full} × 1` },
      { label: "결제", value: `법인카드 ${won(r.price)}` },
      { label: "최초 제안", value: nameOf(sc, proposer) },
      { label: "식당 예약", value: nameOf(sc, booker) },
      { label: "내가 한 말", value: quote },
      { label: "오늘의 직급", value: ending.rank },
    ],
  };
}

export function receiptText(rc: Receipt, url: string): string {
  return [
    `${rc.company} · 점심 영수증`,
    `${rc.date} · No.${rc.no}`,
    ...rc.rows.map((row) => `${row.label}　${row.value}`),
    "",
    `같은 ${rc.date.split(" ")[1]}, 다르게 망쳐보기 → ${url}`,
  ].join("\n");
}
