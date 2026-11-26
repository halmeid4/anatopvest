// Comum ao recibo e ao agendamento: assinatura com o dedo e dados dentro do link (#hash).
const $ = id => document.getElementById(id);
const dataBR = s => s ? s.split("-").reverse().join("/") : "";
const agora = () => new Date().toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
const abrirWhats = (fone, texto) => {
  const url = "https://wa.me/" + fone + "?text=" + encodeURIComponent(texto);
  if (!window.open(url, "_blank")) location.href = url;
};
const foneBR = s => { let f = String(s).replace(/\D/g, ""); return f.length < 10 ? "" : f.startsWith("55") ? f : "55" + f; };

// dados no ?d= do link: o WhatsApp do iPhone não deixa clicável o que vem depois do "#"
const enc = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec = s => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0))));
const linkCom = dados => location.origin + location.pathname + "?d=" + enc(dados);
const lerHash = () => { const s = new URLSearchParams(location.search).get("d") || location.hash.slice(1); return s ? dec(s) : null; }; // "#" = links antigos

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
  const lim = (v, max) => Math.min(Math.max(Math.round(v), 0), max);
  const pos = e => { const r = cv.getBoundingClientRect(); return [lim((e.clientX - r.left) * W / r.width, W), lim((e.clientY - r.top) * H / r.height, H)]; };
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
    get dados() { return tracosParaTexto(tracos); },
    set dados(s) { tracos = textoParaTracos(s); desenhar(); },
    limpar() { tracos = []; desenhar(); aoMudar && aoMudar(); }
  };
}

// Assinatura compacta (link curto, o WhatsApp do Android corta link longo):
// cada traço = ponto inicial em 4 letras + 2 letras por passo (dx, dy de -31 a 32); traços separados por "."
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function tracosParaTexto(tracos) {
  const passo = d => Math.min(Math.max(d, -31), 32);
  return tracos.map(t => {
    let [px, py] = t[0], s = B64[px >> 6] + B64[px & 63] + B64[py >> 6] + B64[py & 63];
    for (const [x, y] of t.slice(1)) {
      let dx = x - px, dy = y - py;
      while (dx || dy) { const sx = passo(dx), sy = passo(dy); s += B64[sx + 31] + B64[sy + 31]; px += sx; py += sy; dx -= sx; dy -= sy; }
    }
    return s;
  }).join(".");
}
function textoParaTracos(s) {
  if (!s) return [];
  if (s.includes(",")) return s.split(";").map(t => t.split(" ").map(p => p.split(",").map(Number))); // formato antigo
  const n = c => B64.indexOf(c);
  return s.split(".").map(t => {
    let x = n(t[0]) * 64 + n(t[1]), y = n(t[2]) * 64 + n(t[3]);
    const pts = [[x, y]];
    for (let i = 4; i < t.length; i += 2) { x += n(t[i]) - 31; y += n(t[i + 1]) - 31; pts.push([x, y]); }
    return pts;
  });
}
{ // autoteste: os pontos originais voltam iguais (passos intermediários são só retas no meio)
  const r = textoParaTracos(tracosParaTexto([[[0,0],[100,3],[500,160]],[[7,9]]])), tem = (t, p) => t.some(q => q[0] === p[0] && q[1] === p[1]);
  console.assert(tem(r[0], [0,0]) && tem(r[0], [100,3]) && tem(r[0], [500,160]) && r[1].length === 1 && tem(r[1], [7,9]), "assinatura compacta", JSON.stringify(r));
}
console.assert(dec(enc({ a:"Locação ção 🎉 R$ 1.200,50" })).a === "Locação ção 🎉 R$ 1.200,50", "enc/dec");
