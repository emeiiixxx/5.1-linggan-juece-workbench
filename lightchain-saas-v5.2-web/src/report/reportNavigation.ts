export type ReportNavigationItem = {
  id: string;
  label: string;
};

type ReportNavigationOptions = {
  items: readonly ReportNavigationItem[];
  triggerId: string;
  label?: string;
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export function buildReportNavigation({ items, triggerId, label = "CONTENTS" }: ReportNavigationOptions) {
  const links = items.map((item) => `
    <a class="report-nav__link" href="#${escapeHtml(item.id)}" data-report-nav-link>
      <strong>${escapeHtml(item.label)}</strong>
    </a>`).join("");
  const targetIds = JSON.stringify(items.map((item) => item.id));

  return {
    markup: `<nav class="report-nav" data-report-nav aria-label="报告章节导航"><div class="report-nav__inner"><span class="report-nav__label">${escapeHtml(label)}</span><div class="report-nav__links">${links}</div></div></nav>`,
    styles: `
    html{scroll-padding-top:74px}
    .report-nav{position:fixed;z-index:100;inset:0 0 auto;height:58px;border-bottom:1px solid rgba(17,21,19,.14);background:rgba(248,248,245,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-100%);transition:opacity .24s ease,transform .36s cubic-bezier(.22,1,.36,1),visibility .24s ease}
    .report-nav-visible .report-nav{opacity:1;visibility:visible;pointer-events:auto;transform:none}
    .report-nav__inner{display:flex;height:100%;align-items:stretch;gap:clamp(22px,3vw,52px);padding:0 clamp(20px,3.5vw,56px)}
    .report-nav__label{display:flex;flex:0 0 auto;max-width:240px;align-items:center;overflow:hidden;color:#6b7470;font-size:14px;font-weight:700;letter-spacing:.13em;text-overflow:ellipsis;white-space:nowrap}
    .report-nav__links{display:flex;min-width:0;flex:1;align-items:stretch;gap:clamp(22px,2.6vw,44px);overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none}
    .report-nav__links::-webkit-scrollbar{display:none}
    .report-nav__link{position:relative;display:flex;flex:0 0 auto;align-items:center;gap:7px;color:#717976;font-size:14px;line-height:1;text-decoration:none;white-space:nowrap;transition:color .18s ease}
    .report-nav__link::after{content:"";position:absolute;right:0;bottom:0;left:0;height:2px;background:#151918;transform:scaleX(0);transform-origin:left;transition:transform .22s ease}
    .report-nav__link strong{font-size:14px;font-weight:560}
    .report-nav__link:hover,.report-nav__link.is-active{color:#151918}
    .report-nav__link.is-active::after{transform:scaleX(1)}
    @media(max-width:720px){.report-nav__inner{gap:18px;padding:0 18px}.report-nav__label{max-width:92px}.report-nav__links{gap:24px}}
    @media(max-width:480px){.report-nav__label{display:none}}
    @media(prefers-reduced-motion:reduce){.report-nav,.report-nav__link,.report-nav__link::after{transition:none!important}}
    @media print{.report-nav{display:none!important}}`,
    script: `(function(){
      var nav=document.querySelector("[data-report-nav]");
      var trigger=document.getElementById(${JSON.stringify(triggerId)});
      var targetIds=${targetIds};
      if(!nav||!trigger||!targetIds.length)return;
      var links=Array.prototype.slice.call(nav.querySelectorAll("[data-report-nav-link]"));
      var targets=targetIds.map(function(id){return document.getElementById(id)}).filter(Boolean);
      var reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var ticking=false;
      var setActive=function(activeId){
        links.forEach(function(link){
          var active=link.getAttribute("href")==="#"+activeId;
          link.classList.toggle("is-active",active);
          if(active)link.setAttribute("aria-current","location");else link.removeAttribute("aria-current");
        });
      };
      var update=function(){
        ticking=false;
        var scrollTop=window.scrollY||document.documentElement.scrollTop||0;
        var triggerTop=trigger.getBoundingClientRect().top+scrollTop;
        document.documentElement.classList.toggle("report-nav-visible",scrollTop>=triggerTop-1);
        var activeId=targets[0]&&targets[0].id;
        targets.forEach(function(target){
          var targetTop=target.getBoundingClientRect().top+scrollTop;
          if(targetTop<=scrollTop+76)activeId=target.id;
        });
        if(activeId)setActive(activeId);
      };
      var requestUpdate=function(){if(ticking)return;ticking=true;window.requestAnimationFrame(update)};
      links.forEach(function(link){
        link.addEventListener("click",function(event){
          var id=link.getAttribute("href").slice(1);
          var target=document.getElementById(id);
          if(!target)return;
          event.preventDefault();
          setActive(id);
          target.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"});
          link.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"nearest",inline:"center"});
        });
      });
      window.addEventListener("scroll",requestUpdate,{passive:true});
      window.addEventListener("resize",requestUpdate);
      update();
    })();`,
  };
}
