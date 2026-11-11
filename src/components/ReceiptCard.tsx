"use client";

import { useState } from "react";
import { receiptText, type Receipt } from "@/game/receipt";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 웹뷰에서는 클립보드 API 가 막혀 있을 때가 있다
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function ReceiptCard({
  receipt,
  seen,
  total,
  onRetry,
}: {
  receipt: Receipt;
  seen: number;
  total: number;
  onRetry: () => void;
}) {
  const [note, setNote] = useState("");

  const url = () => window.location.origin + window.location.pathname;

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(""), 1800);
  };

  return (
    <main className="phone result">
      {receipt.hidden && <p className="hidden-tag">숨은 엔딩</p>}
      <h1 className="result-title">{receipt.hidden ? `〈${receipt.title}〉` : receipt.title}</h1>
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

      <div className="result-actions">
        <button
          className="cta"
          onClick={async () => flash((await copy(receiptText(receipt, url()))) ? "영수증을 복사했어요" : "복사하지 못했어요")}
        >
          영수증 복사
        </button>
        <button
          className="cta ghost"
          onClick={async () => flash((await copy(url())) ? "링크를 복사했어요" : "복사하지 못했어요")}
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
    </main>
  );
}
