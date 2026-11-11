"use client";

import { useState } from "react";
import { receiptText, type Receipt } from "@/game/receipt";
import type { EndingId } from "@/game/types";
import { db, type DayStats, type RankRow } from "@/lib/db";
import { copyText } from "@/lib/identity";
import { Mascot } from "./Mascot";

export function ReceiptCard({
  receipt,
  stats,
  endingId,
  titles,
  seen,
  total,
  onRetry,
}: {
  receipt: Receipt;
  /** 서버에서 받아온 오늘의 분포. 아직이거나 실패했으면 null */
  stats: DayStats | null;
  endingId: EndingId | null;
  titles: Record<string, string>;
  seen: number;
  total: number;
  onRetry: () => void;
}) {
  const [note, setNote] = useState("");
  const [rank, setRank] = useState<RankRow[] | "loading" | "error" | null>(null);

  const url = () => window.location.origin + window.location.pathname;

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(""), 1800);
  };

  const openRank = () => {
    setRank("loading");
    db.ranking().then(setRank, () => setRank("error"));
  };

  const rows = stats
    ? Object.entries(stats.endings).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <main className="phone result">
      <div className="result-head">
        <div>
          {receipt.hidden && <p className="hidden-tag">숨은 엔딩</p>}
          <h1 className="result-title">{receipt.hidden ? `〈${receipt.title}〉` : receipt.title}</h1>
        </div>
      </div>
      <Mascot mood={receipt.mascot.mood} line={receipt.mascot.line} />
      <p className="result-blurb">{receipt.blurb}</p>

      <article className="receipt">
        <header>
          <b>{receipt.company}</b>
          <span>점심 영수증</span>
        </header>
        <p className="receipt-meta">
          {receipt.date} · No.{receipt.no}
        </p>
        <dl>
          {receipt.rows.map((row) => (
            <div key={row.label} className={row.label === "오늘의 직급" ? "rank" : ""}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="receipt-foot">* 본 영수증은 단톡방 제출용입니다</p>
      </article>

      {stats && stats.players > 0 && (
        <section className="stats">
          <div className="stats-head">
            <b>오늘 사내 분포</b>
            <span>첫 판 기준 · {stats.players}명</span>
          </div>
          {rows.map(([id, count]) => (
            <div key={id} className={`stat-row ${id === endingId ? "me" : ""}`}>
              <span>{titles[id] ?? id}</span>
              <span className="stat-bar">
                <i style={{ width: `${(count / stats.players) * 100}%` }} />
              </span>
              <span>{Math.round((count / stats.players) * 100)}%</span>
            </div>
          ))}
          <button className="link" onClick={openRank}>
            엔딩 수집 랭킹 보기
          </button>
        </section>
      )}

      <div className="result-actions">
        <button
          className="cta"
          onClick={async () => flash((await copyText(receiptText(receipt, url()))) ? "영수증을 복사했어요" : "복사하지 못했어요")}
        >
          영수증 복사
        </button>
        <button
          className="cta ghost"
          onClick={async () => flash((await copyText(url())) ? "링크를 복사했어요" : "복사하지 못했어요")}
        >
          링크 복사
        </button>
      </div>
      <button className="retry" onClick={onRetry}>
        같은 월요일 다시 망치기
      </button>
      <p className="seen">
        본 엔딩 {seen}/{total}
      </p>
      <p className="toast" role="status">
        {note}
      </p>

      {rank && (
        <div className="sheet-back" onClick={() => setRank(null)}>
          <div className="sheet" role="dialog" aria-label="랭킹" onClick={(e) => e.stopPropagation()}>
            <h2>엔딩 수집 랭킹</h2>
            {rank === "loading" && <p className="sheet-status">불러오는 중…</p>}
            {rank === "error" && <p className="sheet-status">랭킹을 불러오지 못했어요.</p>}
            {Array.isArray(rank) && rank.length === 0 && (
              <p className="sheet-status">아직 닉네임을 적은 사람이 없어요.</p>
            )}
            {Array.isArray(rank) && rank.length > 0 && (
              <ol className="rank-list">
                {rank.map((r, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    <b>{r.nickname}</b>
                    <small>
                      엔딩 {r.endings}/{total} · {r.plays}판
                    </small>
                  </li>
                ))}
              </ol>
            )}
            <button className="reply" onClick={() => setRank(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
