import type {
  Beat,
  CharId,
  Cond,
  EndingId,
  Logic,
  Option,
  RestaurantId,
  Scenario,
  Shown,
} from "./types";

const CHARS: CharId[] = ["oh", "kim", "park"];
const RESTAURANTS: RestaurantId[] = ["donkatsu", "sundae", "cafeteria"];

export function initLogic(sc: Scenario): Logic {
  return {
    leans: {
      oh: sc.characters.oh.start,
      kim: sc.characters.kim.start,
      park: sc.characters.park.start,
    },
    flags: [],
    proposers: { ...sc.proposers },
    named: false,
    said: [],
  };
}

export function check(c: Cond | undefined, s: Logic): boolean {
  if (!c) return true;
  if (c.all?.some((f) => !s.flags.includes(f))) return false;
  if (c.none?.some((f) => s.flags.includes(f))) return false;
  for (const id of CHARS) {
    if (c.lean?.[id] && s.leans[id] !== c.lean[id]) return false;
    if (c.notLean?.[id] && s.leans[id] === c.notLean[id]) return false;
  }
  return true;
}

export function countVotes(leans: Logic["leans"]): Record<RestaurantId, number> {
  const counts: Record<RestaurantId, number> = { donkatsu: 0, sundae: 0, cafeteria: 0 };
  for (const id of CHARS) counts[leans[id]] += 1;
  return counts;
}

export function isTie(s: Logic): boolean {
  const counts = countVotes(s.leans);
  const top = Math.max(...RESTAURANTS.map((r) => counts[r]));
  return RESTAURANTS.filter((r) => counts[r] === top).length > 1;
}

/** 가장 많은 사람이 고른 식당. 동률이면 tieBreaker 가 고른 곳. */
export function tally(sc: Scenario, s: Logic): RestaurantId {
  const counts = countVotes(s.leans);
  const top = Math.max(...RESTAURANTS.map((r) => counts[r]));
  const winners = RESTAURANTS.filter((r) => counts[r] === top);
  return winners.length === 1 ? winners[0] : s.leans[sc.tieBreaker];
}

/**
 * 대사 묶음을 위에서부터 차례로 판정한다.
 * 앞 줄이 바꾼 마음이 뒷줄의 조건에 바로 반영된다.
 */
export function resolve(beats: Beat[], from: Logic): { shown: Shown[]; state: Logic } {
  const state: Logic = {
    leans: { ...from.leans },
    flags: [...from.flags],
    proposers: { ...from.proposers },
    named: from.named,
    said: [...from.said],
  };
  const shown: Shown[] = [];

  for (const b of beats) {
    if (!check(b.if, state)) continue;
    switch (b.t) {
      case "msg":
        shown.push({ t: "msg", who: b.who, text: b.text, typing: b.typing ?? 1100, map: b.map });
        break;
      case "me":
        state.said.push(b.text);
        shown.push({ t: "msg", who: "me", text: b.text, typing: 0 });
        break;
      case "sys":
        shown.push({ t: "sys", text: b.text });
        break;
      case "pause":
        shown.push({ t: "pause", ms: b.ms });
        break;
      case "lean":
        if (state.leans[b.who] !== b.to) {
          state.leans[b.who] = b.to;
          shown.push({ t: "lean", who: b.who, to: b.to });
        }
        break;
      case "flag":
        if (!state.flags.includes(b.set)) state.flags.push(b.set);
        break;
      case "propose":
        if (!state.proposers[b.what]) state.proposers[b.what] = b.who;
        break;
      case "mascot":
        shown.push({ t: "mascot", mood: b.mood, text: b.text });
        break;
      case "poll":
        shown.push({ t: "poll", counts: countVotes(state.leans) });
        break;
    }
  }
  return { shown, state };
}

export function visibleOptions(sc: Scenario, turn: number, s: Logic): Option[] {
  return sc.turns[turn].options.filter((o) => check(o.if, s));
}

/** 답장을 보낸다. variant 는 '하고 싶은 말'을 지웠는지(soft) 그냥 보냈는지(raw). */
export function choose(
  opt: Option,
  s: Logic,
  variant?: "soft" | "raw",
): { shown: Shown[]; state: Logic } {
  const text = variant === "soft" && opt.urge ? opt.urge.soft : opt.text;
  const beats: Beat[] = [{ t: "me", text }];
  if (opt.names) beats.push({ t: "propose", who: "me", what: opt.names });
  if (opt.urge) beats.push(...(variant === "soft" ? opt.urge.softBeats : opt.urge.rawBeats));
  else beats.push(...opt.beats);

  const out = resolve(beats, s);
  if (opt.names) out.state.named = true;
  return out;
}

export function conclude(sc: Scenario, s: Logic): EndingId {
  if (tally(sc, s) === sc.desire) return s.named ? "pusher" : "master";
  if (s.flags.includes("vote_flipped")) return "democracy";
  if (s.flags.includes("swore")) return "interview";
  return "follower";
}
