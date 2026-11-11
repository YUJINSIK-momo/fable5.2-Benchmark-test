/**
 * Supabase 호출. 함수(RPC) 몇 개만 쓰므로 라이브러리 없이 fetch 로 부른다.
 * 아래 키는 브라우저에 실리는 공개 키다. 테이블은 RLS 로 잠겨 있고 함수로만 드나든다.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ckrqhiyoyubvolwarxsj.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "sb_publishable_7s5xpY3OmtyVF1XScXmiHA_cyXk0nai";

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `요청 실패 (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export interface DayStats {
  players: number;
  endings: Record<string, number>;
}

export interface RankRow {
  nickname: string;
  endings: number;
  plays: number;
}

export interface RoomOption {
  id: number;
  label: string;
  /** 익명 방은 마감 전까지 null */
  count: number | null;
  /** 익명 방은 끝까지 null */
  voters: string[] | null;
}

export interface Room {
  code: string;
  title: string;
  anonymous: boolean;
  closed: boolean;
  winner: number | null;
  owner: boolean;
  ownerName: string | null;
  myVote: number | null;
  total: number;
  options: RoomOption[];
}

export type CloseResult = Room | { tie: number[] };

export const db = {
  recordPlay: (player: string, nickname: string, scenario: string, ending: string, path: string) =>
    rpc<null>("record_play", { p_player: player, p_nickname: nickname, p_scenario: scenario, p_ending: ending, p_path: path }),
  dayStats: (scenario: string) => rpc<DayStats>("day_stats", { p_scenario: scenario }),
  ranking: () => rpc<RankRow[]>("ranking", {}),
  createRoom: (player: string, nickname: string, title: string, options: string[], anonymous: boolean) =>
    rpc<string>("create_room", { p_player: player, p_nickname: nickname, p_title: title, p_options: options, p_anonymous: anonymous }),
  getRoom: (code: string, player: string) => rpc<Room | null>("get_room", { p_code: code, p_player: player }),
  castVote: (code: string, player: string, nickname: string, option: number) =>
    rpc<Room>("cast_vote", { p_code: code, p_player: player, p_nickname: nickname, p_option: option }),
  closeRoom: (code: string, player: string, pick: number | null) =>
    rpc<CloseResult>("close_room", { p_code: code, p_player: player, p_pick: pick }),
};
