/*
 * 믿음의 숲 웹 계정 삭제: 앱 없이 로그인해 `delete_my_account`를 부른다. 브라우저에서는 window.FFDelete,
 * 테스트(jest)에서는 module.exports. 흐름: 로그인 → 계정 이메일 확인 → `삭제` 입력 → 삭제 → 이 브라우저 로그아웃 → 완료.
 */
(function () {
  "use strict";

  // 앱과 같은 문장(src/lib/errors.ts, src/features/auth/authErrors.ts). 바꿀 때는 앱과 함께 바꾼다.
  var GENERIC = "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.";
  var MESSAGES = {
    FF_SENIOR_MUST_TRANSFER: "담임목사는 먼저 다른 목회자에게 담임목사를 넘겨 주세요.",
    FF_LAST_ADMIN: "마지막 관리자는 해제할 수 없어요.",
    FF_INVALID_STATE: "지금은 할 수 없는 작업이에요.",
    FF_NOT_ALLOWED: "권한이 없어요.",
    invalid_credentials: "이메일 또는 비밀번호가 올바르지 않아요.",
    email_not_confirmed: "이메일 인증이 아직 끝나지 않았어요. 받은 편지함을 확인해 주세요.",
    over_request_rate_limit: "요청이 너무 많아요. 잠시 뒤에 다시 시도해 주세요.",
    validation_failed: "입력한 내용을 다시 확인해 주세요.",
    network: "인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
    oauth_failed: "로그인을 마치지 못했어요. 다시 시도해 주세요.",
    provider_disabled: "이 로그인 방법은 아직 준비 중이에요.",
  };
  var CONFIRM_WORD = "삭제", CONFIRM_MISSING = "확인을 위해 삭제라고 적어 주세요."; // 이 페이지에만 있는 안내
  var HINTS = {
    FF_SENIOR_MUST_TRANSFER: "앱의 사역 워크스페이스 → 역할 관리에서 담임목사 넘기기를 마친 뒤 다시 시도해 주세요.",
    FF_LAST_ADMIN: "앱의 사역 워크스페이스 → 역할 관리에서 다른 분을 관리자로 지정한 뒤 다시 시도해 주세요.",
  };
  var PROVIDERS = ["google", "kakao"], FF_CODE = /FF_[A-Z0-9_]+/g;

  function has(obj, key) { return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key); }

  /** 오류 코드(`FF_…` 또는 인증 오류 code)에 맞는 한국어 문구. 모르는 코드는 기본 문구. */
  function messageFor(code) { return has(MESSAGES, code) ? MESSAGES[code] : GENERIC; }

  function field(e, key) { return e && typeof e === "object" && typeof e[key] === "string" ? e[key] : ""; }

  /** 문구 열쇠: 글 속 `FF_` 코드(RPC 오류는 message에 담김) → 인증 오류 code → 제공자 꺼짐 → 연결 실패. */
  function codeOf(e) {
    var message = field(e, "message");
    var codes = (message.match(FF_CODE) || []).filter(function (c) { return has(MESSAGES, c); });
    if (codes.length > 0) return codes[0];
    if (has(MESSAGES, field(e, "code"))) return field(e, "code");
    if (message.indexOf("provider is not enabled") >= 0) return "provider_disabled";
    var offline = field(e, "name") === "AuthRetryableFetchError" || /network request failed|failed to fetch/i.test(message);
    return offline ? "network" : "";
  }

  /**
   * 삭제 흐름. `client`는 supabase-js 클라이언트 모양, `ui(state)`는 상태가 바뀔 때마다 불린다.
   * state: { step: "signin" | "confirm" | "done", email, error, hint, busy }
   */
  function createDeleteFlow(client, ui) {
    var state = { step: "signin", email: "", error: "", hint: "", busy: false };

    function set(patch) {
      var next = {};
      for (var key in state) next[key] = has(patch, key) ? patch[key] : state[key];
      state = next;
      ui(state);
    }

    var signedIn = function (user) { set({ step: "confirm", email: (user && user.email) || "", error: "", hint: "", busy: false }); };

    /** 한 번에 한 동작만. 바쁜 표시는 기다리기 전에 켜서, 빠르게 두 번 눌러도 한 번만 보낸다. */
    async function guarded(task) {
      if (state.busy) return;
      set({ busy: true, error: "", hint: "" });
      try { await task(); } catch (e) {
        var code = codeOf(e);
        set({ error: messageFor(code), hint: HINTS[code] || "", busy: false });
      }
    }

    /** 이 브라우저의 세션만 지운다(앱과 같은 `scope: "local"`). 실패해도 이어 간다: 남은 세션은 서버가 받아 주지 않는다. */
    async function signOutHere() {
      try { await client.auth.signOut({ scope: "local" }); } catch (e) { /* 이어 간다 */ }
    }

    return {
      state: function () { return state; },
      /** 처음 열 때(Google·카카오에서 돌아왔을 때 포함): 세션이 있으면 바로 확인 단계로. */
      start: function (options) {
        var oauthError = Boolean(options && options.oauthError);
        return guarded(async function () {
          var res = await client.auth.getSession();
          var session = res && res.data ? res.data.session : null;
          if (session && session.user) return signedIn(session.user);
          set({ step: "signin", busy: false, error: oauthError ? MESSAGES.oauth_failed : "" });
        });
      },
      signIn: function (email, password) {
        return guarded(async function () {
          var res = await client.auth.signInWithPassword({ email: String(email || "").trim(), password: password });
          if (res.error) throw res.error;
          signedIn(res.data && res.data.user);
        });
      },
      /** 제공자 화면으로 넘어간다. 돌아오면 `start`가 세션을 읽는다(PKCE, detectSessionInUrl). */
      signInWith: function (provider, redirectTo) {
        if (PROVIDERS.indexOf(provider) < 0) return Promise.resolve();
        return guarded(async function () {
          var options = { redirectTo: redirectTo };
          if (provider === "google") options.queryParams = { prompt: "select_account" };
          var res = await client.auth.signInWithOAuth({ provider: provider, options: options });
          if (res.error) throw res.error;
        });
      },
      confirm: function (typed) {
        if (state.busy) return Promise.resolve();
        if (String(typed || "").trim() !== CONFIRM_WORD) return Promise.resolve(set({ error: CONFIRM_MISSING, hint: "" }));
        return guarded(async function () {
          var res = await client.rpc("delete_my_account");
          if (res.error) throw res.error;
          await signOutHere();
          set({ step: "done", email: "", error: "", hint: "", busy: false });
        });
      },
      switchAccount: function () {
        return guarded(async function () {
          await signOutHere();
          set({ step: "signin", email: "", busy: false });
        });
      },
    };
  }

  // ---- 브라우저 화면 연결 ----
  function render(root, s) {
    root.setAttribute("aria-busy", s.busy ? "true" : "false");
    root.querySelectorAll("[data-step]").forEach(function (el) { el.hidden = el.getAttribute("data-step") !== s.step; });
    root.querySelectorAll("button, input").forEach(function (el) { el.disabled = s.busy; });
    root.querySelector("[data-field=email]").textContent = s.email || "이메일 정보가 없는 계정";
    root.querySelector("[data-field=error]").textContent = s.error;
    root.querySelector("[data-field=hint]").textContent = s.hint;
    if (s.step === root.getAttribute("data-shown")) return;
    root.setAttribute("data-shown", s.step);
    // 단계가 바뀌면 그 단계의 제목으로 초점을 옮겨 화면 낭독기가 읽게 한다(처음 열 때는 옮기지 않는다).
    var heading = root.querySelector("[data-step=" + s.step + "] h3");
    if (heading && root.getAttribute("data-started") === "yes") heading.focus();
  }

  function boot(win, doc) {
    var root = doc.getElementById("web-delete");
    if (!root) return;
    var cfg = win.FF_SITE || {};
    var support = String(cfg.supportEmail || "");
    if (support.indexOf("@") > 0 && support.indexOf("[[") < 0) {
      doc.querySelectorAll("[data-support-email]").forEach(function (a) { a.textContent = support; a.href = "mailto:" + support; });
    }
    // 로그인 상태와 PKCE 값은 이 탭의 sessionStorage에만 둔다: 보통 탭을 닫으면 사라지지만 브라우저가 탭을 되살리면 남을 수 있으므로, 공용 PC에서는 '다른 계정으로 로그인'으로 지우고 탭을 닫도록 안내한다.
    var storage = null;
    try { storage = win.sessionStorage; } catch (e) { /* 저장소를 막은 브라우저: 아래에서 웹 삭제를 숨긴다 */ }
    // 설정이 자리표시 그대로이거나 supabase-js·탭 저장소가 없으면 웹 삭제를 숨기고 앱·이메일 경로만 남긴다.
    var key = String(cfg.publishableKey || ""), lib = win.supabase;
    if (!/^https:\/\//.test(String(cfg.supabaseUrl || "")) || !key || key.indexOf("[[") >= 0 || !lib || !lib.createClient || !storage) {
      doc.getElementById("web-delete-unavailable").hidden = false;
      return;
    }
    root.hidden = false;
    var client = lib.createClient(cfg.supabaseUrl, key, {
      auth: { storage: storage, flowType: "pkce", detectSessionInUrl: true, persistSession: true },
    });
    var flow = createDeleteFlow(client, function (s) { render(root, s); });
    var here = win.location.origin + win.location.pathname;
    var enabled = Array.isArray(cfg.oauthProviders) ? cfg.oauthProviders : [];
    var on = function (selector, type, fn) {
      root.querySelector(selector).addEventListener(type, function (event) { event.preventDefault(); fn(); });
    };
    root.querySelectorAll("[data-provider]").forEach(function (button) {
      var provider = button.getAttribute("data-provider");
      button.hidden = enabled.indexOf(provider) < 0;
      button.addEventListener("click", function () { flow.signInWith(provider, here); });
    });
    on("#signin-form", "submit", function () {
      var password = doc.getElementById("signin-password");
      flow.signIn(doc.getElementById("signin-email").value, password.value).then(function () {
        if (flow.state().step === "confirm") password.value = "";
      });
    });
    on("#confirm-form", "submit", function () { flow.confirm(doc.getElementById("confirm-word").value); });
    on("#switch-account", "click", function () { flow.switchAccount(); });
    // 뒤로 가기로 다시 보인 페이지(제공자 화면에서 돌아옴)는 처음부터 다시 읽는다.
    win.addEventListener("pageshow", function (event) { if (event.persisted) win.location.reload(); });
    var query = new URLSearchParams(win.location.search);
    var oauthError = query.has("error") || new URLSearchParams(win.location.hash.slice(1)).has("error");
    flow.start({ oauthError: oauthError }).then(function () {
      root.setAttribute("data-started", "yes");
      // 세션을 읽은 뒤에 주소의 code·error를 지운다(먼저 지우면 supabase-js가 code를 못 읽는다).
      if (query.has("code") || oauthError) win.history.replaceState(null, "", here);
    });
  }

  var api = { createDeleteFlow: createDeleteFlow, messageFor: messageFor, boot: boot };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window === "undefined") return;
  window.FFDelete = api;
  if (typeof document === "undefined") return;
  if (document.readyState !== "loading") boot(window, document);
  else document.addEventListener("DOMContentLoaded", function () { boot(window, document); });
})();
