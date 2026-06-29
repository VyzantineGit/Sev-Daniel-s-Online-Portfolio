/*
  ============================================================
  script.js — Portfolio JavaScript
  ============================================================
  This file handles all interactive behavior on the page.
  It is loaded from index.html via:
    <script src="script.js"></script>
  placed at the END of <body>, so the HTML is fully parsed
  before this script runs — no need for DOMContentLoaded.

  FEATURES IN THIS FILE:
  1. Sticky nav — adds a frosted-glass background on scroll
  2. Scroll-triggered fade-in — reveals cards as you scroll
  ============================================================
*/


// ── 1. STICKY NAV ON SCROLL ──────────────────────────────────
//
// Gets a reference to the <nav id="nav"> element in the HTML.
// document.getElementById() returns the element with that id.
const nav = document.getElementById('nav');

// Attaches a "scroll" event listener to the window object.
// An event listener is a function that runs whenever a
// specific event occurs. "scroll" fires continuously as the
// user scrolls the page up or down.
window.addEventListener('scroll', () => {

  // classList.toggle(className, condition):
  // - Adds the class if the condition evaluates to TRUE.
  // - Removes the class if the condition evaluates to FALSE.
  //
  // window.scrollY: how many pixels the page has been scrolled
  // from the top. At the very top of the page, scrollY = 0.
  //
  // When scrolled more than 60px down, the 'scrolled' class is
  // added to the nav. The CSS rule "nav.scrolled" then applies
  // the frosted-glass cream background and border.
  nav.classList.toggle('scrolled', window.scrollY > 60);
});


// ── 2. SCROLL-TRIGGERED FADE-IN (IntersectionObserver) ────────
//
// IntersectionObserver is a browser API that watches elements
// and fires a callback when they enter or leave the viewport
// (the visible area of the screen).
//
// WHY use this instead of a scroll event listener?
// Checking element positions on every scroll event is expensive
// and can cause janky performance. IntersectionObserver is
// handled by the browser natively and is far more efficient.
//
// The callback function receives an array called "entries" —
// one entry per observed element that changed visibility state.
const observer = new IntersectionObserver((entries) => {

  // Loop through every entry that triggered a change.
  entries.forEach(e => {

    // e.isIntersecting = true when the element has entered the
    // viewport (become at least partially visible on screen).
    if (e.isIntersecting) {

      // Reveal the element by changing its inline styles.
      // These values transition smoothly because we set a
      // CSS "transition" property on these elements below.
      e.target.style.opacity = '1';         // fully visible
      e.target.style.transform = 'translateY(0)'; // back to original position
    }
  });

// The second argument to IntersectionObserver is an options object.
// threshold: 0.15 means the callback fires when 15% of the element
// is visible in the viewport — early enough that the animation
// (0.7s) finishes before the user fully scrolls past the element.
}, { threshold: 0.15 });


// Select all .album-card and .tour-row elements on the page.
// querySelectorAll() returns a NodeList — similar to an array.
// The CSS selector string works just like in your stylesheet.
document.querySelectorAll('.album-card, .tour-row').forEach(el => {

  // Set the initial HIDDEN state for each element in JavaScript.
  // We do this in JS (not just CSS) because the observer callback
  // sets them back to visible — and we need the transition to run
  // between the two states.
  //
  // el.style sets inline styles directly on the element.
  // These override the CSS stylesheet for these specific properties.
  el.style.opacity = '0';                        // start invisible
  el.style.transform = 'translateY(20px)';       // start 20px below

  // transition tells the browser to animate changes to these
  // two properties smoothly over 0.7 seconds with "ease" timing.
  // When the observer sets opacity to 1 and transform to 0,
  // the element will glide into view rather than snap instantly.
  el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';

  // Register this element with the observer.
  // From now on, when this element enters the viewport,
  // the IntersectionObserver callback above will fire for it.
  observer.observe(el);
});
