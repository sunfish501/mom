// script.js — 타이핑 효과 + 스크롤 등장 애니메이션 + 스크롤 힌트
// 편지 문구는 content.js(LETTER)에서 가져옵니다. 이 파일은 수정할 필요 없어요.

(function () {
  "use strict";

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 문단이 플레이스홀더인지 판단 ( [ ... ] 형태 )
  function isPlaceholder(text) {
    var t = text.trim();
    return t.charAt(0) === "[" && t.charAt(t.length - 1) === "]";
  }

  // --- 1. 정적 텍스트 채우기 (생신 축하, 맺음말, 편지 본문) ---
  function fillStaticContent() {
    var birthdayEl = document.getElementById("birthdayText");
    if (birthdayEl) birthdayEl.textContent = LETTER.birthday;

    var signoffEl = document.getElementById("signoffText");
    if (signoffEl) signoffEl.textContent = LETTER.signoff;

    // 편지 본문 문단 생성
    var bodyEl = document.getElementById("letterBody");
    if (bodyEl && Array.isArray(LETTER.body)) {
      LETTER.body.forEach(function (paragraph, i) {
        var p = document.createElement("p");
        p.className = "body__paragraph";
        if (isPlaceholder(paragraph)) {
          p.className += " is-placeholder";
        }
        p.textContent = paragraph;
        // 순차 등장(stagger)
        p.style.transitionDelay = (i * 0.1) + "s";
        bodyEl.appendChild(p);
      });
    }
  }

  // --- 2. 타자기(타이핑) 효과 — Intro ---
  function runTyping() {
    var typedEl = document.getElementById("typed");
    var cursorEl = document.querySelector(".cursor");
    if (!typedEl) return;

    var text = LETTER.intro || "";

    if (prefersReducedMotion) {
      typedEl.textContent = text;
      return;
    }

    var i = 0;
    (function type() {
      if (i < text.length) {
        typedEl.textContent += text.charAt(i);
        i++;
        setTimeout(type, 55 + Math.random() * 15); // 55~70ms
      } else if (cursorEl) {
        // 타이핑 완료 후 잠시 후 커서를 조용히 숨김
        setTimeout(function () {
          cursorEl.classList.add("is-hidden");
        }, 1200);
      }
    })();
  }

  // --- 3. 스크롤 등장 (IntersectionObserver) ---
  function setupReveals() {
    var targets = [];
    // .reveal 섹션 + 본문 문단
    Array.prototype.push.apply(
      targets,
      document.querySelectorAll(".reveal")
    );
    Array.prototype.push.apply(
      targets,
      document.querySelectorAll(".body__paragraph")
    );

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      // 즉시 표시
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // 한 번 등장하면 유지
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  // --- 4. 스크롤 힌트 화살표 (스크롤 시작하면 사라짐) ---
  function setupScrollHint() {
    var hint = document.getElementById("scrollHint");
    if (!hint) return;

    function onScroll() {
      if (window.scrollY > 0) {
        hint.classList.add("is-hidden");
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // --- 초기화 ---
  function init() {
    fillStaticContent();
    runTyping();
    setupReveals();
    setupScrollHint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
