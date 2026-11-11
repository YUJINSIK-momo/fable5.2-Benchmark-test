"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { choose, conclude, initLogic, isTie, resolve, visibleOptions } from "@/game/engine";
import { todayKST } from "@/game/daily";
import { buildReceipt, type Receipt } from "@/game/receipt";
import { isOpen, scenarioFor, WEEK } from "@/game/scenarios";
import { loadSeen, saveSeen } from "@/game/storage";
import type {
  CharId,
  DirectMessage,
  EndingId,
  Logic,
  Option,
  RestaurantId,
  Scenario,
  Shown,
  Speaker,
} from "@/game/types";
import { ReceiptCard } from "./ReceiptCard";
import { UrgeComposer } from "./UrgeComposer";

type Line =
  | { k: "msg"; id: number; who: Speaker; text: string; map?: boolean }
  | { k: "sys"; id: number; text: string }
  | { k: "poll"; id: number; counts: Record<RestaurantId, number> };

type Mode =
  | { k: "playing" }
  | { k: "choosing" }
  | { k: "urge"; opt: Option }
  | { k: "dm"; opt: Option; dm: DirectMessage; replied: boolean };

const CHAR_ORDER: CharId[] = ["oh", "kim", "park"];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function Game() {
  const [today, setToday] = useState<{ key: string; dow: number } | null>(null);
  const [seen, setSeen] = useState<EndingId[]>([]);
  const [screen, setScreen] = useState<"intro" | "chat" | "result">("intro");
  const [run, setRun] = useState(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // 날짜와 저장된 엔딩은 브라우저에서만 알 수 있다
  useEffect(() => {
    setToday(todayKST());
    setSeen(loadSeen());
  }, []);

  if (!today) return <main className="phone" aria-busy="true" />;

  const sc = scenarioFor(today.dow);
  const total = Object.keys(sc.endings).length;

  if (screen === "intro") {
    return (
      <main className="phone intro">
        <p className="intro-clock">{sc.clock}</p>
        <h1 className="intro-title">
          아무거나요<span>㈜</span>
        </h1>
        <p className="intro-lede">
          내가 먹고 싶은 점심을,
          <br />
          남이 먼저 가자고 말하게 만드세요.
        </p>

        <div className="secret">
          <p className="secret-tag">나한테만 보임</p>
          <p className="secret-label">오늘의 욕망</p>
          <p className="secret-menu">{sc.restaurants[sc.desire].full}</p>
        </div>

        <ul className="rules">
          <li>단톡방에 말할 기회는 딱 세 번.</li>
          <li>가장 많은 사람이 고른 식당으로 간다. 동률이면 팀장이 정한다.</li>
          <li>프로필 사진을 누르면 그 사람이 보인다.</li>
        </ul>

        <ol className="week" aria-label="이번 주 시나리오">
          {WEEK.map((d) => (
            <li key={d.dow} className={isOpen(d.dow) ? "on" : ""}>
              <b>{d.label}</b>
              <span>{isOpen(d.dow) ? d.theme : "준비 중"}</span>
            </li>
          ))}
        </ol>
        {!isOpen(today.dow) && <p className="week-note">오늘 요일은 아직 준비 중이라 월요일 편이 열립니다.</p>}

        <button className="cta" onClick={() => setScreen("chat")}>
          단톡방 들어가기
        </button>
        <p className="seen">
          본 엔딩 {seen.length}/{total}
        </p>
      </main>
    );
  }

  if (screen === "result" && receipt) {
    return (
      <ReceiptCard
        receipt={receipt}
        seen={seen.length}
        total={total}
        onRetry={() => {
          setRun((n) => n + 1);
          setScreen("chat");
        }}
      />
    );
  }

  return (
    <Chat
      key={run}
      sc={sc}
      onEnd={(logic, endingId) => {
        setSeen(saveSeen(endingId));
        setReceipt(buildReceipt(sc, logic, endingId, today.key));
        setScreen("result");
      }}
    />
  );
}

function Chat({ sc, onEnd }: { sc: Scenario; onEnd: (logic: Logic, ending: EndingId) => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [leans, setLeans] = useState(() => initLogic(sc).leans);
  const [bumped, setBumped] = useState<CharId | null>(null);
  const [typing, setTyping] = useState<CharId | null>(null);
  const [mode, setMode] = useState<Mode>({ k: "playing" });
  const [turn, setTurn] = useState(0);
  const [profile, setProfile] = useState<CharId | null>(null);
  const [dmLines, setDmLines] = useState<{ mine: boolean; text: string }[]>([]);

  const logic = useRef<Logic>(initLogic(sc));
  const alive = useRef(true);
  const fast = useRef(false);
  const nextId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  const wait = useCallback(async (ms: number) => {
    // 화면을 누르면 기다림이 짧아진다
    let left = ms;
    while (left > 0 && alive.current) {
      const step = Math.min(left, 80);
      await sleep(fast.current ? step / 6 : step);
      left -= step;
    }
  }, []);

  const play = useCallback(
    async (shown: Shown[]) => {
      for (const item of shown) {
        if (!alive.current) return;
        const id = nextId.current++;
        if (item.t === "pause") {
          await wait(item.ms);
        } else if (item.t === "lean") {
          setLeans((l) => ({ ...l, [item.who]: item.to }));
          setBumped(item.who);
          await wait(650);
        } else if (item.t === "sys") {
          setLines((l) => [...l, { k: "sys", id, text: item.text }]);
          await wait(700);
        } else if (item.t === "poll") {
          setLines((l) => [...l, { k: "poll", id, counts: item.counts }]);
          await wait(1200);
        } else {
          if (item.who !== "me" && item.typing > 0) {
            setTyping(item.who);
            await wait(item.typing);
            setTyping(null);
          }
          if (!alive.current) return;
          setLines((l) => [...l, { k: "msg", id, who: item.who, text: item.text, map: item.map }]);
          await wait(item.who === "me" ? 500 : 450);
        }
      }
    },
    [wait],
  );

  const finish = useCallback(
    async (endingId: EndingId) => {
      const out = resolve(sc.endings[endingId].outro, logic.current);
      await play(out.shown);
      await wait(1100);
      if (alive.current) onEnd(logic.current, endingId);
    },
    [onEnd, play, sc, wait],
  );

  const afterTurn = useCallback(
    async (t: number) => {
      if (t + 1 < sc.turns.length) {
        setTurn(t + 1);
        setMode({ k: "choosing" });
      } else {
        setTurn(sc.turns.length);
        if (isTie(logic.current)) {
          await play([
            { t: "pause", ms: 600 },
            { t: "sys", text: `동률 — ${sc.characters[sc.tieBreaker].name}이 정한다` },
          ]);
        }
        await finish(conclude(sc, logic.current));
      }
    },
    [finish, play, sc],
  );

  // 입장하면 팀장이 먼저 말을 꺼낸다
  useEffect(() => {
    alive.current = true;
    (async () => {
      await wait(500);
      await play(resolve(sc.intro, logic.current).shown);
      if (alive.current) setMode({ k: "choosing" });
    })();
    return () => {
      alive.current = false;
    };
  }, [play, sc, wait]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [lines, typing, mode]);

  const send = async (opt: Option, variant?: "soft" | "raw") => {
    fast.current = false;
    setMode({ k: "playing" });
    const out = choose(opt, logic.current, variant);
    logic.current = out.state;
    await play(out.shown);
    if (!alive.current) return;

    if (variant === "raw" && opt.urge?.dm) {
      await wait(900);
      setDmLines([]);
      setMode({ k: "dm", opt, dm: opt.urge.dm, replied: false });
      for (const text of opt.urge.dm.lines) {
        await wait(1100);
        if (!alive.current) return;
        setDmLines((l) => [...l, { mine: false, text }]);
      }
      return;
    }
    await afterTurn(turn);
  };

  const answerDm = async (accept: boolean) => {
    if (mode.k !== "dm" || mode.replied) return;
    const { dm } = mode;
    setMode({ ...mode, replied: true });
    if (accept) {
      setDmLines((l) => [...l, { mine: true, text: dm.accept.label }]);
      await wait(1200);
      setMode({ k: "playing" });
      await finish(dm.accept.ending);
      return;
    }
    setDmLines((l) => [...l, { mine: true, text: dm.decline.reply }]);
    for (const text of dm.decline.lines) {
      await wait(1000);
      if (!alive.current) return;
      setDmLines((l) => [...l, { mine: false, text }]);
    }
    await wait(1100);
    setMode({ k: "playing" });
    await afterTurn(turn);
  };

  const left = Math.max(sc.turns.length - turn, 0);
  const options = mode.k === "choosing" ? visibleOptions(sc, turn, logic.current) : [];

  return (
    <main className="phone chat">
      <header className="bar">
        <div>
          <h1>
            {sc.room} <span>4</span>
          </h1>
          <p>
            {sc.dayLabel} · {sc.twist}
          </p>
        </div>
        <div className="chances" aria-label={`남은 말 ${left}번`}>
          {sc.turns.map((_, i) => (
            <i key={i} className={i < left ? "on" : ""} />
          ))}
        </div>
      </header>

      <div className="minds">
        {CHAR_ORDER.map((id) => {
          const c = sc.characters[id];
          return (
            <button key={id} className="mind" onClick={() => setProfile(id)}>
              <span className={`avatar a-${id}`}>{c.initial}</span>
              <span className="mind-name">{c.name}</span>
              <span
                key={leans[id]}
                className={`chip r-${leans[id]} ${bumped === id ? "bump" : ""}`}
              >
                {sc.restaurants[leans[id]].short}
              </span>
            </button>
          );
        })}
      </div>

      <p className="desire">
        <span>나만 보임</span> 오늘의 욕망 · <b>{sc.restaurants[sc.desire].full}</b>
      </p>

      <section
        className="feed"
        aria-live="polite"
        onPointerDown={() => {
          if (mode.k === "playing") fast.current = true;
        }}
      >
        {lines.map((ln, i) => {
          if (ln.k === "sys") {
            return (
              <p key={ln.id} className="sys">
                {ln.text}
              </p>
            );
          }
          if (ln.k === "poll") {
            return (
              <div key={ln.id} className="poll">
                <p className="poll-title">익명 설문 · 3명 참여</p>
                {(Object.keys(ln.counts) as RestaurantId[]).map((r) => (
                  <div key={r} className="poll-row">
                    <span>{sc.restaurants[r].short}</span>
                    <span className="poll-bar">
                      <i className={`r-${r}`} style={{ width: `${(ln.counts[r] / 3) * 100}%` }} />
                    </span>
                    <b>{ln.counts[r]}</b>
                  </div>
                ))}
              </div>
            );
          }
          if (ln.who === "me") {
            return (
              <div key={ln.id} className="row mine">
                <p className="bubble">{ln.text}</p>
              </div>
            );
          }
          const prev = lines[i - 1];
          const first = !(prev && prev.k === "msg" && prev.who === ln.who);
          const c = sc.characters[ln.who];
          return (
            <div key={ln.id} className={`row ${first ? "first" : ""}`}>
              {first ? <span className={`avatar a-${ln.who}`}>{c.initial}</span> : <span className="avatar ghost" />}
              <div>
                {first && <p className="who">{c.name}</p>}
                <div className="bubble">
                  {ln.map && (
                    <div className="map" aria-label="지도 링크">
                      <i />
                      <span>
                        1층 경양식 돈가스
                        <small>도보 2분 · 11,000원</small>
                      </span>
                    </div>
                  )}
                  {ln.text}
                </div>
              </div>
            </div>
          );
        })}
        <p className="typing" aria-hidden={!typing}>
          {typing ? `${sc.characters[typing].name}님이 입력 중입니다…` : " "}
        </p>
        <div ref={bottom} />
      </section>

      <footer className="dock">
        {mode.k === "choosing" && (
          <>
            <p className="dock-label">
              {left === 1 ? "마지막 한마디" : `답장 고르기 · ${left}번 남음`}
            </p>
            {options.map((o) => (
              <button
                key={o.id}
                className={`reply ${o.urge ? "urge" : ""}`}
                onClick={() => (o.urge ? setMode({ k: "urge", opt: o }) : send(o))}
              >
                {o.urge && <small>하고 싶은 말</small>}
                {o.text}
              </button>
            ))}
          </>
        )}
        {mode.k === "urge" && (
          <UrgeComposer
            raw={mode.opt.text}
            soft={mode.opt.urge!.soft}
            onSend={(variant) => send(mode.opt, variant)}
          />
        )}
        {(mode.k === "playing" || mode.k === "dm") && (
          <p className="dock-idle">{left > 0 ? "화면을 누르면 빨리 넘어갑니다" : "…"}</p>
        )}
      </footer>

      {mode.k === "dm" && (
        <div className="sheet-back">
          <div className="sheet dm" role="dialog" aria-label="개인톡">
            <p className="sheet-kicker">개인톡 · 1:1</p>
            <div className="dm-head">
              <span className={`avatar a-${mode.dm.from}`}>{sc.characters[mode.dm.from].initial}</span>
              <b>{sc.characters[mode.dm.from].name}</b>
            </div>
            <div className="dm-feed">
              {dmLines.map((d, i) => (
                <div key={i} className={`row ${d.mine ? "mine" : ""}`}>
                  <p className="bubble">{d.text}</p>
                </div>
              ))}
            </div>
            {!mode.replied && dmLines.length >= mode.dm.lines.length && (
              <div className="dm-actions">
                <button className="reply" onClick={() => answerDm(true)}>
                  {mode.dm.accept.label}
                </button>
                <button className="reply" onClick={() => answerDm(false)}>
                  {mode.dm.decline.label}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {profile && (
        <div className="sheet-back" onClick={() => setProfile(null)}>
          <div className="sheet" role="dialog" aria-label="프로필" onClick={(e) => e.stopPropagation()}>
            <span className={`avatar big a-${profile}`}>{sc.characters[profile].initial}</span>
            <h2>{sc.characters[profile].name}</h2>
            <p className="sheet-status">{sc.characters[profile].profile}</p>
            <p className="sheet-lean">
              지금 마음 · <span className={`chip r-${leans[profile]}`}>{sc.restaurants[leans[profile]].short}</span>
            </p>
            <button className="reply" onClick={() => setProfile(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
