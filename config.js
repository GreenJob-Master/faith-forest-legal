// 계정 삭제 페이지 설정. 값은 앱과 같은 Supabase 프로젝트 주소·공개 키와 문의 이메일이다(P4-3에서 채움).
// publishableKey에는 공개 키(sb_publishable_… 또는 anon)만 넣는다. 비밀 키(sb_secret_…, service_role)는 절대 넣지 않는다.
// oauthProviders: 켠 로그인만 적는다. 예: ["google", "kakao"]
window.FF_SITE = {
  supabaseUrl: "https://fhmkxgyidxbxxoybqbfp.supabase.co",
  publishableKey: "sb_publishable_z5cA1-YQwjsg4SUih06DEA_xyiAdiHi",
  oauthProviders: [],
  supportEmail: "support@greenjlab.com",
};
