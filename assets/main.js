/* Aaryav Gangrade — static, dependency-free interactions. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EMAIL = 'aaryav1805.gangrade@gmail.com';

  const projects = {
    codebase: {
      id: '01 / AI ENGINEERING', title: 'Codebase Intelligence', subtitle: 'Ask better questions of your code.',
      body: 'A repository-aware assistant for navigating unfamiliar Python codebases. Instead of treating code as plain paragraphs, the system maps functions, classes and their relationships, then uses hybrid retrieval and agentic search to surface evidence for developer questions.',
      points: ['AST-aware code parsing and function/call-graph extraction', 'Dense FAISS search blended with BM25 via reciprocal rank fusion', 'Graph neighborhood expansion, Gemini reranking and multi-step tool use', 'Streamlit interface for browsing and asking questions about a repository'],
      stack: ['Python', 'FAISS', 'BM25', 'NetworkX', 'Gemini', 'Streamlit'],
      github: 'https://github.com/AaryavGangrade/RAG-Codebase'
    },
    retail: {
      id: '02 / DATA ENGINEERING', title: 'RetailLake', subtitle: 'Raw data in. Reliable answers out.',
      body: 'A local-PySpark lakehouse project using AWS S3 for private storage and versioned Delta Lake processing. It progresses from immutable Bronze files to curated Silver and Gold tables, then to a browser-based offline dashboard. Verification, reproducibility and honest system boundaries are central to the design.',
      points: ['245,042 records processed across seven Silver/Gold Delta tables', 'S3 Bronze storage, local Spark processing and verified S3 output snapshots', 'Hash/schema/count checks, rerun behavior, immutable output evidence and single-writer protection', 'Offline dashboard with filters, sorting, metrics and CSV export; Spark compute is local, not hosted AWS compute'],
      stack: ['Python', 'PySpark', 'Delta Lake', 'AWS S3', 'SQL'],
      github: 'https://github.com/AaryavGangrade/RetailLake', demo: 'https://retaillake.netlify.app/'
    },
    nse: {
      id: '03 / QUANT RESEARCH', title: 'NSE Pattern Scanner', subtitle: 'Find the signal. Question the noise.',
      body: 'A data pipeline for exploring double-bottom and double-top technical patterns in Indian equities. The system scans thousands of tickers, stores historical market data efficiently and produces tracking and backtesting reports. Historical simulations are exploratory, not a promise of future performance.',
      points: ['Scans more than 2,600 NSE-listed equities for W/M formations', 'Concurrent market-data retrieval and Parquet caching for repeat processing', 'Breakout/breakdown filtering, signal scoring and historical strategy simulation', 'Scheduled scans with HTML reports and live-tracking utilities'],
      stack: ['Python', 'Pandas', 'yfinance', 'Parquet', 'Concurrency'],
      github: 'https://github.com/AaryavGangrade/nse-pattern-scanner'
    },
    steel: {
      id: '04 / FORWARD DEPLOYED ENGINEERING', title: 'SteelOpt', subtitle: 'Useful beats impressive.',
      body: 'An executable, educational decision-support prototype built for a structural-steel fabrication case study. It focuses on comparing feasible nesting layouts and safely matching reusable offcuts to parts before anyone claims operational savings. All example inputs are synthetic, and no factory integration is implied.',
      points: ['Toy 2D shelf layouts for identical synthetic plate-demand snapshots', 'Checks thickness, grade, traceability, kerf clearance, rotations and geometry', 'Conservative offcut suggestions with explicit cross-project approval flags', 'Pytest coverage and a reproducible Jupyter walkthrough; no production cost-savings claims'],
      stack: ['Python', 'Pytest', 'Jupyter', 'Constraint logic'],
      github: 'https://github.com/AaryavGangrade/steelopt-poc'
    },
    vireo: {
      id: '05 / APPLIED MACHINE LEARNING', title: 'Vireo Audio', subtitle: 'Numbers first. Narratives second.',
      body: 'A support-ticket intelligence case study with local, testable analytics and classification at its core. An optional Gemini layer turns verified metrics into briefings; it does not invent or recompute the numbers. The system explores routing mistakes, handoff costs and opportunities for a measurable pilot.',
      points: ['Offline TF-IDF ticket classifier using word and character features', 'Category and ownership recommendations with calibrated confidence', 'Ticket-volume, routing-leakage, handoff and CSAT analyses', 'Optional Gemini-generated business briefing constrained by precomputed metrics'],
      stack: ['Python', 'scikit-learn', 'TF-IDF', 'Gemini'],
      github: 'https://github.com/AaryavGangrade/vireo_audio'
    },
    kestrel: {
      id: '06 / DECISION SYSTEMS', title: 'Kestrel Review', subtitle: 'Optimize the decision, not the headline.',
      body: 'A warranty-fraud prioritization exercise for a fictional appliance-business case study. It treats the investigation team’s monthly review capacity and leakage-safe evaluation as more meaningful than headline accuracy in an imbalanced dataset. This is a portfolio prototype, not a live deployment.',
      points: ['Chronological/as-of model design to avoid looking into future claim outcomes', 'Prioritization for a fixed review capacity of 40 claims per month', 'Local scoring endpoint plus responsive investigator review interface', 'Reproducible holdout metrics, capacity-aware analysis and validation tests'],
      stack: ['Python', 'scikit-learn', 'REST API', 'Pytest'],
      github: 'https://github.com/AaryavGangrade/Kestrel'
    }
  };

  const clock = $('#local-time');
  function setClock() {
    if (!clock) return;
    clock.textContent = 'IST ' + new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date());
  }
  setClock();
  setInterval(setClock, 30000);
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const revealNodes = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealNodes.forEach(node => node.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, {threshold: .08, rootMargin: '0px 0px -25px 0px'});
    revealNodes.forEach(node => observer.observe(node));
  }

  const progress = $('.page-progress span');
  let scrollScheduled = false;
  function updateScrollProgress() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = total <= 0 ? 0 : Math.min(100, Math.max(0, (window.scrollY / total) * 100));
    if (progress) progress.style.width = ratio + '%';
    scrollScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScrollProgress); }
  }, {passive: true});
  updateScrollProgress();

  const filterButtons = $$('.filter-btn');
  const cards = $$('.project-card');
  const noResults = $('#no-results');
  filterButtons.forEach(btn => btn.addEventListener('click', () => {
    const category = btn.dataset.filter;
    filterButtons.forEach(b => { const selected = b === btn; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', selected); });
    let showing = 0;
    cards.forEach(card => {
      const show = category === 'all' || card.dataset.type.split(' ').includes(category);
      card.classList.toggle('is-hidden', !show);
      if (show) { showing++; card.classList.add('visible'); }
    });
    noResults.hidden = showing > 0;
  }));

  const dialog = $('#project-dialog');
  const closeBtn = $('.dialog-close');
  let lastFocused = null;
  function showProject(key) {
    const data = projects[key];
    if (!data || !dialog || typeof dialog.showModal !== 'function') return;
    lastFocused = document.activeElement;
    $('#dialog-id').textContent = data.id;
    $('#dialog-title').textContent = data.title;
    $('#dialog-subtitle').textContent = data.subtitle;
    $('#dialog-body').textContent = data.body;
    $('#dialog-points').replaceChildren(...data.points.map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
    $('#dialog-stack').replaceChildren(...data.stack.map(text => { const item = document.createElement('span'); item.textContent = text; return item; }));
    $('#dialog-repo').href = data.github;
    const demo = $('#dialog-demo');
    demo.hidden = !data.demo;
    if (data.demo) demo.href = data.demo;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    closeBtn.focus();
  }
  cards.forEach(card => {
    const open = () => showProject(card.dataset.project);
    const figureButton = $('.project-click', card);
    const arrowButton = $('.project-arrow', card);
    figureButton?.addEventListener('click', open);
    arrowButton?.addEventListener('click', open);
  });
  function closeProject() { if (dialog?.open) dialog.close(); }
  closeBtn?.addEventListener('click', closeProject);
  dialog?.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  });
  dialog?.addEventListener('click', e => {
    const bounds = dialog.getBoundingClientRect();
    if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) closeProject();
  });

  const toggle = $('.mobile-toggle');
  const mobileNav = $('#mobile-nav');
  function setMenu(open) {
    if (!toggle || !mobileNav) return;
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.hidden = !open;
  }
  toggle?.addEventListener('click', () => setMenu(mobileNav.hidden));
  $$('.mobile-nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobileNav.hidden) setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener?.('change', e => { if (e.matches) setMenu(false); });

  const toast = $('#toast');
  let toastTimer;
  $('#copy-email')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast.textContent = 'EMAIL COPIED TO CLIPBOARD ↗';
    } catch {
      toast.textContent = 'EMAIL: ' + EMAIL;
    }
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  });

  if (!reduceMotion && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const halo = $('.pointer-halo');
    const dot = $('.pointer-dot');
    const orb = $('.hero-object');
    let targetX = innerWidth / 2, targetY = innerHeight / 2, haloX = targetX, haloY = targetY;
    let pointerActive = false;
    window.addEventListener('pointermove', e => {
      targetX = e.clientX; targetY = e.clientY;
      if (!pointerActive) { pointerActive = true; halo.style.opacity = 1; dot.style.opacity = 1; }
      dot.style.transform = `translate3d(${targetX - 2.5}px,${targetY - 2.5}px,0)`;
      if (orb && window.scrollY < window.innerHeight) {
        const x = ((e.clientX / innerWidth) - .5) * 26;
        const y = ((e.clientY / innerHeight) - .5) * 26;
        orb.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
    }, {passive: true});
    $$('a, button').forEach(el => {
      el.addEventListener('pointerenter', () => halo.classList.add('hovering'));
      el.addEventListener('pointerleave', () => halo.classList.remove('hovering'));
    });
    function cursorTick() {
      haloX += (targetX - haloX) * .16; haloY += (targetY - haloY) * .16;
      halo.style.transform = `translate3d(${haloX - 18}px,${haloY - 18}px,0)`;
      requestAnimationFrame(cursorTick);
    }
    requestAnimationFrame(cursorTick);
    window.addEventListener('blur', () => { halo.style.opacity = '0'; dot.style.opacity = '0'; pointerActive = false; });
  }
})();
