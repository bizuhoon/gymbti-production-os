# GYMBTI Production OS

GYMBTI 콘텐츠를 기획부터 제작 프롬프트까지 관리하는 독립형 콘텐츠 운영 시스템입니다.

- Live: https://gymbti-production-os.netlify.app
- Source: https://github.com/bizuhoon/gymbti-production-os

## What it includes

- 93개 에피소드 포트폴리오와 상태 추적
- BRIEF, DRAFT, 독립 QC 결과 조회
- Scene별 Flow 이미지 및 Grok 영상 프롬프트
- Instagram, YouTube Shorts, TikTok, Naver Clip 게시 문구
- 16개 MBTI 캐릭터 정본 에셋

## Production flow

1. 에피소드 선택
2. BRIEF와 DRAFT 검토
3. 독립 QC 확인
4. Scene별 프롬프트 복사
5. Flow에서 이미지 생성
6. 필요한 Scene만 Grok AI 영상 생성
7. 편집 및 발행

이 저장소는 공개 포트폴리오용 정적 빌드입니다. 로컬 운영 경로, 비공개 자료, CoreGym 워크플로우는 포함하지 않습니다.

## Local preview

```powershell
python -m http.server 7791
```

브라우저에서 `http://localhost:7791`을 엽니다.

## Stack

Static HTML, CSS, JavaScript, JSON, Netlify
