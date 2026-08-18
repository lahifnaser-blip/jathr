/* ══════════ بُنيان — أدوات مشتركة: طباعة، مشاركة، حفظ PDF ══════════
   ملف واحد تستعمله الصفحات الثلاث. لا حاجة لتعديله عادةً. */
(function(){
  const W = window;

  function toast(msg){
    let el = document.getElementById("__bt_toast");
    if(!el){
      el = document.createElement("div");
      el.id = "__bt_toast";
      el.style.cssText = "position:fixed;inset-inline:0;bottom:1.2rem;margin:0 auto;width:max-content;"
        + "max-width:88vw;background:#1C1A15;color:#F7F2E4;padding:.55rem 1rem;border-radius:4px;"
        + "font-family:'IBM Plex Sans Arabic',sans-serif;font-size:.82rem;z-index:99999;opacity:0;"
        + "transition:opacity .25s;pointer-events:none;text-align:center;direction:rtl";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = "0"; }, 2400);
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      if(document.querySelector('script[data-bt="' + src + '"]')){ resolve(); return; }
      const s = document.createElement("script");
      s.src = src; s.defer = true; s.dataset.bt = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("تعذّر تحميل " + src));
      document.head.appendChild(s);
    });
  }

  async function ensurePdfLibs(){
    if(!W.html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    if(!(W.jspdf && W.jspdf.jsPDF)) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }

  function print_(){ window.print(); }

  /* ——— مشاركة: تفتح قائمة النظام على الهاتف (واتساب وغيره)، أو قائمة احتياطية على الحاسوب ——— */
  async function share(opts){
    opts = opts || {};
    const url = opts.url || location.href;
    const title = opts.title || document.title;
    const text = opts.text || "";
    if(navigator.share){
      try { await navigator.share({ title, text, url }); return; }
      catch(e){ if(e && e.name === "AbortError") return; }
    }
    fallbackMenu({ title, text, url });
  }

  function fallbackMenu({ title, text, url }){
    document.querySelectorAll(".__bt_menu").forEach(m => m.remove());
    const q = encodeURIComponent((text ? text + " " : "") + url);
    const items = [
      ["واتساب", "https://wa.me/?text=" + q],
      ["تلغرام", "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text || title || "")],
      ["إكس (تويتر)", "https://twitter.com/intent/tweet?text=" + q],
      ["نسخ الرابط", "#copy"],
    ];
    const menu = document.createElement("div");
    menu.className = "__bt_menu";
    menu.style.cssText = "position:fixed;inset:0;background:rgba(28,26,21,.4);z-index:99998;"
      + "display:flex;align-items:flex-end;justify-content:center";
    menu.innerHTML = '<div style="background:#F7F2E4;border-radius:10px 10px 0 0;padding:1rem;width:100%;'
      + 'max-width:420px;font-family:\'IBM Plex Sans Arabic\',sans-serif;box-shadow:0 -4px 20px rgba(0,0,0,.25);'
      + 'direction:rtl">'
      + '<div style="font-size:.82rem;color:#6A6355;margin-bottom:.4rem;text-align:center">مشاركة عبر</div>'
      + items.map(([label, href]) =>
          '<a href="' + href + '" target="_blank" rel="noreferrer" data-href="' + href + '" '
          + 'style="display:block;padding:.75rem .5rem;border-top:1px solid #E1D8C0;text-decoration:none;'
          + 'color:#1C1A15;font-size:.92rem;text-align:center;min-height:24px">' + label + '</a>').join("")
      + '<button data-close style="display:block;width:100%;margin-top:.6rem;padding:.65rem;border-radius:4px;'
      + 'border:1px solid #E1D8C0;background:#EAE2CE;font-family:inherit;font-size:.85rem;min-height:24px">إلغاء</button>'
      + '</div>';
    document.body.appendChild(menu);
    menu.addEventListener("click", async (e) => {
      if(e.target === menu || e.target.hasAttribute("data-close")){ menu.remove(); return; }
      const a = e.target.closest('a[data-href="#copy"]');
      if(a){
        e.preventDefault();
        try { await navigator.clipboard.writeText(url); toast("نُسخ الرابط"); } catch(err){}
        menu.remove();
      }
    });
  }

  /* ——— حفظ PDF: لقطة حقيقية من العنصر، فتُرسم الحروف العربية كما تُرى تمامًا ——— */
  async function savePDF(target, filename, opts){
    opts = opts || {};
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if(!el || !el.textContent || !el.textContent.trim()){ toast("لا محتوى لحفظه بعد"); return; }
    toast("يُجهَّز ملفّ PDF…");
    try{
      await ensurePdfLibs();
      const scale = Math.min(2, window.devicePixelRatio || 1.5);
      const canvas = await html2canvas(el, { scale, backgroundColor: opts.bg || "#EAE2CE", useCORS: true });
      const { jsPDF } = window.jspdf;
      const pageW = 210, pageH = 297, margin = 10;
      const usableW = pageW - margin * 2, usableH = pageH - margin * 2;
      const stepPx = Math.floor(usableH * canvas.width / usableW);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      let y = 0, page = 0;
      while(y < canvas.height){
        const sliceH = Math.min(stepPx, canvas.height - y);
        const c2 = document.createElement("canvas");
        c2.width = canvas.width; c2.height = sliceH;
        const ctx = c2.getContext("2d");
        ctx.fillStyle = opts.bg || "#EAE2CE"; ctx.fillRect(0, 0, c2.width, c2.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const imgData = c2.toDataURL("image/jpeg", 0.92);
        const heightMm = sliceH * usableW / canvas.width;
        if(page > 0) doc.addPage();
        doc.addImage(imgData, "JPEG", margin, margin, usableW, heightMm);
        y += sliceH; page++;
        if(page > 25) break;
      }
      doc.save(filename || "بنيان.pdf");
      toast("حُفظ الملف");
    }catch(e){
      toast("تعذّر إنشاء PDF — جرّب زرّ الطباعة واختر «حفظ كـ PDF» من قائمة الطابعة");
    }
  }

  W.BunyanTools = { print: print_, share, savePDF, toast };
})();
