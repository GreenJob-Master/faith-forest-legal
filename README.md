# 믿음의 숲 약관·정책 웹페이지

GitHub Pages에 올리는 정적 파일입니다. 앱 번들에는 들어가지 않습니다.
모든 문서는 **초안 — 공개 출시 전 법률 점검 예정**입니다.

| 파일 | 내용 | 앱의 주소(`LEGAL_URLS`) |
|---|---|---|
| `index.html` | 문서 목록, 운영자 정보 | — |
| `terms.html` | 이용약관 | `terms` |
| `privacy.html` | 개인정보처리방침 | `privacy` |
| `sensitive.html` | 민감정보(종교·신앙) 처리 동의 | `sensitive` |
| `overseas.html` | 개인정보 국외 이전 안내 | `overseas` |
| `delete-account.html` | 계정 삭제 안내와 웹 삭제 | `delete-account` |
| `style.css` | 공통 스타일(본문 17px, 누르는 곳 48px 이상) | — |
| `config.js` | 웹 삭제 설정(Supabase 주소·공개 키·로그인 제공자·연락 이메일) | — |
| `delete-account.js` | 웹 삭제 흐름(로그인 → 확인 → `delete_my_account`) | — |

GitHub Pages는 `/legal/terms` 요청에 `terms.html`을 돌려주므로, 앱의 주소에는 `.html`을 붙이지 않습니다.

## 올리는 방법

`docs/guides/04-github-pages.md`를 따릅니다. **이 폴더 안의 파일만** 올리고, 앱 저장소는 올리지 않습니다.

## 사업자 정보와 설정 값 (P4-3, 2026-11-14에 채움)

| 항목 | 들어 있는 곳 | 지킬 것 |
|---|---|---|
| 상호·대표자·사업자등록번호·주소 | 모든 문서의 위쪽 `운영:`과 바닥글, `index.html`의 운영자 정보 | 상호는 스토어에 보이는 개발자 이름과 같게 |
| 문의 이메일 | 모든 문서의 `mailto:`, `config.js`의 `supportEmail` | 앱의 `SUPPORT_EMAIL`과 같게 |
| 개인정보 보호책임자 | `privacy.html` | 이름(직책) |
| 시행일 | `terms`·`privacy`·`sensitive`·`overseas` | 네 문서가 같은 날짜 |
| Supabase 주소·공개 키 | `config.js` | 앱의 `.env.local`과 같은 값 |

- 값을 바꾸면 `src/features/legal/__tests__/sitePages.test.ts`의 `BUSINESS`도 같이 바꿉니다. 테스트가 모든 문서의 바닥글·이메일·시행일이 같은지 봅니다.
- `config.js`에는 **공개 키만** 넣습니다. 비밀 키(`sb_secret_…`, `service_role`)는 절대 넣지 않습니다(테스트가 비밀 키 모양을 찾으면 실패).
- `config.js`의 주소나 공개 키가 비었거나 자리표시(두 겹 대괄호)가 남아 있으면 웹 삭제는 "지금은 이 페이지에서 삭제할 수 없어요"를 보이고, 앱·이메일 경로만 안내합니다.
- Google·카카오 로그인을 켜면 `config.js`의 `oauthProviders`에 `"google"`, `"kakao"`를 적고, Supabase의 Redirect URLs에 `https://<아이디>.github.io/**`를 더합니다.

## 게시 전 확인 (문서의 문장이 사실이 되려면)

문서는 지금 구현된 시스템만 적습니다. 아래는 운영자 설정이 끝나야 사실이 되므로, 게시(P4-3) 전에 확인합니다.

- 증빙 사진 90일 삭제, 빈 교회 30일 삭제: `docs/guides/05-supabase-jobs-and-alerts.md`의 Vault 값(주소·비밀 키)을 넣어야 파일이 지워집니다.
- 인증 메일(Gmail): 가이드 08의 SMTP 설정, 그리고 보낸편지함의 인증 메일 사본을 한 달에 한 번 지우는 운영자 일.
- 인증 보안 기록(30일이 지나면 하루 안에 지움): 정해짐. 정리 작업이 30일 지난 기록을 지우고, 운영자가 DB 기록 쓰기를 끕니다(`docs/guides/05-supabase-jobs-and-alerts.md`의 "인증 보안 기록" 절).
- 이메일 탈퇴 요청(7일 안): `docs/guides/04-github-pages.md`의 **"탈퇴 요청 메일 처리하기"** 절차로 처리합니다. 대시보드에서 사용자를 직접 지우지 않습니다.
- 공지: 약관·처리방침이 바뀌면 이 페이지에 게시하고 회원의 이메일로 알립니다(앱 안 공지 기능은 없습니다).

## 바꿀 때 지킬 것

- `delete-account.js`의 오류 문구는 앱(`src/lib/errors.ts`, `src/features/auth/authErrors.ts`)과 같은 문장입니다. 앱 문구를 바꾸면 여기도 바꿉니다.
- supabase-js는 jsDelivr의 고정 버전(`@2.118.0`)과 무결성 값(`integrity`)으로 받습니다. 버전을 바꾸면 무결성 값도 다시 계산합니다.
- `delete-account.html`의 보안 정책(`Content-Security-Policy`)은 `https://*.supabase.co`에만 연결을 허용합니다. 셀프호스팅으로 서버 주소가 바뀌면 이 값도 바꿉니다.
- 웹 삭제의 로그인 상태와 PKCE 값은 그 탭의 `sessionStorage`에만 둡니다(보통 탭을 닫으면 사라지지만, 브라우저가 탭을 되살리면 남을 수 있음). `localStorage`로 바꾸지 않습니다.
- 이 폴더는 `npm test`(`src/features/legal/__tests__/sitePages.test.ts`, `deleteAccountPage.test.ts`, `deleteAccountBoot.test.ts`)가 검사합니다. 린트는 이 폴더를 보지 않습니다.
