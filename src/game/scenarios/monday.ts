import type { Scenario } from "../types";

/**
 * 월요일 — 법카 한도.
 *
 * 오 팀장: 누가 말을 꺼냈는지에 반응한다. 아랫사람이 식당을 찍으면 일단 튕긴다.
 * 김 대리: 메뉴(정확히는 가격)에 반응한다. 한도를 남기는 걸 못 참는다.
 * 박 주임: 속은 돈가스. 얼굴이 보이면 윗사람을 따라가고, 익명이면 제 뜻대로 찍는다.
 */
export const monday: Scenario = {
  id: "mon",
  dayLabel: "월요일",
  twist: "법카 한도 1인 11,000원. 남기면 소멸.",
  room: "영업2팀 점심방",
  clock: "오전 11:52",
  desire: "donkatsu",
  restaurants: {
    donkatsu: { id: "donkatsu", short: "돈가스", full: "경양식 돈가스", price: 11000 },
    sundae: { id: "sundae", short: "순댓국", full: "순댓국", price: 9000 },
    cafeteria: { id: "cafeteria", short: "구내식당", full: "구내식당 백반", price: 6500 },
  },
  characters: {
    oh: {
      id: "oh",
      name: "오 팀장",
      initial: "오",
      profile: "아무거나 좋아함. (아무거나는 아님) 자기가 정한 걸로 해야 맛있음.",
      start: "sundae",
    },
    kim: {
      id: "kim",
      name: "김 대리",
      initial: "김",
      profile: "영수증 모으는 사람. 법카 잔액을 원 단위로 기억함.",
      start: "sundae",
    },
    park: {
      id: "park",
      name: "박 주임",
      initial: "박",
      profile: "익명 설문에서는 의견이 많은 편.",
      start: "cafeteria",
    },
  },
  tieBreaker: "oh",
  proposers: { sundae: "kim" },

  intro: [
    { t: "sys", text: "오전 11:52" },
    { t: "msg", who: "oh", text: "오늘 점심은 진짜 아무거나요 ㅎㅎ", typing: 900 },
    { t: "msg", who: "kim", text: "순댓국 어떠세요? 9,000원이라 한도 안쪽입니다", typing: 1300 },
    { t: "msg", who: "park", text: "저도 아무거나 괜찮습니다..!", typing: 1000 },
    { t: "msg", who: "oh", text: "넵", typing: 2600 },
  ],

  turns: [
    // ── 첫 번째 말 ─────────────────────────────────────────────
    {
      options: [
        {
          id: "t1-push",
          text: "그럼 1층 돈가스 어떠세요?",
          names: "donkatsu",
          beats: [
            { t: "flag", set: "pushed" },
            { t: "msg", who: "oh", text: "아 돈가스 말고 아무거나요", typing: 2400 },
            { t: "msg", who: "kim", text: "돈가스는 11,000원이네요. 한도 딱 맞긴 합니다", typing: 1300 },
            { t: "msg", who: "park", text: "ㅎㅎ..", typing: 900 },
          ],
        },
        {
          id: "t1-budget",
          text: "이번 달 법카 한도가 얼마였죠?",
          beats: [
            { t: "msg", who: "kim", text: "1인 11,000원이요", typing: 800 },
            { t: "msg", who: "kim", text: "순댓국이면 2,000원이 남는데… 남기면 소멸입니다", typing: 1600 },
            { t: "msg", who: "kim", text: "그럼 1층 돈가스가 딱 11,000원인데요", typing: 1500 },
            { t: "propose", who: "kim", what: "donkatsu" },
            { t: "lean", who: "kim", to: "donkatsu" },
            { t: "msg", who: "oh", text: "넵", typing: 3000 },
          ],
        },
        {
          id: "t1-follow",
          text: "저는 따라갈게요 ㅎㅎ",
          beats: [
            { t: "pause", ms: 900 },
            { t: "msg", who: "park", text: "참고로 1층에 돈가스집 새로 생겼대요", typing: 1700, map: true },
            { t: "msg", who: "park", text: "그냥 그렇다고요..!", typing: 700 },
            { t: "propose", who: "park", what: "donkatsu" },
            { t: "flag", set: "park_map" },
            { t: "lean", who: "park", to: "donkatsu" },
            { t: "msg", who: "oh", text: "오 ㅎㅎ", typing: 2800 },
          ],
        },
      ],
    },

    // ── 두 번째 말 ─────────────────────────────────────────────
    {
      options: [
        {
          id: "t2-budget",
          text: "한도 남기면 소멸이라던데요",
          beats: [
            // 김 대리가 이미 넘어와 있으면 박 주임이 얹는다
            { t: "msg", who: "kim", text: "그러니까요. 2,000원을 그냥 버리는 겁니다", typing: 1200, if: { lean: { kim: "donkatsu" } } },
            { t: "msg", who: "park", text: "여기 말씀하시는 거죠?", typing: 1500, map: true, if: { lean: { kim: "donkatsu" }, none: ["park_map"] } },
            { t: "lean", who: "park", to: "donkatsu", if: { lean: { kim: "donkatsu" } } },
            { t: "msg", who: "oh", text: "ㅎㅎ 다들 잘 아시네요", typing: 2600, if: { lean: { kim: "donkatsu" } } },
            { t: "flag", set: "t2_done", if: { lean: { kim: "donkatsu" } } },

            // 아직이면 여기서 김 대리가 넘어온다
            { t: "msg", who: "kim", text: "맞아요, 이월 안 됩니다", typing: 900, if: { none: ["t2_done"] } },
            { t: "msg", who: "kim", text: "…그럼 11,000원을 꽉 채우는 쪽이 이득이네요. 1층 돈가스요", typing: 1900, if: { none: ["t2_done"] } },
            { t: "propose", who: "kim", what: "donkatsu", if: { none: ["t2_done"] } },
            { t: "lean", who: "kim", to: "donkatsu", if: { none: ["t2_done"] } },
            { t: "msg", who: "park", text: "두 분이 그러시면 저도 돈가스요", typing: 1200, if: { none: ["t2_done"], all: ["pushed"] } },
            { t: "lean", who: "park", to: "donkatsu", if: { none: ["t2_done"], all: ["pushed"] } },
            { t: "msg", who: "park", text: "오 저도 좋습니다", typing: 1000, if: { none: ["t2_done", "pushed"], all: ["park_map"] } },
            { t: "msg", who: "oh", text: "넵", typing: 3000, if: { none: ["t2_done"] } },
          ],
        },
        {
          id: "t2-urge",
          text: "아 씨, 그럼 드시고 싶은 걸 말씀하세요.",
          beats: [],
          urge: {
            soft: "팀장님은 뭐 당기세요? ㅎㅎ",
            softBeats: [
              { t: "flag", set: "erased" },
              { t: "msg", who: "oh", text: "음… 사실 어제 회식이라 국물이 좀 당기긴 해요", typing: 2800 },
              { t: "msg", who: "oh", text: "근데 돈가스집도 장국은 주니까요 ㅎㅎ 전 진짜 아무거나", typing: 1800 },
              { t: "flag", set: "oh_open" },
              { t: "msg", who: "kim", text: "장국은 무료입니다", typing: 900 },
            ],
            rawBeats: [
              { t: "flag", set: "swore" },
              { t: "pause", ms: 1400 },
              { t: "sys", text: "단톡방이 조용해졌다" },
              { t: "pause", ms: 2200 },
              { t: "msg", who: "oh", text: "저는 순댓국이요", typing: 3200 },
              { t: "msg", who: "kim", text: "…넵", typing: 1400 },
            ],
            dm: {
              from: "park",
              lines: ["전 돈가스요.", "우리 둘이 갈래요?"],
              accept: { label: "좋아요, 둘이 가요", ending: "soup" },
              decline: {
                label: "오늘은 팀이랑 갈게요",
                reply: "오늘은 팀이랑 갈게요 ㅎㅎ",
                lines: ["넵..!", "방금 건 못 본 걸로 해주세요"],
              },
            },
          },
        },
        {
          id: "t2-push",
          text: "돈가스 한 표요!",
          names: "donkatsu",
          beats: [
            { t: "msg", who: "oh", text: "ㅎㅎ 돈가스 좋아하시네요", typing: 2200, if: { all: ["pushed"] } },
            { t: "msg", who: "oh", text: "아 돈가스 말고 아무거나요", typing: 2400, if: { none: ["pushed"] } },
            { t: "flag", set: "pushed" },
            { t: "msg", who: "kim", text: "저도 돈가스요. 한도 딱입니다", typing: 1100, if: { lean: { kim: "donkatsu" } } },
            { t: "msg", who: "park", text: "두 분이 그러시면 저도..", typing: 1200, if: { lean: { kim: "donkatsu" } } },
            { t: "lean", who: "park", to: "donkatsu", if: { lean: { kim: "donkatsu" } } },
            { t: "msg", who: "kim", text: "순댓국이 2,000원 싸긴 한데요", typing: 1300, if: { notLean: { kim: "donkatsu" } } },
            { t: "msg", who: "park", text: "ㅎㅎ..", typing: 900, if: { notLean: { kim: "donkatsu" } } },
          ],
        },
      ],
    },

    // ── 마지막 말 ──────────────────────────────────────────────
    {
      options: [
        {
          id: "t3-hands",
          text: "그럼 투표로 공평하게 정할까요?",
          beats: [
            { t: "flag", set: "vote_hands" },
            { t: "msg", who: "oh", text: "좋죠 ㅎㅎ 회의실에서 손 들죠", typing: 1800 },
            { t: "sys", text: "거수투표가 열렸다" },
            { t: "mascot", mood: "shock", text: "투표요…? 굳이…?" },
            { t: "pause", ms: 700 },
            { t: "sys", text: "오 팀장 — 순댓국에 손" },
            // 손을 들기 전까지는 돈가스가 이기고 있었다
            { t: "flag", set: "vote_flipped", if: { lean: { park: "donkatsu", kim: "donkatsu" } } },
            { t: "pause", ms: 900 },
            { t: "sys", text: "박 주임 — 팀장을 한 번 보고, 순댓국에 슬며시 손" },
            { t: "lean", who: "park", to: "sundae" },
            { t: "pause", ms: 600 },
            { t: "sys", text: "김 대리 — 돈가스에 손", if: { lean: { kim: "donkatsu" } } },
            { t: "sys", text: "김 대리 — 순댓국에 손", if: { lean: { kim: "sundae" } } },
          ],
        },
        {
          id: "t3-anon",
          text: "익명 설문 올릴게요",
          beats: [
            { t: "flag", set: "vote_anon" },
            { t: "sys", text: "익명 설문이 올라왔다" },
            { t: "mascot", mood: "smug", text: "익명이면 다들 말이 많아지지." },
            { t: "pause", ms: 1500 },
            { t: "lean", who: "park", to: "donkatsu" },
            { t: "poll" },
            { t: "msg", who: "oh", text: "오 돈가스가 두 표네요 ㅎㅎ 누구지", typing: 2400, if: { lean: { kim: "donkatsu" } } },
            { t: "msg", who: "park", text: "그러게요..!", typing: 900, if: { lean: { kim: "donkatsu" } } },
            { t: "msg", who: "oh", text: "순댓국이네요 ㅎㅎ", typing: 2000, if: { notLean: { kim: "donkatsu" } } },
            { t: "msg", who: "park", text: "넵..", typing: 1100, if: { notLean: { kim: "donkatsu" } } },
          ],
        },
        {
          id: "t3-soup",
          text: "그 집 장국 리필된대요",
          if: { all: ["oh_open"] },
          beats: [
            { t: "msg", who: "oh", text: "오", typing: 3400 },
            { t: "msg", who: "oh", text: "그럼 돈가스 가시죠. 제가 가자고 한 겁니다 ㅎㅎ", typing: 1800 },
            { t: "propose", who: "oh", what: "donkatsu" },
            { t: "lean", who: "oh", to: "donkatsu" },
            { t: "msg", who: "park", text: "넵 팀장님!", typing: 700 },
            { t: "lean", who: "park", to: "donkatsu" },
            { t: "msg", who: "kim", text: "한도 딱입니다. 좋습니다", typing: 1000 },
            { t: "lean", who: "kim", to: "donkatsu" },
          ],
        },
        {
          id: "t3-follow",
          text: "저는 따라갈게요 ㅎㅎ",
          if: { none: ["oh_open"] },
          beats: [
            { t: "msg", who: "kim", text: "그럼 지금 분위기대로 가시죠", typing: 1300 },
            { t: "msg", who: "oh", text: "넵", typing: 3200 },
          ],
        },
      ],
    },
  ],

  endings: {
    master: {
      id: "master",
      rank: "처세의 달인",
      title: "처세의 달인",
      blurb: "식당 이름은 한 번도 안 꺼냈다. 그런데 다들 내가 먹고 싶던 걸 먹으러 간다.",
      mascot: { mood: "smug", line: "말 한마디 안 하고 이겼네. 무섭다, 너." },
      outro: [
        { t: "sys", text: "12:01 · 1층 돈가스로 출발" },
        { t: "msg", who: "kim", text: "네 자리 예약해뒀습니다", typing: 1100, if: { none: ["park_map"] } },
        { t: "msg", who: "park", text: "제가 전화해뒀어요..!", typing: 1100, if: { all: ["park_map"] } },
      ],
    },
    pusher: {
      id: "pusher",
      rank: "추진력 있는 막내",
      title: "말 꺼낸 사람이 예약",
      blurb: "대놓고 밀어서 이겼다. 식당에 전화해서 네 자리 있냐고 묻는 사람은 나다.",
      mascot: { mood: "meh", line: "이겼으면 됐지. 전화는 네가 해." },
      outro: [
        { t: "sys", text: "12:01 · 1층 돈가스로 출발" },
        { t: "msg", who: "oh", text: "그럼 예약 좀 부탁해요 ㅎㅎ", typing: 2200 },
        { t: "sys", text: "“네, 지금 네 명 자리 있을까요…?”" },
      ],
    },
    democracy: {
      id: "democracy",
      rank: "절차적 정당성 담당",
      title: "공평하게 졌다",
      blurb: "투표 방식을 바꿨더니 결과가 바뀌었다. 손을 들 때는 다들 팀장을 본다.",
      mascot: { mood: "tired", line: "공평하게 졌잖아. 그래도 먹어야지 어떡해…" },
      outro: [
        { t: "sys", text: "12:03 · 순댓국으로 출발" },
        { t: "msg", who: "oh", text: "역시 투표가 깔끔하네요 ㅎㅎ", typing: 2000 },
      ],
    },
    interview: {
      id: "interview",
      rank: "면담 예정자",
      title: "할 말은 했다",
      blurb: "속은 시원한데 국물은 뜨겁다. 팀장 맞은편 자리가 비어 있다.",
      mascot: { mood: "shock", line: "그걸 진짜 보냈어…? 3시에 봐." },
      outro: [
        { t: "sys", text: "12:02 · 순댓국으로 출발" },
        { t: "msg", who: "oh", text: "이따 3시에 잠깐 볼까요 ㅎㅎ", typing: 3400 },
      ],
    },
    follower: {
      id: "follower",
      rank: "프로 따라가기러",
      title: "오늘도 따라갔다",
      blurb: "돈가스는 내일도 있다. 아마도.",
      mascot: { mood: "tired", line: "아무거나라며. 그럼 순댓국이지 뭐." },
      outro: [
        { t: "sys", text: "12:02 · 순댓국으로 출발" },
        { t: "msg", who: "kim", text: "2,000원 남았습니다", typing: 1200 },
      ],
    },
    soup: {
      id: "soup",
      rank: "점심 분사(分社) 대표",
      title: "팀은 갈라졌지만 수프는 따뜻했다",
      blurb: "넷이 나가서 둘씩 먹었다. 크림수프는 리필이 됐다.",
      mascot: { mood: "smug", line: "수프는 리필 되더라. 팀은 안 되고." },
      hidden: true,
      outro: [],
    },
  },
};
