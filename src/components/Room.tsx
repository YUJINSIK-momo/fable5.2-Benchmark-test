"use client";

import { useCallback, useEffect, useState } from "react";
import { db, type Room } from "@/lib/db";
import { copyText, playerId } from "@/lib/identity";
import { Mascot, type Mood } from "./Mascot";

/** 진짜 점심 투표방. code 가 없으면 방 만들기 화면이다. */
export function RoomScreen({
  code,
  nickname,
  onNickname,
  onExit,
}: {
  code: string | null;
  nickname: string;
  onNickname: (name: string) => void;
  onExit: () => void;
}) {
  const [current, setCurrent] = useState(code);

  if (!current) {
    return (
      <CreateRoom
        nickname={nickname}
        onNickname={onNickname}
        onExit={onExit}
        onCreated={(c) => {
          window.history.replaceState(null, "", `${window.location.pathname}?room=${c}`);
          setCurrent(c);
        }}
      />
    );
  }
  return <RoomView code={current} nickname={nickname} onNickname={onNickname} onExit={onExit} />;
}

function CreateRoom({
  nickname,
  onNickname,
  onExit,
  onCreated,
}: {
  nickname: string;
  onNickname: (name: string) => void;
  onExit: () => void;
  onCreated: (code: string) => void;
}) {
  const [title, setTitle] = useState("오늘 점심 뭐 먹죠");
  const [options, setOptions] = useState(["", "", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState(nickname);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const ready = title.trim() !== "" && new Set(filled).size >= 2 && name.trim() !== "";

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    onNickname(name);
    try {
      onCreated(await db.createRoom(playerId(), name.trim(), title, filled, anonymous));
    } catch {
      setError("방을 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.");
      setBusy(false);
    }
  };

  return (
    <main className="phone room">
      <div className="room-top">
        <button className="link" onClick={onExit}>
          ← 돌아가기
        </button>
      </div>
      <h1>진짜 점심 투표 열기</h1>
      <p className="room-meta">링크를 단톡방에 올리면 팀이 실제로 투표합니다.</p>

      <label className="field">
        질문
        <input value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="field">
        후보 (2~6개)
        <div className="opt-inputs">
          {options.map((o, i) => (
            <input
              key={i}
              value={o}
              maxLength={20}
              placeholder={["돈가스", "순댓국", "구내식당", "아무거나", "샐러드", "굶기"][i]}
              aria-label={`후보 ${i + 1}`}
              onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
        {options.length < 6 && (
          <button className="link" onClick={() => setOptions([...options, ""])}>
            + 후보 추가
          </button>
        )}
      </div>

      <div className="field">
        투표 방식 (바꾸면 결과도 바뀝니다)
        <div className="seg">
          <button className={anonymous ? "" : "on"} onClick={() => setAnonymous(false)}>
            거수투표
            <small>누가 뭘 찍었는지 다 보임</small>
          </button>
          <button className={anonymous ? "on" : ""} onClick={() => setAnonymous(true)}>
            익명 설문
            <small>마감 전까지 표 수도 숨김</small>
          </button>
        </div>
      </div>

      <label className="field">
        내 닉네임
        <input value={name} maxLength={12} placeholder="예: 영업2팀 막내" onChange={(e) => setName(e.target.value)} />
      </label>

      {error && <p className="err">{error}</p>}
      <div className="spacer" />
      <button className="cta" disabled={!ready || busy} onClick={submit} style={{ opacity: ready ? 1 : 0.4 }}>
        {busy ? "여는 중…" : "투표방 열기"}
      </button>
    </main>
  );
}

function RoomView({
  code,
  nickname,
  onNickname,
  onExit,
}: {
  code: string;
  nickname: string;
  onNickname: (name: string) => void;
  onExit: () => void;
}) {
  const [room, setRoom] = useState<Room | null | "missing">(null);
  const [name, setName] = useState(nickname);
  // 들어올 때 닉네임이 없었으면, 다 적을 때까지 입력칸을 계속 보여준다
  const [askName] = useState(() => nickname.trim() === "");
  const [tie, setTie] = useState<number[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRoom((await db.getRoom(code, playerId())) ?? "missing");
    } catch {
      // 잠깐 끊긴 것일 수 있다. 다음 주기에 다시 받아온다.
    }
  }, [code]);

  const open = room !== null && room !== "missing" && !room.closed;

  // 열려 있는 동안은 3초마다 다시 받아온다
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [open, refresh]);

  if (room === null) return <main className="phone room" aria-busy="true" />;
  if (room === "missing") {
    return (
      <main className="phone room">
        <Mascot mood="tired" line="그런 방 없는데…" />
        <h1>투표방을 찾지 못했어요</h1>
        <p className="room-meta">링크가 잘렸거나 지워진 방입니다.</p>
        <div className="spacer" />
        <button className="cta" onClick={onExit}>
          처음으로
        </button>
      </main>
    );
  }

  const needName = !room.anonymous && name.trim() === "";
  const winner = room.options.find((o) => o.id === room.winner);

  const vote = async (option: number) => {
    if (room.closed || needName) return;
    setError("");
    onNickname(name);
    try {
      setRoom(await db.castVote(code, playerId(), name.trim(), option));
    } catch {
      setError("투표하지 못했어요. 방이 방금 마감됐을 수 있어요.");
      refresh();
    }
  };

  const close = async (pick: number | null) => {
    setError("");
    try {
      const out = await db.closeRoom(code, playerId(), pick);
      if ("tie" in out) setTie(out.tie);
      else {
        setTie(null);
        setRoom(out);
      }
    } catch {
      setError(room.total === 0 ? "아직 아무도 투표하지 않았어요." : "마감하지 못했어요.");
    }
  };

  const share = async () => {
    setNote((await copyText(window.location.href)) ? "링크를 복사했어요" : "복사하지 못했어요");
    setTimeout(() => setNote(""), 1800);
  };

  let mood: Mood = room.anonymous ? "smug" : "meh";
  let line = room.anonymous ? "익명이면 다들 말이 많아지지." : "이름 다 보인다. 눈치껏 찍어.";
  if (tie) {
    mood = "shock";
    line = "동률이네. 방장이 정해. 그게 규칙이야.";
  } else if (room.closed) {
    mood = "tired";
    line = "정해졌네. 그래도 먹어야지 어떡해…";
  }

  return (
    <main className="phone room">
      <div className="room-top">
        <button className="link" onClick={onExit}>
          ← 나도 눈치 게임 하기
        </button>
        <span className={`badge ${room.anonymous ? "anon" : ""}`}>{room.anonymous ? "익명 설문" : "거수투표"}</span>
      </div>
      <h1>{room.title}</h1>
      <p className="room-meta">
        {room.ownerName ?? "누군가"}님이 연 투표 · {room.total}명 참여 · {room.closed ? "마감됨" : "진행 중"}
      </p>

      <Mascot small mood={mood} line={line} />

      {room.closed && winner && (
        <div className="winner">
          <small>오늘 점심은</small>
          <b>{winner.label}</b>
        </div>
      )}

      {!room.closed && !room.anonymous && askName && room.myVote === null && (
        <label className="field">
          거수투표라 이름이 보입니다. 닉네임을 먼저 적어 주세요.
          <input value={name} maxLength={12} placeholder="예: 영업2팀 막내" onChange={(e) => setName(e.target.value)} />
        </label>
      )}

      <div className="ballot">
        {room.options.map((o) => {
          const pct = o.count !== null && room.total > 0 ? (o.count / room.total) * 100 : 0;
          const pickable = tie !== null && tie.includes(o.id);
          return (
            <button
              key={o.id}
              className={`${room.myVote === o.id ? "mine" : ""} ${room.winner === o.id || pickable ? "win" : ""}`}
              disabled={room.closed || (tie !== null && !pickable)}
              onClick={() => (tie ? close(o.id) : vote(o.id))}
            >
              <span className="fill" style={{ width: `${pct}%` }} />
              <span className="row1">
                <span>
                  {o.label}
                  {room.myVote === o.id ? " ✓" : ""}
                </span>
                <span>{o.count !== null ? `${o.count}표` : "?"}</span>
              </span>
              {o.voters && o.voters.length > 0 && <span className="voters">{o.voters.join(", ")}</span>}
            </button>
          );
        })}
      </div>

      {tie && <p className="room-meta">동률입니다. 표시된 후보 중 하나를 눌러 정해 주세요.</p>}
      {room.anonymous && !room.closed && <p className="room-meta">표 수는 마감하면 공개됩니다.</p>}
      {error && <p className="err">{error}</p>}

      <div className="spacer" />
      {!room.closed && (
        <button className="cta ghost" onClick={share}>
          투표 링크 복사
        </button>
      )}
      {!room.closed && room.owner && !tie && (
        <button className="cta" onClick={() => close(null)}>
          투표 마감하기
        </button>
      )}
      <p className="toast" role="status">
        {note}
      </p>
    </main>
  );
}
