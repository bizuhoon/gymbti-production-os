// QC 14대 항목 중 12개의 기계적(정규식/문자열) 검증 로직 — 브라우저(index.html PRE-QC 카드)와
// 서버(server.js run-qc 엔드포인트, task #12) 양쪽에서 동일 구현을 공유하기 위해 분리.
// 13/14번(출처 화이트리스트 대조, brand_data 수치 무결성)은 LLM 판단이 필요해 여기서는 항상 ⚠️로만 표시.
// DOM/fetch 등 환경 종속 코드를 두지 않는다 — 순수 문자열 입력 → 체크 배열 출력.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QC = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // md: DRAFT MD 전체 텍스트
  // opts.expectedCode: CTX 패널의 발행 코드(post_code) — 없으면 대조 생략
  // opts.n45: N4.5 JSON(파싱된 객체) — confirmed_title/geo_citation_hooks 대조용, 없으면 해당 항목 ⚠️
  // opts.credentials: 브랜드의 트레이너/원장 크레덴셜 원문 — 브랜드마다 다르므로 호출자가 반드시 전달
  function runChecks(md, opts) {
    opts = opts || {};
    const expectedCode = (opts.expectedCode || '').trim();
    const n45 = opts.n45 || null;
    const credentials = opts.credentials || null;
    const checks = [];

    // 1. 파일명 형식 + 발행코드 일치
    const fileMatch = /^#\s*파일명:\s*([0-9]{2}\.[0-9]{2}\.W[1-4]-[1-4])/m.exec(md);
    if (!fileMatch) checks.push(['파일명 형식', false, '최상단에 "# 파일명: YY.MM.WN-N" 줄을 찾지 못함']);
    else if (expectedCode && fileMatch[1] !== expectedCode) checks.push(['파일명 형식', false, `파일명(${fileMatch[1]})이 발행코드(${expectedCode})와 다름`]);
    else checks.push(['파일명 형식', true, fileMatch[1]]);

    // 2. confirmed_title 고정
    if (n45 && n45.confirmed_title) checks.push(['confirmed_title 고정', md.includes(n45.confirmed_title), n45.confirmed_title]);
    else checks.push(['confirmed_title 고정', null, 'n45_output이 없어 자동 대조 불가']);

    // 3. GEO citation hooks 원문 그대로 포함
    if (n45 && Array.isArray(n45.geo_citation_hooks) && n45.geo_citation_hooks.length) {
      const missing = n45.geo_citation_hooks.filter(h => !md.includes(String(h).trim()));
      checks.push(['GEO Citation Hooks', missing.length === 0, missing.length ? `${missing.length}개 훅이 원문 그대로 발견 안 됨` : `${n45.geo_citation_hooks.length}개 전부 원문 일치`]);
    } else {
      checks.push(['GEO Citation Hooks', null, 'n45_output이 없어 자동 대조 불가']);
    }

    // 4. FAQ 10개 — "Q1./Q1:" 번호형과 "**Q:**" 무번호형(볼드 Q 뒤 콜론, 번호 없음) 둘 다 유효한 실제 출력
    // 형식이다 (2026-07-07: 무번호형만 써서 0개로 오탐하는 사고 확인 — Node 5가 번호를 안 붙이는 경우가 실제로 있음).
    const faqQs = Math.max(
      (md.match(/\*\*Q\d+[.:]/g) || []).length,
      (md.match(/^Q\d+[.:]/gm) || []).length,
      (md.match(/\*\*Q[.:：]/g) || []).length,
      (md.match(/^Q[.:：]/gm) || []).length
    );
    checks.push(['FAQ 10개', faqQs === 10, `질문 ${faqQs}개 발견`]);

    // 5. 교정 프로토콜 Step 1~5
    const stepsOk = [1, 2, 3, 4, 5].every(n => new RegExp('Step\\s*' + n + '\\b').test(md));
    checks.push(['교정 프로토콜 Step 1~5', stepsOk, stepsOk ? '5단계 전부 발견' : 'Step 1~5 중 일부 누락']);

    // 6. 역학 비교표 (최소 4데이터행)
    const tableLines = (md.match(/^\|.+\|$/gm) || []).filter(l => !/^\|[\s\-:|]+\|$/.test(l));
    const dataRows = Math.max(0, tableLines.length - 1);
    checks.push(['역학 비교표 (4행 이상)', dataRows >= 4, `데이터 행 약 ${dataRows}개`]);

    // 7. 셀프 체크리스트 5항목
    const checkboxCount = (md.match(/^- \[ \]/gm) || []).length;
    checks.push(['셀프 체크리스트 ([ ] 5개)', checkboxCount === 5, `${checkboxCount}개 발견`]);

    // 8. 이미지 마커 12~15개 (이 패턴 그대로 Node 6 image-prompt 추출에도 재사용 가능)
    const imageMarkers = (md.match(/\[이미지\s*\d+\s*[:：][^\]]*\|[^\]]*\]/g) || []);
    checks.push(['이미지 마커 (12~15개)', imageMarkers.length >= 12 && imageMarkers.length <= 15, `${imageMarkers.length}개 발견`]);

    // 9. 트레이너/원장 크레덴셜 원문
    if (credentials) {
      checks.push(['크레덴셜 원문', md.includes(credentials), md.includes(credentials) ? '원문 일치' : '원문과 다르거나 누락 — 축약/변형 의심']);
    } else {
      checks.push(['크레덴셜 원문', null, '브랜드 크레덴셜 정보 없음 — 대조 불가']);
    }

    // 10. 카드뉴스 디자인 코드 배제
    const hasDesignCode = /#[0-9A-Fa-f]{6}\b/.test(md) || /\b\d+\s?pt\b/.test(md);
    checks.push(['카드뉴스 디자인 코드 배제', !hasDesignCode, hasDesignCode ? '컬러코드(#HEX) 또는 pt 폰트크기 표기 발견' : '디자인 수치 없음']);

    // 11. 블로그 발행 조립 순서 섹션
    checks.push(['블로그 발행 조립 순서 포함', md.includes('블로그 발행 조립 순서'), null]);

    // 12. 카드뉴스 하단 고정 문구 완성형 (핵심내용 3개 항목까지)
    const hasFixedNote = md.includes('핵심내용');
    checks.push(['카드뉴스 하단 고정 문구', hasFixedNote, hasFixedNote ? '🔎 핵심내용 섹션 발견 — 3개 항목 짤림 여부는 직접 확인' : '🔎 핵심내용 섹션 못 찾음']);

    // 13. 해시태그 섹션 존재 + 개수 (블로그 발행 조립 순서 10번 항목 — 2026-07-02 W1-4 완전 누락 사고로 신설)
    // 2026-07-03 v1.4: 플랫폼별 상한 하향(IG 3~5, 네이버 3~4 — Instagram 플랫폼 강제 상한 포함) 이후
    // 문서 전체(블로그+IG오피셜+IG퍼스널) 합산 기대치는 대략 9~14개. 6 미만이면 섹션 누락 의심,
    // 20 초과면 옛 15개×3 관행이 되살아난 것으로 의심 — 둘 다 Fail 처리.
    const hashtagTokens = (md.match(/#[가-힣A-Za-z0-9_]+/g) || []).filter(t => !/^#[0-9A-Fa-f]{6}$/.test(t));
    const htCount = hashtagTokens.length;
    checks.push(['해시태그 (문서 합산 6~20개 — 플랫폼별 상한은 별도 확인 필요)', htCount >= 6 && htCount <= 20, `${htCount}개 발견`]);

    // 2026-07-03: "확인 필요"만 단독으로 매칭하면 citation_sources_anatomy_series.md가 요구하는
    // 정상 문구("의료 전문가 및 물리치료사 상담 권유" 류의 "…확인 필요" 표현)까지 오탐한다.
    // "출처"라는 단어가 반드시 붙어 있는 패턴만 매칭 — [cite: N] 자동 각주 패턴도 그대로 포함.
    const unresolvedCitation = /\[?\s*출처\s*확인\s*필요\s*\]?|\[cite:\s*\d+\]/i.test(md);
    checks.push(['미해결 citation 마커 금지', !unresolvedCitation, unresolvedCitation ? '출처 확인 필요/[cite:N] 마커 발견' : '미해결 citation 마커 없음']);

    // 14/15 — 기계적으로 판단 불가, 항상 ⚠️ (실제 판정은 LLM 호출 쪽, 예: task #12의 run-qc 엔드포인트)
    checks.push(['승인된 참고문헌(SRC) 외 인용 여부', null, '화이트리스트 대조 필요 — LLM 검증 단계에서만 가능']);
    checks.push(['Brand Data 수치 무결성', null, 'brand_data.md 전체 대조 필요 — LLM 검증 단계에서만 가능']);

    return checks;
  }

  // [이미지 N: 설명 | 목적] 마커 추출 — Node 6 이미지 프롬프트 생성(task #12)이 PDF 없이 텍스트만으로 동작하게 해줌
  function extractImageMarkers(md) {
    return (md.match(/\[이미지\s*\d+\s*[:：][^\]]*\|[^\]]*\]/g) || []);
  }

  return { runChecks, extractImageMarkers };
});
