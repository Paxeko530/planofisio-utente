/* Página do utente: abre o plano que vem no link (#p=...) e deixa marcar os exercícios feitos hoje.
   Corre no navegador de qualquer telemóvel (Android ou iPhone). Nada é enviado: o progresso fica neste telemóvel. */
(function () {
  "use strict";
  const app = document.getElementById("app");

  function h(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v === false || v == null) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) if (f != null && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
    return e;
  }

  const cartaoMsg = (titulo, texto) => [h("h1", null, "PlanoFisio"), h("div", { class: "card" }, h("h2", { style: "margin:0 0 6px" }, titulo), h("p", { style: "margin:0" }, texto))];
  const plural = (n, um, varios) => n === 1 ? `1 ${um}` : `${n} ${varios}`;

  /* ---------- progresso (só neste telemóvel) ---------- */
  let chave = null;
  const hoje = () => new Date().toLocaleDateString("sv-SE");   // AAAA-MM-DD, hora local

  function lePro() {
    try { const d = JSON.parse(localStorage.getItem(chave)); if (d && typeof d.dias === "object" && d.dias) return d; } catch (e) { /* sem dados */ }
    return { dias: {} };
  }
  function guardaPro(d) { try { localStorage.setItem(chave, JSON.stringify(d)); return true; } catch (e) { return false; } }

  /* ---------- vista ---------- */
  function vista(r, aoMudar) {
    const p = r.plano;
    const porId = new Map(r.exercicios.map(e => [e.id, e]));
    const pro = lePro();
    const dia = hoje();
    const feitosHoje = new Set((pro.dias[dia] || []).filter(id => p.itens.some(i => i.exId === id)));
    const total = p.itens.length;
    const diasCompletos = Object.values(pro.dias).filter(l => p.itens.every(i => l.includes(i.exId))).length;

    const barra = h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": feitosHoje.size, "aria-label": "Exercícios feitos hoje" },
      h("i", { style: `width:${total ? Math.round(100 * feitosHoje.size / total) : 0}%` }));
    const resumo = h("p", { class: "sub", style: "margin:6px 0 0" },
      feitosHoje.size === total && total ? "Hoje está completo. Bom trabalho!" : `Hoje: ${feitosHoje.size} de ${total} exercícios feitos.`,
      diasCompletos ? ` Dias completos: ${diasCompletos}.` : "");

    function marca(id, valor) {
      const lista = new Set(pro.dias[dia] || []);
      if (valor) lista.add(id); else lista.delete(id);
      pro.dias[dia] = [...lista];
      guardaPro(pro);
      aoMudar();
    }

    const cartoes = p.itens.map((it, n) => {
      const e = porId.get(it.exId);
      const campo = (t, v) => v ? [h("dt", null, t), h("dd", null, v)] : [];
      const feito = feitosHoje.has(it.exId);
      return h("li", { class: "card" + (feito ? " feito" : "") },
        h("h3", { style: "margin:0 0 6px" }, `${n + 1}. ${e.nome}`),
        e.figura && FIGURAS[e.figura] ? h("div", { class: "figbox f-" + e.objetivo }, criaFigura({ ...FIGURAS[e.figura], nome: e.nome })) : null,
        h("dl", null, campo("Quantas vezes", Logica.doseTexto(it)), campo("Material", e.material), campo("Como fazer", e.descricao), campo("Cuidados", e.cuidados)),
        h("label", { class: "caixa", style: "margin-top:10px" },
          h("input", { type: "checkbox", checked: feito, onchange: ev => marca(it.exId, ev.target.checked) }), "Feito hoje"));
    });

    return [
      h("header", null, h("p", { class: "sub", style: "margin:0" }, "PlanoFisio" + (r.profissional ? " · " + r.profissional : "")),
        h("h1", null, p.nome),
        h("p", { class: "sub" }, (r.paraNome ? "Para " + r.paraNome + " · " : "") + `${p.frequencia}× por semana · ${plural(total, "exercício", "exercícios")}`)),
      p.notas ? h("div", { class: "card aviso" }, h("p", { style: "margin:0;white-space:pre-wrap" }, p.notas)) : null,
      h("div", { class: "card" }, barra, resumo),
      h("ul", { class: "lista" }, cartoes),
      r.aviso ? h("p", { class: "muted", style: "white-space:pre-wrap" }, r.aviso) : null,
      h("p", { class: "muted" }, "O seu progresso fica só neste telemóvel. Guarde a mensagem com o link para voltar a este plano."),
    ];
  }

  function arranca() {
    const m = /^#p=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) { app.replaceChildren(...cartaoMsg("Falta o plano", "Abra o link que a sua fisioterapeuta lhe enviou.")); return; }
    const r = Logica.planoDeLink(m[1], REGIOES, OBJETIVOS, Object.keys(FIGURAS), SEMENTE, new Date().toISOString());
    if (!r.ok) { app.replaceChildren(...cartaoMsg("Link inválido", "Este link não está completo ou foi alterado. Peça um novo à sua fisioterapeuta.")); return; }
    document.title = r.plano.nome + " · PlanoFisio";
    const id = Array.from(Logica.sha256(new TextEncoder().encode(m[1])).slice(0, 8), x => x.toString(16).padStart(2, "0")).join("");
    chave = "pf-utente-" + id;
    const desenha = () => { const y = window.scrollY; app.replaceChildren(...vista(r, desenha).flat().filter(Boolean)); window.scrollTo(0, y); };
    desenha();
  }

  window.addEventListener("hashchange", arranca);
  arranca();
})();
