export type Mood = "meh" | "smug" | "tired" | "shock";

export type RestaurantId = "donkatsu" | "sundae" | "cafeteria";
export type CharId = "oh" | "kim" | "park";
export type Speaker = CharId | "me";

export interface Restaurant {
  id: RestaurantId;
  /** 채팅·칩에 쓰는 짧은 이름 */
  short: string;
  /** 영수증에 찍히는 이름 */
  full: string;
  price: number;
}

export interface Character {
  id: CharId;
  name: string;
  /** 프로필 사진 대신 쓰는 한 글자 */
  initial: string;
  /** 프로필을 눌렀을 때 보이는 한 줄. 공략 힌트다. */
  profile: string;
  start: RestaurantId;
}

/** 대사가 나올 조건. 적힌 항목을 모두 만족해야 한다. */
export interface Cond {
  all?: string[];
  none?: string[];
  lean?: Partial<Record<CharId, RestaurantId>>;
  notLean?: Partial<Record<CharId, RestaurantId>>;
}

export type Beat = (
  | { t: "msg"; who: CharId; text: string; typing?: number; map?: boolean }
  | { t: "me"; text: string }
  | { t: "sys"; text: string }
  | { t: "pause"; ms: number }
  | { t: "lean"; who: CharId; to: RestaurantId }
  | { t: "flag"; set: string }
  | { t: "propose"; who: Speaker; what: RestaurantId }
  | { t: "poll" }
  | { t: "mascot"; mood: Mood; text: string }
) & { if?: Cond };

export interface DirectMessage {
  from: CharId;
  lines: string[];
  accept: { label: string; ending: EndingId };
  decline: { label: string; reply: string; lines: string[] };
}

/** 하고 싶은 말. 지우면 soft 로 바뀌고, 그냥 보내면 raw 가 나간다. */
export interface Urge {
  soft: string;
  softBeats: Beat[];
  rawBeats: Beat[];
  dm?: DirectMessage;
}

export interface Option {
  id: string;
  text: string;
  if?: Cond;
  /** 이 답장이 식당 이름을 직접 꺼내는지 */
  names?: RestaurantId;
  beats: Beat[];
  urge?: Urge;
}

export interface Turn {
  options: Option[];
}

export type EndingId =
  | "master"
  | "pusher"
  | "democracy"
  | "interview"
  | "follower"
  | "soup";

export interface Ending {
  id: EndingId;
  /** 영수증의 '오늘의 직급' */
  rank: string;
  title: string;
  blurb: string;
  hidden?: boolean;
  /** 영수증 위에서 넵무새가 하는 말 */
  mascot: { mood: Mood; line: string };
  outro: Beat[];
}

export interface Scenario {
  id: string;
  dayLabel: string;
  /** 오늘의 돌발 상황 한 줄 */
  twist: string;
  room: string;
  clock: string;
  desire: RestaurantId;
  restaurants: Record<RestaurantId, Restaurant>;
  characters: Record<CharId, Character>;
  /** 동률일 때 정하는 사람 */
  tieBreaker: CharId;
  proposers: Partial<Record<RestaurantId, Speaker>>;
  intro: Beat[];
  turns: Turn[];
  endings: Record<EndingId, Ending>;
}

export interface Logic {
  leans: Record<CharId, RestaurantId>;
  flags: string[];
  proposers: Partial<Record<RestaurantId, Speaker>>;
  /** 내가 식당 이름을 직접 꺼냈는지 */
  named: boolean;
  /** 내가 단톡방에 보낸 말 */
  said: string[];
}

/** 화면에 순서대로 재생되는 항목 */
export type Shown =
  | { t: "msg"; who: Speaker; text: string; typing: number; map?: boolean }
  | { t: "sys"; text: string }
  | { t: "pause"; ms: number }
  | { t: "lean"; who: CharId; to: RestaurantId }
  | { t: "poll"; counts: Record<RestaurantId, number> }
  | { t: "mascot"; mood: Mood; text: string };
