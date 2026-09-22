# 갈래 — 계통수 분류 게임

영문 Wikipedia, Wikidata, Wikimedia Commons 데이터를 바탕으로 동물을 실제 계통수에 배치하는 게임입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub와 Vercel 배포

1. 이 폴더를 GitHub 저장소에 push합니다.
2. Vercel에서 해당 저장소를 Import합니다.
3. Framework Preset은 `Next.js`, Build Command는 `npm run build`를 사용합니다.
4. 별도 환경 변수 없이 배포할 수 있습니다.

이 Vercel용 사본은 정적 배포이므로 게임 계정, 수집 카드, 리더보드는 각 브라우저의 `localStorage`에만 저장됩니다. 브라우저 데이터를 지우거나 다른 기기로 이동하면 공유되지 않습니다. ChatGPT 계정 연결은 OpenAI Sites 배포본에서만 지원됩니다.

## 데이터 출처와 라이선스

- English Wikipedia 설명: CC BY-SA 4.0
- Wikidata 구조화 데이터: CC0 1.0
- Wikimedia Commons 이미지: 카드에 표시된 파일별 라이선스와 저작자 조건 적용

각 생물 레코드는 원문 문서, 고정 리비전 및 Commons 파일 출처를 포함합니다.
