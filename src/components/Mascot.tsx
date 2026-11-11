export type Mood = "meh" | "smug" | "tired" | "shock";

/**
 * 넵무새. 뭘 물어도 "넵"이라고만 하는 사내 마스코트.
 * 표정은 눈꺼풀 높이와 부리 모양으로만 바뀐다.
 */
export function Mascot({ mood = "meh", line, small }: { mood?: Mood; line?: string; small?: boolean }) {
  return (
    <div className={`mascot m-${mood} ${small ? "small" : ""}`}>
      {line && <p className="mascot-line">{line}</p>}
      <svg viewBox="0 0 200 215" role="img" aria-label="넵무새">
        <defs>
          <radialGradient id="nm-body" cx="38%" cy="28%" r="80%">
            <stop offset="0" stopColor="#f6d77a" />
            <stop offset="0.6" stopColor="#e9b949" />
            <stop offset="1" stopColor="#c8922c" />
          </radialGradient>
          <radialGradient id="nm-belly" cx="45%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset="1" stopColor="#f1e3c4" />
          </radialGradient>
          <clipPath id="nm-eye-l">
            <ellipse cx="72" cy="98" rx="10" ry="11" />
          </clipPath>
          <clipPath id="nm-eye-r">
            <ellipse cx="128" cy="98" rx="10" ry="11" />
          </clipPath>
        </defs>

        <ellipse cx="100" cy="204" rx="56" ry="8" fill="rgba(30,27,22,.16)" />
        <g className="nm-bob">
          <path className="nm-tuft" d="M97 44c-6-14-2-24 6-30M104 45c2-12 9-18 18-19" fill="none" stroke="#a8741c" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="62" cy="194" rx="15" ry="7" fill="#e2602a" />
          <ellipse cx="138" cy="194" rx="15" ry="7" fill="#e2602a" />
          <ellipse cx="100" cy="122" rx="72" ry="78" fill="url(#nm-body)" />
          <ellipse className="nm-wing l" cx="31" cy="140" rx="12" ry="27" fill="#d7a238" />
          <ellipse className="nm-wing r" cx="169" cy="140" rx="12" ry="27" fill="#d7a238" />
          <ellipse cx="100" cy="155" rx="43" ry="40" fill="url(#nm-belly)" />

          {/* 사원증 */}
          <path d="M66 112 100 150 134 112" fill="none" stroke="#2c5a4c" strokeWidth="4" strokeLinecap="round" />
          <rect x="84" y="148" width="32" height="24" rx="4" fill="#fffdf8" stroke="#2c5a4c" strokeWidth="2.5" />
          <text x="100" y="166" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e1b16">넵</text>

          {/* 눈 */}
          <g clipPath="url(#nm-eye-l)">
            <ellipse cx="72" cy="98" rx="10" ry="11" fill="#1e1b16" />
            <circle cx="75" cy="94" r="3" fill="#fff" />
            <rect className="nm-lid" x="58" y="64" width="28" height="23" fill="#e9b949" />
          </g>
          <g clipPath="url(#nm-eye-r)">
            <ellipse cx="128" cy="98" rx="10" ry="11" fill="#1e1b16" />
            <circle cx="131" cy="94" r="3" fill="#fff" />
            <rect className="nm-lid" x="114" y="64" width="28" height="23" fill="#e9b949" />
          </g>
          <path className="nm-brow" d="M118 80q10-7 20-1" fill="none" stroke="#a8741c" strokeWidth="4" strokeLinecap="round" />

          {/* 부리 */}
          <path className="nm-beak" d="M88 113q12-7 24 0-4 12-12 13-8-1-12-13z" fill="#e2602a" />
          <path className="nm-mouth" d="M92 118q8 3 16 0" fill="none" stroke="#9c3d16" strokeWidth="2" strokeLinecap="round" />

          <path className="nm-sweat" d="M152 62q7 10 0 15-7-5 0-15z" fill="#9cc7e0" />
        </g>
        <g className="nm-sigh" fill="#fff" opacity="0">
          <circle cx="150" cy="120" r="5" />
          <circle cx="162" cy="112" r="7" />
        </g>
      </svg>
    </div>
  );
}
