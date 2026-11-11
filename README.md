# 아무거나요㈜

내가 먹고 싶은 점심을, 남이 먼저 가자고 말하게 만드는 1분짜리 직장인 눈치 게임.
첫 시제품이라 월요일(법카 한도) 한 판만 들어 있다.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # out/ 에 정적 파일 생성
```

- 대사와 선택 결과는 `src/game/scenarios/monday.ts` 한 파일에 적혀 있다. 요일을 늘릴 때는 같은 모양의 파일을 추가하고 `scenarios/index.ts` 에 요일을 연결한다.
- 판정 규칙(조건 확인, 집계, 엔딩 결정)은 `src/game/engine.ts`.
- `main` 에 push 하면 GitHub Actions 가 GitHub Pages 로 배포한다. 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 한 번 바꿔둬야 한다.

## DB (Supabase)

- 오늘의 엔딩 분포, 닉네임 랭킹, 진짜 점심 투표방이 Supabase 프로젝트 `amugeona` 에 저장된다.
- 테이블과 함수는 `supabase/schema.sql` 한 파일이다. 고친 뒤에는 대시보드 SQL Editor 에 붙여 넣어 다시 실행한다(여러 번 실행해도 된다).
- 로그인이 없다. 테이블은 RLS 로 잠겨 있고, 앱은 공개 키로 함수만 부른다(`src/lib/db.ts`). 주소를 아는 사람은 누구나 기록을 남길 수 있으므로 민감한 내용은 담지 않는다.
- 다른 프로젝트에 붙이려면 빌드할 때 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY` 를 준다.
