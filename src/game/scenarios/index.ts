import type { Scenario } from "../types";
import { monday } from "./monday";

/** 요일(0=일) → 시나리오. 아직 월요일 한 편뿐이라 나머지 요일도 월요일을 연다. */
const byDay: Partial<Record<number, Scenario>> = {
  1: monday,
};

export const WEEK = [
  { dow: 1, label: "월", theme: "법카 한도" },
  { dow: 2, label: "화", theme: "비 오는 날" },
  { dow: 3, label: "수", theme: "1시 회의" },
  { dow: 4, label: "목", theme: "어제 먹은 메뉴" },
  { dow: 5, label: "금", theme: "팀장 연차" },
];

export function isOpen(dow: number): boolean {
  return Boolean(byDay[dow]);
}

export function scenarioFor(dow: number): Scenario {
  return byDay[dow] ?? monday;
}
