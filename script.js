// script.js — 타이핑 + 스크롤 등장(AOS/폴백) + 별빛은 CSS + 서명부 컨페티
// 편지 문구는 content.js(LETTER)에서 가져옵니다. 이 파일은 수정할 필요 없어요.
//
// 견고성 원칙(엄마 폰 최우선):
//  - CDN(AOS/canvas-confetti)이 로드 실패해도 사이트는 깨지지 않고 내용은 읽힘.
//  - AOS 없으면 IntersectionObserver로 동일한 등장 효과 폴백.
//  - prefers-reduced-motion이면 타이핑/슬라이드/컨페티 생략, 정적 표시.

(function () {
  "use strict";

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 저전력/모바일 분기 — 컨페티량 등 축소
  var lowPower =
    (window.matchMedia && window.matchMedia("(max-width: 767px)").matches) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

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

    // 편지 본문 문단 생성 — 등장 페이드만, 텍스트 자체엔 이펙트 없음
    var bodyEl = document.getElementById("letterBody");
    if (bodyEl && Array.isArray(LETTER.body)) {
      LETTER.body.forEach(function (paragraph, i) {
        var p = document.createElement("p");
        p.className = "body__paragraph";
        if (isPlaceholder(paragraph)) {
          p.className += " is-placeholder";
        }
        p.textContent = paragraph;
        // 스크롤 등장(stagger) — AOS 속성 부여
        p.setAttribute("data-aos", "fade-up");
        p.setAttribute("data-aos-delay", String(i * 80));
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
      if (cursorEl) cursorEl.classList.add("is-hidden");
      return;
    }

    var i = 0;
    (function type() {
      if (i < text.length) {
        typedEl.textContent += text.charAt(i);
        i++;
        setTimeout(type, 55 + Math.random() * 15); // 55~70ms
      } else if (cursorEl) {
        setTimeout(function () {
          cursorEl.classList.add("is-hidden");
        }, 1200);
      }
    })();
  }

  // --- 3. 스크롤 등장: AOS 우선, 실패 시 IntersectionObserver 폴백 ---
  function setupReveals() {
    if (window.AOS && typeof window.AOS.init === "function") {
      window.AOS.init({
        once: true,               // 한 번 등장하면 유지
        duration: 800,
        easing: "ease-out",
        offset: 80,
        disable: prefersReducedMotion // 모션 민감 시 AOS 비활성(즉시 표시)
      });
      return;
    }

    // 폴백: AOS의 aos-animate 클래스를 직접 부여 (CSS가 그걸로 전환).
    var targets = document.querySelectorAll("[data-aos]");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      // 즉시 표시 (내용 가독성 보장)
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add("aos-animate");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("aos-animate");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    Array.prototype.forEach.call(targets, function (el) {
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

  // --- 5. 서명부 피날레 — canvas-confetti 1회 발사 ---
  function setupConfetti() {
    var signoff = document.getElementById("signoff");
    if (!signoff) return;

    // 컨페티 라이브러리 없거나 모션 민감이면 조용히 생략 (사이트는 정상)
    if (typeof window.confetti !== "function" || prefersReducedMotion) return;
    if (!("IntersectionObserver" in window)) return;

    var colors = ["#E9B949", "#F3D27A", "#F5EFE6", "#E5989B"]; // 골드/크림/로즈
    var count = lowPower ? 70 : 120; // 150 이하 캡, 모바일 축소

    function fire() {
      // 좌우 2발로 절제
      window.confetti({
        particleCount: Math.floor(count / 2),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
        disableForReducedMotion: true
      });
      window.confetti({
        particleCount: Math.floor(count / 2),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
        disableForReducedMotion: true
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            fire();
            observer.unobserve(entry.target); // 딱 1회, 재발사 금지
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(signoff);
  }

  // --- 6. Cosmic Scale 시퀀스 — 스크롤 진행률로 천체 크로스페이드 + 확대 ---
  // 장식 파트. 순수 JS(IntersectionObserver + rAF 스로틀), 라이브러리 0.
  // 실패해도 아래 편지 본문 가독성/기능엔 영향 없음.
  function setupCosmic() {
    var section = document.getElementById("cosmic");
    if (!section) return;

    var bodies = section.querySelectorAll(".cosmic-body");
    if (!bodies.length) return;

    // 캡션 채우기 (content.js LETTER.cosmic)
    var captions = (typeof LETTER !== "undefined" && Array.isArray(LETTER.cosmic))
      ? LETTER.cosmic : [];
    Array.prototype.forEach.call(bodies, function (el, i) {
      var cap = el.querySelector(".cosmic-caption");
      if (cap && captions[i]) cap.textContent = captions[i];
    });

    var stageCount = bodies.length; // 6

    // 모션 민감: 긴 스크럽 생략, 마지막 "사랑하는 마음"만 정적 표시
    if (prefersReducedMotion) {
      var finale = bodies[stageCount - 1];
      if (finale) finale.classList.add("active");
      return;
    }

    var current = -1;

    function setStage(idx, local) {
      if (idx !== current) {
        if (current >= 0 && bodies[current]) bodies[current].classList.remove("active");
        bodies[idx].classList.add("active");
        current = idx;
      }
      // 단계 내부 진행률로 은은한 확대 (기본 크기는 vmin으로 이미 상승)
      var scale = 0.9 + local * 0.28;
      bodies[idx].style.setProperty("--scale", scale.toFixed(3));
    }

    function update() {
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var span = rect.height - vh;
      var progress = span > 0 ? (-rect.top) / span : 0;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      var raw = progress * stageCount;
      var idx = Math.floor(raw);
      if (idx > stageCount - 1) idx = stageCount - 1;
      if (idx < 0) idx = 0;
      setStage(idx, raw - idx);
    }

    var inView = false;
    var ticking = false;

    function onScroll() {
      if (!inView || ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) update(); // 진입 시 즉시 반영
        });
      }, { rootMargin: "0px" });
      io.observe(section);
    } else {
      inView = true; // 폴백: 항상 활성
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update(); // 초기 상태(달) 세팅
  }

  // --- 초기화 ---
  function init() {
    fillStaticContent(); // 본문 문단을 먼저 생성해야 AOS/IO가 관찰 가능
    runTyping();
    setupReveals();
    setupScrollHint();
    setupConfetti();
    setupCosmic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
