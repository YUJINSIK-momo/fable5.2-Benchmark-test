const ID_KEY = "amugeona:player";
const NICK_KEY = "amugeona:nickname";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장이 막힌 환경에서는 이번 접속 동안만 유지된다
  }
}

let memoryId: string | null = null;

/** 이 기기를 가리키는 id. 서버에서 사람을 구분하는 유일한 값이라 화면에 내보이지 않는다. */
export function playerId(): string {
  const saved = read(ID_KEY) ?? memoryId;
  if (saved) return saved;
  memoryId = crypto.randomUUID();
  write(ID_KEY, memoryId);
  return memoryId;
}

export function loadNickname(): string {
  return read(NICK_KEY) ?? "";
}

export function saveNickname(name: string): string {
  const clean = name.trim().slice(0, 12);
  write(NICK_KEY, clean);
  return clean;
}

export async function copyText(text: string): Promise<boolean> {
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
