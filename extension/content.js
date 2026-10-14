(() => {
  // ---------------- CONFIG: edit these ----------------
  const CONFIG = {
    // Presets. Each one gets its own button in the drawer bar.
    // autoSubmit: true = may click Submit for allowlisted players (see safety below). Keep false for real customers.
    presets: [
      {
        label: "Test funds",
        type: "balance_correction",
        reason: "test_funds",
        subreason: "other",
        direction: "credit",
        description: "Test funds",
        autoSubmit: true,
      },
      {
        label: "Stuck round",
        type: "balance_correction",
        reason: "other",
        subreason: "other",
        direction: "credit",
        description: "Crediting customer for stuck round/provider error",
        autoSubmit: false,
      },
    ],
    defaultAmount: "100",

    // Shortcut buttons shown at the top of player pages. path = page after /customer/<player-id>/
    // scrollTo (optional) = heading text on that page to scroll to
    shortcuts: [
      { label: "KYC", path: "due-diligence" },
      { label: "Add funds", path: "player-finance", scrollTo: "Manual Adjustments" },
      // submitAll: true = on arrival, click every search "Submit" button on the page
      { label: "Sessions", path: "sessions", submitAll: true },
      // Same page as Add funds: scrolls to Financial Transactions, then clicks that section's Submit (use "All Transactions" if you prefer)
      { label: "Transactions", path: "player-finance", scrollTo: "Financial Transactions", submitUnder: ["Financial Transactions", "All Transactions"] },
    ],

    // Text typed into the confirmation popup if it has an input (e.g. "type continue to confirm")
    confirmText: "confirm",
    // Button text that confirms the second popup
    confirmButton: /^submit$/i,
    // false = fill the popup but you click Continue yourself
    autoClickConfirm: false,

    // SAFETY GUARD: Submit + Continue are only auto-clicked for players matching one of these.
    // Otherwise the form is filled and you finish by hand.
    safety: {
      enabled: true,
      allowEmailPatterns: [/@super\.xyz$/i], // player email on the page
      allowCustomerIds: [], // e.g. ["c85513ad-6794-45c9-9ee6-75b4c98aa956"]
    },
  };
  // ----------------------------------------------------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log("[TestFunds]", ...a);

  async function waitFor(fn, timeout = 6000, step = 100) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getDrawer() {
    return [...document.querySelectorAll(".ant-drawer, [role=dialog]")].find((d) =>
      /create manual adjustment/i.test(d.textContent || "")
    );
  }

  function formItemByLabel(root, re) {
    const labels = [...root.querySelectorAll("label")];
    const label = labels.find((l) => re.test(l.textContent.trim()));
    return label ? label.closest(".ant-form-item, .ant-row") || label.parentElement?.parentElement : null;
  }

  async function pickSelect(root, labelRe, value) {
    const item = await waitFor(() => formItemByLabel(root, labelRe));
    if (!item) throw new Error("Field not found: " + labelRe);
    const select = await waitFor(() => {
      const s = item.querySelector(".ant-select");
      return s && !s.classList.contains("ant-select-disabled") ? s : null;
    });
    if (!select) throw new Error("Select disabled/missing: " + labelRe);

    const want = value.toLowerCase();
    const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const current = () => (select.querySelector(".ant-select-selection-item")?.textContent || "").trim().toLowerCase();
    if (current() === want) return;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const sel = select.querySelector(".ant-select-selector") || select;
      sel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      const input = select.querySelector("input");
      if (input) {
        input.focus();
        setNativeValue(input, value);
      }
      // Only options inside the currently open dropdown (ignores hidden dropdowns left over from earlier selects)
      const opt = await waitFor(() =>
        [...document.querySelectorAll(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option")].find(
          (o) => isVisible(o) && (o.getAttribute("title") || o.textContent).trim().toLowerCase() === want
        ), 3000
      );
      if (opt) {
        opt.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        opt.click();
        if (await waitFor(() => current() === want, 1500)) {
          await sleep(250);
          return;
        }
      }
      log(`Retry ${attempt} for ${labelRe}`);
      await sleep(300);
    }
    throw new Error(`Could not select "${value}" for ${labelRe}`);
  }

  async function fillText(root, labelRe, value, fallbackSelector) {
    const item = await waitFor(() => formItemByLabel(root, labelRe), 4000);
    const el =
      (item && item.querySelector("textarea, input:not([type=search])")) ||
      (fallbackSelector && root.querySelector(fallbackSelector));
    if (!el) throw new Error("Text field not found: " + labelRe);
    el.focus();
    setNativeValue(el, value);
  }

  // Reads the player's currency from the page (e.g. "Balance: PLN 394.00"), ignoring the drawer/popups.
  function getCurrency() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(".ant-drawer, .ant-modal, script, style").forEach((n) => n.remove());
    const t = clone.textContent;
    const m = t.match(/Balance\s*:?\s*([A-Z]{3})\s*-?\d/) || t.match(/\b([A-Z]{3})\s?-?\d[\d,]*\.\d{2}\b/);
    return m ? m[1] : null;
  }

  function playerIsAllowed() {
    const s = CONFIG.safety;
    if (!s.enabled) return true;
    const id = (location.pathname.match(/customer\/([0-9a-f-]{36})/i) || [])[1];
    if (id && s.allowCustomerIds.includes(id)) return true;
    const main = document.querySelector("main, .ant-layout-content") || document.body;
    const clone = main.cloneNode(true);
    clone.querySelectorAll(".ant-drawer, .ant-modal, table").forEach((n) => n.remove());
    const emails = clone.textContent.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
    return emails.some((e) => s.allowEmailPatterns.some((p) => p.test(e)));
  }

  // Pre-fills the "type confirm below" popup. Runs whoever opens it (you or the script).
  function fillConfirmPopup() {
    const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const modals = [...document.querySelectorAll(".ant-modal, [role=dialog]")].filter(
      (m) => isVisible(m) && !/create manual adjustment/i.test(m.querySelector(".ant-modal-title, .ant-drawer-title")?.textContent || "") && m.querySelector("input:not([type=hidden])")
    );
    for (const m of modals) {
      const word = (m.textContent.match(/type\s+["']?(\w+)["']?\s+below/i) || [])[1];
      if (!word) continue; // only the "Type confirm below" popup, never the drawer
      const input =
        m.querySelector("input[placeholder*=confirm i]") || m.querySelector("input:not([type=hidden]):not([type=checkbox])");
      if (!input || input.dataset.tfFilled) continue;
      input.dataset.tfFilled = "1";
      input.focus();
      setNativeValue(input, word);
      log("Filled confirm popup with:", word);
      const btn = [...m.querySelectorAll("button")].find((b) => CONFIG.confirmButton.test(b.textContent.trim()));
      if (btn && CONFIG.autoClickConfirm) setTimeout(() => btn.click(), 300);
      else if (btn) setTimeout(() => btn.focus(), 300);
    }
  }

  async function run(drawer, amount, bar, P) {
    const status = (t) => (bar.querySelector(".tf-status").textContent = t);
    try {
      status(`Filling ${amount} ${getCurrency() || ""}…`);
      await pickSelect(drawer, /^type/i, P.type);
      await pickSelect(drawer, /^reason/i, P.reason);
      await pickSelect(drawer, /^sub-?reason/i, P.subreason);
      await pickSelect(drawer, /^direction/i, P.direction);
      await fillText(drawer, /amount/i, amount, "input[type=number]");
      await fillText(drawer, /comment|description|note/i, P.description, "textarea");

      if (!P.autoSubmit || !playerIsAllowed()) {
        status("Filled. Click Submit yourself; the confirm popup will be pre-filled.");
        return;
      }
      status("Submitting…");
      const submit = [...drawer.querySelectorAll("button[type=submit]")].pop();
      if (!submit) throw new Error("Submit button not found");
      submit.click();
      status(CONFIG.autoClickConfirm ? "Submitted." : "Submitted. Confirm popup is pre-filled; click Submit there.");
    } catch (e) {
      log("Error:", e);
      status("Stopped: " + e.message);
    }
  }

  function inject(drawer) {
    if (drawer.querySelector(".tf-bar")) return;
    const form = drawer.querySelector("form") || drawer;
    const bar = document.createElement("div");
    bar.className = "tf-bar";
    bar.style.cssText =
      "display:flex;gap:8px;align-items:center;padding:10px 0;margin-bottom:8px;border-bottom:1px solid #eee;font-size:13px;";
    let saved = CONFIG.defaultAmount;
    try {
      saved = localStorage.getItem("tf_amount") || saved;
    } catch (_) {}
    bar.innerHTML = `
      <strong>Amount</strong>
      <input class="tf-amount" type="number" min="0" value="${saved}" style="width:90px;padding:4px 6px;border:1px solid #d9d9d9;border-radius:4px">
      <span class="tf-cur" style="font-weight:700;padding:3px 8px;border-radius:4px;background:#fff7e6;border:1px solid #ffd591;color:#ad4e00"></span>
      ${CONFIG.presets.map((p, i) => `<button type="button" class="tf-go" data-i="${i}" style="padding:5px 12px;background:#1555d6;color:#fff;border:0;border-radius:4px;cursor:pointer">${p.label}</button>`).join("")}
      <span class="tf-status" style="color:#666"></span>`;
    form.parentElement.insertBefore(bar, form);
    const amountEl = bar.querySelector(".tf-amount");
    const curEl = bar.querySelector(".tf-cur");
    const showCur = () => {
      const c = getCurrency();
      curEl.textContent = c || "currency?";
      return c;
    };
    showCur();
    const go = (i) => {
      showCur();
      const amount = amountEl.value.trim();
      if (!amount || Number(amount) <= 0) return (bar.querySelector(".tf-status").textContent = "Enter an amount.");
      try {
        localStorage.setItem("tf_amount", amount);
      } catch (_) {}
      run(drawer, amount, bar, CONFIG.presets[i]);
    };
    bar.querySelectorAll(".tf-go").forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.i))));
    amountEl.addEventListener("keydown", (e) => e.key === "Enter" && go(0)); // Enter = first preset
    amountEl.focus();
    amountEl.select();
  }

  // ---------- Shortcut bar on player pages ----------
  // Finds the element holding the exact heading text, whatever the page structure.
  function findSection(text) {
    const want = text.toLowerCase();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeValue.trim().toLowerCase() !== want) continue;
      const el = n.parentElement;
      if (!el || el.closest(".ant-drawer, .ant-modal, .tf-shortcuts, .ant-menu, nav")) continue;
      if (el.getClientRects().length) return el;
    }
    return null;
  }

  // The page keeps loading/shifting after opening, so keep re-scrolling for a few seconds until it holds.
  async function scrollToSection(text, thenSubmit) {
    if (window.__tfSettling) return;
    window.__tfSettling = true;
    let stable = 0;
    for (let i = 0; i < 30 && stable < 3; i++) {
      const el = findSection(text);
      if (el) {
        el.style.scrollMarginTop = "90px";
        const top = el.getBoundingClientRect().top;
        if (top > 70 && top < 130) stable++;
        else {
          stable = 0;
          el.scrollIntoView({ behavior: "auto", block: "start" });
        }
      } else if (i === 29) log("Section not found:", text);
      await sleep(300);
    }
    window.__tfSettling = false;
    if (thenSubmit && thenSubmit.length && stable >= 3) {
      // For each heading: click the first enabled Submit that comes after it in the page (= that section's search button)
      for (const h of thenSubmit) {
        const head = findSection(h);
        const btn =
          head &&
          [...document.querySelectorAll("button")].find(
            (b) =>
              /^submit$/i.test(b.textContent.trim()) &&
              !b.disabled &&
              !b.closest(".ant-drawer, .ant-modal, .tf-bar") &&
              head.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
          );
        if (btn) {
          btn.click();
          log("Clicked Submit under:", h);
        } else log("Submit not found under:", h);
        await sleep(400);
      }
    }
  }

  // Clicks every visible, enabled "Submit" search button on the page (not in drawers/popups).
  async function submitAllSearches() {
    if (window.__tfSubmitting) return;
    window.__tfSubmitting = true;
    const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const find = () =>
      [...document.querySelectorAll("button")].filter(
        (b) => /^submit$/i.test(b.textContent.trim()) && isVisible(b) && !b.disabled && !b.closest(".ant-drawer, .ant-modal, .tf-bar")
      );
    const first = await waitFor(() => find().length, 10000, 200);
    if (first) {
      await sleep(700); // let the second section render
      const btns = find();
      for (const b of btns) {
        b.click();
        await sleep(300);
      }
      log(`Clicked ${btns.length} Submit button(s).`);
    } else log("No Submit buttons found.");
    window.__tfSubmitting = false;
  }

  function ensureShortcutBar() {
    const m = location.pathname.match(/^\/customer\/([0-9a-f-]{36})\/([^/]*)/i);
    let bar = document.querySelector(".tf-shortcuts");
    if (!m) {
      if (bar) bar.remove();
      return;
    }
    const [, id, current] = m;
    if (!bar) {
      const host = document.querySelector(".ant-layout-content, main");
      if (!host) return;
      bar = document.createElement("div");
      bar.className = "tf-shortcuts";
      bar.style.cssText =
        "display:flex;gap:8px;align-items:center;padding:6px 16px;background:#fff;border-bottom:1px solid #eee;font-size:13px;";
      bar.innerHTML =
        '<span style="color:#888">Shortcuts</span>' +
        CONFIG.shortcuts
          .map(
            (s) =>
              `<a class="tf-sc" data-path="${s.path}" data-scroll="${s.scrollTo || ""}" data-submit="${s.submitAll ? "1" : ""}" style="padding:4px 12px;border-radius:4px;border:1px solid #1555d6;text-decoration:none;cursor:pointer">${s.label}</a>`
          )
          .join("");
      host.insertBefore(bar, host.firstChild);
      bar.addEventListener("click", (e) => {
        const a = e.target.closest(".tf-sc");
        if (!a || !(a.dataset.scroll || a.dataset.submit)) return;
        const here = (location.pathname.match(/^\/customer\/[0-9a-f-]{36}\/([^/]*)/i) || [])[1];
        const same = here === a.dataset.path;
        if (same) e.preventDefault(); // already on the page: act in place
        if (a.dataset.scroll) {
          if (same) scrollToSection(a.dataset.scroll, CONFIG.shortcuts.find((x) => x.scrollTo === a.dataset.scroll)?.submitUnder);
          else
            try {
              sessionStorage.setItem("tf_scroll", a.dataset.scroll); // scroll after the next page loads
            } catch (_) {}
        }
        if (a.dataset.submit) {
          if (same) submitAllSearches();
          else
            try {
              sessionStorage.setItem("tf_submit", a.dataset.path); // submit after the next page loads
            } catch (_) {}
        }
      });
    }
    try {
      if (sessionStorage.getItem("tf_submit") === current) {
        sessionStorage.removeItem("tf_submit");
        submitAllSearches();
      }
    } catch (_) {}
    try {
      const pending = sessionStorage.getItem("tf_scroll");
      const target = CONFIG.shortcuts.find((x) => x.scrollTo === pending);
      if (pending && target && target.path === current) {
        sessionStorage.removeItem("tf_scroll");
        scrollToSection(pending, target.submitUnder);
      }
    } catch (_) {}
    bar.querySelectorAll(".tf-sc").forEach((a) => {
      const active = a.dataset.path === current && !a.dataset.scroll; // scroll shortcuts share a page, so no highlight
      a.href = `/customer/${id}/${a.dataset.path}`; // real link: cmd/ctrl-click opens a new tab
      a.style.background = active ? "#1555d6" : "#fff";
      a.style.color = active ? "#fff" : "#1555d6";
    });
  }

  new MutationObserver(() => {
    const d = getDrawer();
    if (d) inject(d);
    fillConfirmPopup();
    ensureShortcutBar();
  }).observe(document.body, { childList: true, subtree: true });
})();
