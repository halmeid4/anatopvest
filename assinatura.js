// Comum ao recibo e ao agendamento: assinatura com o dedo e dados dentro do link (#hash).
const $ = id => document.getElementById(id);
const dataBR = s => s ? s.split("-").reverse().join("/") : "";
const agora = () => new Date().toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
const abrirWhats = (fone, texto) => {
  const url = "https://wa.me/" + fone + "?text=" + encodeURIComponent(texto);
  if (!window.open(url, "_blank")) location.href = url;
};
const foneBR = s => { let f = String(s).replace(/\D/g, ""); return f.length < 10 ? "" : f.startsWith("55") ? f : "55" + f; };

// o #hash não é enviado a servidor nenhum
const enc = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec = s => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0))));
const linkCom = dados => location.href.split("#")[0] + "#" + enc(dados);
const lerHash = () => location.hash.length > 1 ? dec(location.hash.slice(1)) : null;

// traços guardados num espaço fixo 500x160, assim a assinatura cabe no link e redesenha em qualquer tela
function criarAssinatura(cv, { editavel = true, aoMudar } = {}) {
  const W = 500, H = 160, ctx = cv.getContext("2d");
  let tracos = [], atual = null;
  const desenhar = () => {
    ctx.clearRect(0, 0, W, H);
    tracos.forEach(t => {
      ctx.beginPath();
      t.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      if (t.length === 1) ctx.lineTo(t[0][0] + 0.5, t[0][1]);
      ctx.stroke();
    });
  };
  const preparar = () => {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = ctx.lineJoin = "round"; ctx.strokeStyle = "#1a237e";
    desenhar();
  };
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * W / r.width), Math.round((e.clientY - r.top) * H / r.height)]; };
  const fim = () => { if (atual) { atual = null; aoMudar && aoMudar(); } };
  if (editavel) {
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); atual = [pos(e)]; tracos.push(atual); desenhar(); });
    cv.addEventListener("pointermove", e => {
      if (!atual) return;
      const p = pos(e), u = atual[atual.length - 1];
      if (Math.abs(p[0] - u[0]) + Math.abs(p[1] - u[1]) < 3) return; // menos pontos = link menor
      atual.push(p); desenhar();
    });
    cv.addEventListener("pointerup", fim);
    cv.addEventListener("pointercancel", fim);
  }
  new ResizeObserver(preparar).observe(cv);
  return {
    get vazia() { return !tracos.length; },
    get dados() { return tracos.map(t => t.map(p => p.join(",")).join(" ")).join(";"); },
    set dados(s) { tracos = s ? s.split(";").map(t => t.split(" ").map(p => p.split(",").map(Number))) : []; desenhar(); },
    limpar() { tracos = []; desenhar(); aoMudar && aoMudar(); }
  };
}

console.assert(dec(enc({ a:"Locação ção 🎉 R$ 1.200,50" })).a === "Locação ção 🎉 R$ 1.200,50", "enc/dec");
