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
