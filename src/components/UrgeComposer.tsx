"use client";

import { useEffect, useRef, useState } from "react";

type Stage = "typing" | "ready" | "erasing" | "rewriting" | "done";

/**
 * 하고 싶은 말이 입력창에 찍힌다.
 * 꾹 눌러 지우면 한 자씩 지워지고 점잖은 말로 바뀌어 나간다. 그냥 보낼 수도 있다.
 */
export function UrgeComposer({
  raw,
  soft,
  onSend,
}: {
  raw: string;
  soft: string;
  onSend: (variant: "soft" | "raw") => void;
}) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("typing");
  const [holding, setHolding] = useState(false);
  const sent = useRef(false);

  // 문장이 입력창에 찍힌다
  useEffect(() => {
    if (stage !== "typing") return;
    if (text.length >= raw.length) {
      setStage("ready");
      return;
    }
    const id = setTimeout(() => setText(raw.slice(0, text.length + 1)), 38);
    return () => clearTimeout(id);
  }, [raw, stage, text]);

  // 누르고 있는 동안만 지워진다
  useEffect(() => {
    if (!holding || (stage !== "ready" && stage !== "erasing")) return;
    if (text.length === 0) {
      setStage("rewriting");
      return;
    }
    const id = setTimeout(() => {
      setStage("erasing");
      setText((t) => t.slice(0, -1));
    }, 62);
    return () => clearTimeout(id);
  }, [holding, stage, text]);

  // 다 지우면 점잖은 말이 대신 찍히고 전송된다
  useEffect(() => {
    if (stage !== "rewriting") return;
    if (text.length >= soft.length) {
      const id = setTimeout(() => {
        if (sent.current) return;
        sent.current = true;
        setStage("done");
        onSend("soft");
      }, 550);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setText(soft.slice(0, text.length + 1)), 45);
    return () => clearTimeout(id);
  }, [onSend, soft, stage, text]);

  const canHold = stage === "ready" || stage === "erasing";
  const press = () => canHold && setHolding(true);
  const release = () => setHolding(false);

  const sendRaw = () => {
    if (stage !== "ready" || sent.current) return;
    sent.current = true;
    setStage("done");
    onSend("raw");
  };

  return (
    <div className="composer">
      <div className={`input ${stage === "rewriting" ? "calm" : ""}`} aria-live="polite">
        {text}
        <i className="caret" />
      </div>
      <div className="composer-actions">
        <button
          className={`hold ${holding ? "down" : ""}`}
          disabled={!canHold}
          onPointerDown={(e) => {
            // 손가락이 버튼 밖으로 밀려도 떼기 전까지는 누른 것으로 친다
            e.currentTarget.setPointerCapture(e.pointerId);
            press();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) press();
          }}
          onKeyUp={release}
          onBlur={release}
        >
          {stage === "erasing" && !holding ? "계속 눌러 지우기" : "꾹 눌러 지우기"}
        </button>
        <button className="send" disabled={stage !== "ready"} onClick={sendRaw}>
          그냥 전송
        </button>
      </div>
    </div>
  );
}
