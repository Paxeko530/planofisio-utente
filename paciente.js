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
  let desenhaAgora = () => {};
  const hoje = () => new Date().toLocaleDateString("sv-SE");   // AAAA-MM-DD, hora local

  function lePro() {
    try { const d = JSON.parse(localStorage.getItem(chave)); if (d && typeof d.dias === "object" && d.dias) return d; } catch (e) { /* sem dados */ }
    return { dias: {} };
  }
  function guardaPro(d) { try { localStorage.setItem(chave, JSON.stringify(d)); return true; } catch (e) { return false; } }

  /* ---------- privacidade ---------- */
  function cartaoPrivacidade() {
    return h("div", { class: "card" },
      h("h3", { style: "margin:0 0 6px" }, "Privacidade"),
      h("ul", { class: "muted", style: "margin:0;padding-left:18px" },
        h("li", null, "O plano foi-lhe enviado pela sua fisioterapeuta. O link contém o plano e o seu primeiro nome."),
        h("li", null, "O seu progresso («Feito hoje» e a dor) fica guardado só neste telemóvel, no navegador. Nada é enviado automaticamente."),
        h("li", null, "Só envia informação quando toca em «Enviar resumo» e escolhe a conversa."),
        h("li", null, "Esta página não usa anúncios nem análise de visitas. Como em qualquer site, o alojamento pode registar o acesso técnico; o plano vai no link, depois do #, e não é enviado ao servidor."),
        h("li", null, "Pode apagar aqui o progresso deste plano a qualquer momento.")),
      h("div", { class: "linha" }, h("button", { class: "btn perigo", onclick: () => {
        if (!window.confirm("Apagar o seu progresso deste plano neste telemóvel? Não é possível desfazer.")) return;
        try { localStorage.removeItem(chave); } catch (e) { /* sem armazenamento */ }
        desenhaAgora();
      } }, "Apagar o meu progresso")));
  }

  /* ---------- enviar o resumo à fisioterapeuta ---------- */
  function mostraCopia(texto) {
    const area = h("textarea", { readonly: true, rows: 8, "aria-label": "Mensagem para enviar" }, texto);
    const msg = h("p", { class: "muted", role: "status" });
    const copiar = async () => {
      try { await navigator.clipboard.writeText(texto); msg.textContent = "Mensagem copiada. Cole-a numa conversa com a sua fisioterapeuta."; }
      catch (e) { area.select(); msg.textContent = "Selecione o texto e copie-o."; }
    };
    const cx = h("div", { class: "card aviso", id: "copia" },
      h("p", { style: "margin:0 0 6px;font-weight:700" }, "Copie esta mensagem e envie-a à sua fisioterapeuta"), area,
      h("div", { class: "linha" }, h("button", { class: "btn prim", onclick: copiar }, "Copiar mensagem")), msg);
    const antigo = document.getElementById("copia"); if (antigo) antigo.remove();
    app.prepend(cx); window.scrollTo(0, 0);
  }

  // Abre o WhatsApp da fisioterapeuta (se o link trouxer o número), a partilha do telemóvel, ou mostra o texto para copiar.
  function enviaResumo(r) {
    const p = r.plano, ids = p.itens.map(i => i.exId);
    const resumo = Logica.resumoDoUtente(r.k, lePro(), ids, hoje());
    const texto = Logica.mensagemResumo({ nomePlano: p.nome, paraNome: r.paraNome, resumo });
    if (r.contacto) { window.open("https://wa.me/" + r.contacto + "?text=" + encodeURIComponent(texto), "_blank", "noopener"); return; }
    if (navigator.share) { navigator.share({ text: texto }).catch(() => {}); return; }
    mostraCopia(texto);
  }

  /* ---------- lembretes no calendário ---------- */
  let horaLembrete = "18:00";

  // Cria um ficheiro .ics (evento semanal nos dias do plano, aviso 10 min antes) e entrega-o ao telemóvel.
  function pedeLembretes(r, estado) {
    const hm = horaLembrete.split(":").map(Number);
    const hojeS = hoje();
    const limite = r.expiraEm != null ? new Date(r.expiraEm * 86400000).toISOString().slice(0, 10)
      : new Date(Date.parse(hojeS + "T00:00:00Z") + 84 * 86400000).toISOString().slice(0, 10);
    const ics = Logica.criaIcs({ nome: r.plano.nome, freq: r.plano.frequencia, hm, inicio: hojeS, ate: limite,
      url: location.href, uid: r.k || chave, agoraISO: new Date().toISOString() });
    if (!ics) { estado.textContent = "Não foi possível criar os lembretes: o plano termina antes do primeiro dia."; return; }
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) window.location.assign(url);
    else { const a = h("a", { href: url, download: "lembretes-plano.ics" }); document.body.append(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    estado.textContent = "Pronto. Abra o ficheiro que foi guardado para pôr os lembretes no calendário.";
  }

  function cartaoLembretes(r) {
    const estado = h("p", { id: "msg-lembretes", class: "muted", role: "status", style: "margin:8px 0 0" });
    return h("div", { class: "card" },
      h("h3", { style: "margin:0 0 4px" }, "Lembretes"),
      h("p", { class: "muted", style: "margin:0" }, `Põe lembretes no calendário do telemóvel, ${r.plano.frequencia}× por semana, com um aviso 10 minutos antes.`),
      h("label", { for: "hora-lembrete" }, "A que horas?"),
      h("select", { id: "hora-lembrete", onchange: ev => { horaLembrete = ev.target.value; } },
        [["09:00", "De manhã (9:00)"], ["15:00", "À tarde (15:00)"], ["18:00", "Ao fim do dia (18:00)"], ["20:00", "À noite (20:00)"]]
          .map(([v, t]) => h("option", { value: v, selected: v === horaLembrete }, t))),
      h("div", { class: "linha" }, h("button", { class: "btn", onclick: () => pedeLembretes(r, estado) }, "Pôr lembretes no calendário")),
      estado);
  }

  /* ---------- sessão guiada ---------- */
  function bip() {
    try { if (navigator.vibrate) navigator.vibrate(250); } catch (e) { /* sem vibração */ }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = new C(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); setTimeout(() => { o.stop(); c.close(); }, 350);
    } catch (e) { /* sem som */ }
  }

  function sessao(r, aoFechar) {
    const p = r.plano, porId = new Map(r.exercicios.map(e => [e.id, e]));
    const pro = lePro(), dia = hoje();
    const itens = Logica.itensDaSessao(p.itens, new Set(pro.dias[dia] || []));
    let i = 0, serie = 1, fase = "fazer", resta = 0, rodando = false, terminou = false, tm = null, bloqueio = null;
    const ov = h("div", { id: "sessao", role: "dialog", "aria-modal": "true", "aria-label": "Sessão guiada" });
    document.body.append(ov); app.setAttribute("inert", "");
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(w => { bloqueio = w; }).catch(() => {}); } catch (e) { /* sem ecrã ligado */ }

    function fecha() {
      clearInterval(tm); ov.remove(); app.removeAttribute("inert");
      try { if (bloqueio) bloqueio.release(); } catch (e) { /* já libertado */ }
      aoFechar();
    }
    function reinicia() { clearInterval(tm); resta = 0; rodando = false; terminou = false; }
    function feitoSerie() {
      reinicia();
      const it = itens[i];
      if (serie < it.series) { serie++; desenha(); return; }
      const d = lePro(); const l = new Set(d.dias[dia] || []); l.add(it.exId); d.dias[dia] = [...l]; guardaPro(d);
      serie = 1; i++;
      fase = i >= itens.length ? "dor" : "fazer";
      desenha();
    }
    function comeca(seg) {
      reinicia(); resta = seg; rodando = true;
      tm = setInterval(() => { resta--; if (resta <= 0) { clearInterval(tm); rodando = false; terminou = true; resta = 0; bip(); } desenha(); }, 1000);
      desenha();
    }
    function regista(dor) { const d = lePro(); d.dor = d.dor || {}; d.dor[dia] = dor; guardaPro(d); fase = "fim"; desenha(); }

    function desenha() {
      let tela;
      if (fase === "dor") {
        tela = [h("h2", null, "Como se sentiu?"),
          h("p", { class: "muted" }, "Escolha a resposta que mais se parece com o que sentiu hoje."),
          h("button", { class: "grande", onclick: () => regista(0) }, "Sem dor"),
          h("button", { class: "grande", onclick: () => regista(1) }, "Um pouco de dor"),
          h("button", { class: "grande", onclick: () => regista(2) }, "Dor forte"),
          h("button", { class: "grande sec", onclick: () => { fase = "fim"; desenha(); } }, "Prefiro não responder")];
      } else if (fase === "fim") {
        const dor = (lePro().dor || {})[dia];
        tela = [h("h2", null, "Sessão concluída!"), h("p", { style: "font-size:22px" }, "Bom trabalho. Volte amanhã ou no próximo dia do plano."),
          dor === 2 && r.aviso ? h("p", { class: "card aviso", style: "white-space:pre-wrap" }, r.aviso) : null,
          r.k ? h("button", { class: "grande", onclick: () => enviaResumo(r) }, "Enviar à fisioterapeuta") : null,
          h("button", { class: r.k ? "grande sec" : "grande", onclick: fecha }, "Fechar")];
      } else {
        const it = itens[i], e = porId.get(it.exId);
        const porTempo = it.segundos != null;
        const ant = Logica.passoAnterior(itens, i, serie);
        const acao = !porTempo ? h("button", { class: "grande", onclick: feitoSerie }, "Feito")
          : terminou ? h("button", { class: "grande", onclick: feitoSerie }, "Feito")
          : rodando ? h("button", { class: "grande sec", onclick: () => { reinicia(); desenha(); } }, "Parar")
          : h("button", { class: "grande", onclick: () => comeca(it.segundos) }, `Começar (${it.segundos} s)`);
        tela = [
          h("div", { class: "topo-sessao" }, h("span", null, `Exercício ${i + 1} de ${itens.length}`), h("button", { class: "sec-pequeno", onclick: fecha }, "Sair")),
          h("h2", { style: "margin:6px 0" }, e.nome),
          e.figura && FIGURAS[e.figura] ? h("div", { class: "figbox f-" + e.objetivo }, criaFigura({ ...FIGURAS[e.figura], nome: e.nome })) : null,
          h("p", { class: "dose-grande" }, porTempo ? `${it.segundos} segundos` : `${it.repeticoes} repetições`, it.nota ? " " + it.nota : ""),
          h("p", { class: "serie" }, `Série ${serie} de ${it.series}`),
          porTempo && (rodando || terminou) ? h("p", { class: "relogio", role: "timer", "aria-live": "off" }, terminou ? "Pronto!" : Logica.formataSeg(resta)) : null,
          h("p", { style: "font-size:20px;line-height:1.45" }, e.descricao),
          e.cuidados ? h("p", { class: "muted" }, "Cuidados: " + e.cuidados) : null,
          acao,
          ant ? h("button", { class: "grande sec", onclick: () => { reinicia(); i = ant.i; serie = ant.serie; desenha(); } }, "Voltar atrás") : null,
        ];
      }
      ov.replaceChildren(h("div", { class: "sessao-caixa" }, tela.filter(Boolean)));
      ov.scrollTop = 0;
    }
    desenha();
  }

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
      h("button", { class: "btn prim botao-sessao", onclick: () => sessao(r, aoMudar) },
        feitosHoje.size === total && total ? "Repetir a sessão de hoje" : feitosHoje.size ? "Continuar a sessão de hoje" : "Começar a sessão de hoje"),
      r.k && (Object.keys(pro.dias).length || Object.keys(pro.dor || {}).length)
        ? h("button", { class: "btn botao-sessao", style: "margin-top:-4px", onclick: () => enviaResumo(r) }, "Enviar resumo à fisioterapeuta") : null,
      h("ul", { class: "lista" }, cartoes),
      cartaoLembretes(r),
      cartaoPrivacidade(),
      r.aviso ? h("p", { class: "muted", style: "white-space:pre-wrap" }, r.aviso) : null,
      h("p", { class: "muted" }, "O seu progresso fica só neste telemóvel. Guarde a mensagem com o link para voltar a este plano."),
    ];
  }

  function arranca() {
    const m = /^#p=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) { app.replaceChildren(...cartaoMsg("Falta o plano", "Abra o link que a sua fisioterapeuta lhe enviou.")); return; }
    const r = Logica.planoDeLink(m[1], REGIOES, OBJETIVOS, Object.keys(FIGURAS), SEMENTE, new Date().toISOString());
    if (r.expirado) { app.replaceChildren(...cartaoMsg("Este plano já não está disponível", "Peça um novo link à sua fisioterapeuta.")); return; }
    if (!r.ok) { app.replaceChildren(...cartaoMsg("Link inválido", "Este link não está completo ou foi alterado. Peça um novo à sua fisioterapeuta.")); return; }
    document.title = r.plano.nome + " · PlanoFisio";
    const id = Array.from(Logica.sha256(new TextEncoder().encode(m[1])).slice(0, 8), x => x.toString(16).padStart(2, "0")).join("");
    chave = "pf-utente-" + id;
    const desenha = () => { const y = window.scrollY; app.replaceChildren(...vista(r, desenha).flat().filter(Boolean)); window.scrollTo(0, y); };
    desenhaAgora = desenha;
    desenha();
  }

  window.addEventListener("hashchange", arranca);
  arranca();
})();
