/* Lógica pura (sem DOM), testável em Node: tests/logica.test.js */
const Logica = (function () {
  const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const por = (a, b) => a.localeCompare(b, "pt");

  let sequencia = 0;   // garante ids distintos mesmo dentro do mesmo milissegundo
  function novoId(prefixo) {
    return (prefixo || "e") + Date.now().toString(36) + (sequencia++).toString(36) + Math.random().toString(36).slice(2, 5);
  }

  // "" / null / undefined -> null; inteiro -> número; qualquer outra coisa -> NaN
  function inteiro(v) {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isInteger(n) ? n : NaN;
  }

  const textoMax = (f, erros, c, max, msg) => { if (String(f[c] || "").length > max) erros[c] = msg; };
  const t = (f, c) => String(f[c] || "").trim();

  function nomeObrigatorio(f, erros) {
    const nome = t(f, "nome");
    if (!nome) erros.nome = "Escreva o nome.";
    else if (nome.length > 80) erros.nome = "O nome pode ter no máximo 80 caracteres.";
    return nome;
  }

  // Séries + (repetições ou segundos) + nota. Preenche erros e devolve os valores normalizados.
  function dose(f, erros) {
    const series = inteiro(f.series), reps = inteiro(f.repeticoes), seg = inteiro(f.segundos);
    if (series === null || Number.isNaN(series) || series < 1 || series > 20) erros.series = "Séries: um número de 1 a 20.";
    if (Number.isNaN(reps) || (reps !== null && (reps < 1 || reps > 200))) erros.repeticoes = "Repetições: um número de 1 a 200.";
    if (Number.isNaN(seg) || (seg !== null && (seg < 1 || seg > 600))) erros.segundos = "Segundos: um número de 1 a 600.";
    if (!erros.repeticoes && !erros.segundos) {
      if (reps === null && seg === null) erros.repeticoes = "Indique repetições ou segundos.";
      else if (reps !== null && seg !== null) erros.segundos = "Use repetições ou segundos, não os dois.";
    }
    textoMax(f, erros, "nota", 120, "A nota da dose pode ter no máximo 120 caracteres.");
    return { series, repeticoes: reps, segundos: seg, nota: t(f, "nota") };
  }

  const fim = (erros, valor) => ({ ok: Object.keys(erros).length === 0, erros, valor });

  /* ---------- exercícios ---------- */
  function valida(f, regioes, objetivos) {
    const erros = {};
    const nome = nomeObrigatorio(f, erros);
    if (!regioes.includes(f.regiao)) erros.regiao = "Escolha a região do corpo.";
    if (!objetivos.includes(f.objetivo)) erros.objetivo = "Escolha o objetivo.";
    const d = dose(f, erros);
    textoMax(f, erros, "descricao", 2000, "A descrição pode ter no máximo 2000 caracteres.");
    textoMax(f, erros, "cuidados", 1000, "Os cuidados podem ter no máximo 1000 caracteres.");
    textoMax(f, erros, "material", 200, "O material pode ter no máximo 200 caracteres.");
    return fim(erros, { nome, regiao: f.regiao, objetivo: f.objetivo, material: t(f, "material"), descricao: t(f, "descricao"),
                        cuidados: t(f, "cuidados"), ...d, figura: f.figura || null });
  }

  function filtra(lista, { texto = "", regiao = "", objetivo = "" } = {}) {
    const q = norm(texto);
    return lista
      .filter(e => (!regiao || e.regiao === regiao) && (!objetivo || e.objetivo === objetivo))
      .filter(e => !q || norm([e.nome, e.material, e.descricao, e.cuidados].join(" ")).includes(q))
      .sort((a, b) => por(a.nome, b.nome));
  }

  function doseTexto(e) {
    const base = e.repeticoes != null ? `${e.series} × ${e.repeticoes}` : `${e.series} × ${e.segundos} seg`;
    return e.nota ? `${base} ${e.nota}` : base;
  }

  function daSemente(s, agora) {
    return { ...s, cuidados: "", figura: s.id, origem: "base", criado: agora, alterado: agora };
  }

  function repoeSementes(lista, sementes, agora) {
    const tem = new Set(lista.map(e => e.id));
    let n = 0;
    for (const s of sementes) if (!tem.has(s.id)) { lista.push(daSemente(s, agora)); n++; }
    return n;
  }

  function duplica(e, agora) {
    return { ...e, id: novoId(), nome: (e.nome + " (cópia)").slice(0, 80), origem: "meu", criado: agora, alterado: agora };
  }

  /* ---------- utentes ---------- */
  function validaUtente(f) {
    const erros = {};
    const nome = nomeObrigatorio(f, erros);
    textoMax(f, erros, "notas", 2000, "As notas podem ter no máximo 2000 caracteres.");
    return fim(erros, { nome, notas: t(f, "notas") });
  }

  function filtraUtentes(lista, { texto = "", arquivados = false } = {}) {
    const q = norm(texto);
    return lista
      .filter(u => arquivados || !u.arquivado)
      .filter(u => !q || norm(u.nome).includes(q))
      .sort((a, b) => por(a.nome, b.nome));
  }

  // Apaga o utente e todos os planos dele. Devolve quantos planos apagou.
  function apagaUtente(estado, id) {
    const antes = estado.planos.length;
    estado.planos = estado.planos.filter(p => p.utenteId !== id);
    estado.utentes = estado.utentes.filter(u => u.id !== id);
    return antes - estado.planos.length;
  }

  // Dados de um utente num ficheiro (pedido de acesso ou portabilidade). Os exercícios vão pelo nome, não por id.
  function exportaUtente(estado, utenteId, agora) {
    const u = estado.utentes.find(x => x.id === utenteId);
    if (!u) return null;
    const nomes = new Map(estado.exercicios.map(e => [e.id, e.nome]));
    return {
      formato: "planofisio-utente", versao: 1, exportadoEm: agora,
      utente: { nome: u.nome, notas: u.notas || "", arquivado: !!u.arquivado, consentimento: u.consentimento || null, criado: u.criado, alterado: u.alterado },
      planos: estado.planos.filter(p => p.utenteId === utenteId).map(p => ({
        nome: p.nome, frequencia: p.frequencia, notas: p.notas || "", fase: p.fase || 1, concluido: p.estado === "concluido",
        exercicios: p.itens.map(i => ({ exercicio: nomes.get(i.exId) || i.exId, series: i.series, repeticoes: i.repeticoes, segundos: i.segundos, nota: i.nota || "" })),
        registo: p.registo || {},
      })),
    };
  }

  // Regista (ou retira) a data em que o utente deu o consentimento para tratar os seus dados.
  function registaConsentimento(utente, hoje) {
    if (hoje === null) { delete utente.consentimento; return true; }
    if (!diaValido(hoje)) return false;
    utente.consentimento = { data: hoje };
    return true;
  }

  /* ---------- planos ---------- */
  function validaPlano(f) {
    const erros = {};
    const nome = nomeObrigatorio(f, erros);
    const freq = inteiro(f.frequencia);
    if (freq === null || Number.isNaN(freq) || freq < 1 || freq > 7) erros.frequencia = "Vezes por semana: um número de 1 a 7.";
    textoMax(f, erros, "notas", 1000, "As notas podem ter no máximo 1000 caracteres.");
    return fim(erros, { nome, frequencia: freq, notas: t(f, "notas") });
  }

  function validaDose(f) {
    const erros = {};
    const d = dose(f, erros);
    return fim(erros, d);
  }

  // utenteId null = modelo (plano reutilizável sem utente).
  function novoPlano({ nome, utenteId = null, frequencia = 3, notas = "" }, agora) {
    return { id: novoId("p"), utenteId, nome, frequencia, notas, itens: [], criado: agora, alterado: agora };
  }

  const itemDe = ex => ({ exId: ex.id, series: ex.series, repeticoes: ex.repeticoes, segundos: ex.segundos, nota: ex.nota || "" });
  const copiaItens = itens => itens.map(i => ({ ...i }));

  // Devolve false se o exercício já está no plano.
  function adicionaItem(plano, ex, agora) {
    if (plano.itens.some(i => i.exId === ex.id)) return false;
    plano.itens.push(itemDe(ex));
    if (agora) plano.alterado = agora;
    return true;
  }

  function moveItem(plano, indice, delta) {
    const j = indice + delta;
    if (indice < 0 || indice >= plano.itens.length || j < 0 || j >= plano.itens.length) return false;
    const [x] = plano.itens.splice(indice, 1);
    plano.itens.splice(j, 0, x);
    return true;
  }

  function removeItem(plano, exId) {
    const n = plano.itens.length;
    plano.itens = plano.itens.filter(i => i.exId !== exId);
    return n - plano.itens.length;
  }

  function planoDeModelo(modelo, utenteId, agora) {
    const n = { ...modelo, id: novoId("p"), utenteId, itens: copiaItens(modelo.itens), criado: agora, alterado: agora };
    delete n.registo; delete n.fase; delete n.anterior; delete n.estado;
    return n;
  }

  function modeloDePlano(plano, nome, agora) {
    const n = { ...plano, id: novoId("p"), utenteId: null, nome, itens: copiaItens(plano.itens), criado: agora, alterado: agora };
    delete n.registo; delete n.fase; delete n.anterior; delete n.estado;
    return n;
  }

  function duplicaPlano(plano, agora) {
    const n = { ...plano, id: novoId("p"), nome: (plano.nome + " (cópia)").slice(0, 80), itens: copiaItens(plano.itens), criado: agora, alterado: agora };
    delete n.registo; delete n.fase; delete n.anterior; delete n.estado;
    return n;
  }

  /* ---------- evolução por fases ---------- */
  // «Semana 1» → «Semana 2»; sem número no fim → «Nome (fase 2)».
  function proximoNome(nome, fase) {
    const n = String(nome).trim();
    const m = /^(.*[^0-9])([0-9]+)$/.exec(n);
    return (m ? m[1] + (Number(m[2]) + 1) : n + " (fase " + fase + ")").slice(0, 80);
  }

  // Cria a fase seguinte (mesmos exercícios e doses, sem registo) e marca a atual como concluída.
  function proximaFase(plano, agora) {
    const fase = (plano.fase || 1) + 1;
    const n = { ...plano, id: novoId("p"), nome: proximoNome(plano.nome, fase), fase, anterior: plano.id,
                itens: copiaItens(plano.itens), criado: agora, alterado: agora };
    delete n.registo; delete n.estado;
    plano.estado = "concluido"; plano.alterado = agora;
    return n;
  }

  // Números de um plano a partir do registo do utente.
  function resumoPlano(plano) {
    let completos = 0, parciais = 0, dorForte = 0, ultima = null, dorUltima = null;
    const reg = Object.entries(plano.registo || {});
    for (const [d, r] of reg) {
      if (r.feitos === r.total) completos++; else if (r.feitos > 0) parciais++;
      if (r.dor === 2) dorForte++;
      if (ultima === null || d > ultima) { ultima = d; dorUltima = r.dor; }
    }
    return { dias: reg.length, completos, parciais, dorForte, ultima, dorUltima };
  }

  // Os últimos `dias` dias (do mais antigo ao de hoje), juntando o registo de todos os planos do utente.
  function linhaDoTempo(planos, hoje, dias) {
    const fim = Date.parse(hoje + "T00:00:00Z"), out = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(fim - i * 86400000).toISOString().slice(0, 10);
      let estado = "nenhum", dor = null;
      for (const p of planos) {
        const r = (p.registo || {})[d];
        if (!r) continue;
        if (r.feitos === r.total) estado = "completo"; else if (r.feitos > 0 && estado === "nenhum") estado = "parcial";
        if (r.dor !== null && (dor === null || r.dor > dor)) dor = r.dor;
      }
      out.push({ dia: d, estado, dor });
    }
    return out;
  }

  // Ativos primeiro (fase mais recente no topo), concluídos depois.
  const ordemPlanos = (a, b) => ((a.estado === "concluido") - (b.estado === "concluido")) || ((b.fase || 1) - (a.fase || 1)) || (a.criado < b.criado ? 1 : -1);

  const planosComExercicio = (planos, exId) => planos.filter(p => p.itens.some(i => i.exId === exId)).length;

  // Ao apagar um exercício da biblioteca, retira-o de todos os planos. Devolve quantos planos mexeu.
  function removeExercicioDosPlanos(planos, exId) {
    let n = 0;
    for (const p of planos) if (removeItem(p, exId)) n++;
    return n;
  }

  // Itens com o exercício correspondente (ou null se já não existir na biblioteca).
  function itensComExercicio(plano, exercicios) {
    const m = new Map(exercicios.map(e => [e.id, e]));
    return plano.itens.map(item => ({ item, ex: m.get(item.exId) || null }));
  }

  /* ---------- partilha: texto, ficheiro do plano e cópia de segurança ---------- */
  const MAX = { exercicios: 500, utentes: 2000, planos: 5000, itens: 100 };
  const ehTexto = (v, max) => typeof v === "string" && v.length <= max;
  const ehObjeto = v => v !== null && typeof v === "object" && !Array.isArray(v);

  // Nome de ficheiro seguro (só a-z, 0-9 e hífen).
  function slug(s, padrao) {
    const r = norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    return r || padrao || "ficheiro";
  }

  // Texto simples do plano, para WhatsApp, SMS ou email.
  function planoParaTexto(plano, utenteNome, exercicios, def) {
    def = def || {};
    const L = [`PLANO DE EXERCÍCIOS: ${plano.nome}`];
    if (utenteNome) L.push(`Para: ${utenteNome}`);
    if (def.profissional) L.push(`Fisioterapeuta: ${def.profissional}`);
    L.push(`Frequência: ${plano.frequencia}× por semana`);
    if (plano.notas) L.push("", plano.notas);
    let n = 0;
    for (const { item, ex } of itensComExercicio(plano, exercicios)) {
      if (!ex) continue;
      n++;
      L.push("", `${n}. ${ex.nome} — ${doseTexto(item)}`);
      if (ex.material) L.push(`   Material: ${ex.material}`);
      if (ex.descricao) L.push(`   Como fazer: ${ex.descricao}`);
      if (ex.cuidados) L.push(`   Cuidados: ${ex.cuidados}`);
    }
    if (def.aviso) L.push("", def.aviso);
    return L.join("\n");
  }

  // Ficheiro do plano: leva os exercícios usados, para abrir noutro aparelho.
  function exportaPlano(plano, exercicios, agora) {
    const usados = new Set(plano.itens.map(i => i.exId));
    return {
      formato: "planofisio-plano", versao: 1, exportadoEm: agora,
      plano: { nome: plano.nome, frequencia: plano.frequencia, notas: plano.notas, itens: copiaItens(plano.itens) },
      exercicios: exercicios.filter(e => usados.has(e.id)),
    };
  }

  const idSeguro = v => typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v);

  // Valida um exercício vindo de fora e devolve só os campos conhecidos.
  function exercicioLimpo(e, regioes, objetivos, figuras) {
    if (!ehObjeto(e) || !idSeguro(e.id)) return null;
    for (const c of ["nome", "material", "descricao", "cuidados", "nota"]) if (e[c] != null && typeof e[c] !== "string") return null;
    const r = valida(e, regioes, objetivos);
    if (!r.ok) return null;
    return { id: e.id, ...r.valor, figura: figuras.includes(e.figura) ? e.figura : null,
             origem: e.origem === "base" ? "base" : "meu",
             criado: ehTexto(e.criado, 40) ? e.criado : "", alterado: ehTexto(e.alterado, 40) ? e.alterado : "" };
  }

  function itemLimpo(i) {
    if (!ehObjeto(i) || !idSeguro(i.exId)) return null;
    const r = validaDose(i);
    return r.ok ? { exId: i.exId, ...r.valor } : null;
  }

  const mesmoConteudo = (a, b) => ["nome", "regiao", "objetivo", "material", "descricao", "cuidados"].every(c => (a[c] || "") === (b[c] || ""));

  // Lê um ficheiro de plano. Não altera o estado: devolve {ok, plano, novos, reutilizados} ou {ok:false, erro}.
  // O plano entra como modelo (utenteId null). Exercícios com o mesmo id mas conteúdo diferente ganham id novo.
  function importaPlano(estado, dados, regioes, objetivos, figuras, agora) {
    const falha = erro => ({ ok: false, erro });
    if (!ehObjeto(dados) || dados.formato !== "planofisio-plano") return falha("Este ficheiro não é um plano do PlanoFisio.");
    if (dados.versao !== 1) return falha("Este ficheiro é de uma versão que esta app não conhece.");
    if (!Array.isArray(dados.exercicios) || dados.exercicios.length > MAX.exercicios) return falha("Lista de exercícios inválida.");
    const p = dados.plano;
    if (!ehObjeto(p) || !Array.isArray(p.itens) || p.itens.length > MAX.itens) return falha("Plano inválido.");
    const vp = validaPlano(p);
    if (!vp.ok) return falha("Plano inválido: " + Object.values(vp.erros)[0]);

    const mapa = new Map(), novos = [];
    let reutilizados = 0;
    for (const e of dados.exercicios) {
      const l = exercicioLimpo(e, regioes, objetivos, figuras);
      if (!l) return falha("Há um exercício inválido no ficheiro.");
      const local = estado.exercicios.find(x => x.id === l.id);
      if (!local) { novos.push(l); mapa.set(l.id, l.id); }
      else if (mesmoConteudo(local, l)) { mapa.set(l.id, l.id); reutilizados++; }
      else { const c = { ...l, id: novoId(), origem: "meu", criado: agora, alterado: agora }; novos.push(c); mapa.set(l.id, c.id); }
    }
    const itens = [];
    for (const i of p.itens) {
      const l = itemLimpo(i);
      if (!l) return falha("Há uma dose inválida no ficheiro.");
      const existe = mapa.has(l.exId) || estado.exercicios.some(x => x.id === l.exId);
      if (!existe) return falha("O plano usa um exercício que não vem no ficheiro.");
      const exId = mapa.has(l.exId) ? mapa.get(l.exId) : l.exId;
      if (!itens.some(x => x.exId === exId)) itens.push({ ...l, exId });
    }
    const plano = novoPlano({ ...vp.valor, utenteId: null }, agora);
    plano.itens = itens;
    return { ok: true, plano, novos, reutilizados };
  }

  // A cópia não leva o PIN nem o contador de tentativas: o PIN é deste aparelho.
  function exportaCopia(estado, agora) {
    const { pin, pinTentativas, pinSegundos, ...dados } = estado;
    return { formato: "planofisio-copia", versao: 2, exportadoEm: agora, dados };
  }

  // Valida uma cópia de segurança. Devolve {ok, estado} com tudo limpo, ou {ok:false, erro}.
  function validaCopia(c, regioes, objetivos, figuras) {
    const falha = erro => ({ ok: false, erro });
    if (!ehObjeto(c) || c.formato !== "planofisio-copia") return falha("Este ficheiro não é uma cópia de segurança do PlanoFisio.");
    if (c.versao !== 2 || !ehObjeto(c.dados)) return falha("Esta cópia é de uma versão que a app não conhece.");
    const d = c.dados;
    if (!Array.isArray(d.exercicios) || !Array.isArray(d.utentes) || !Array.isArray(d.planos)) return falha("A cópia está incompleta.");
    if (d.exercicios.length > MAX.exercicios || d.utentes.length > MAX.utentes || d.planos.length > MAX.planos) return falha("A cópia é grande demais.");

    const exercicios = [];
    for (const e of d.exercicios) {
      const l = exercicioLimpo(e, regioes, objetivos, figuras);
      if (!l) return falha("A cópia tem um exercício inválido.");
      exercicios.push(l);
    }
    const utentes = [];
    for (const u of d.utentes) {
      if (!ehObjeto(u) || !idSeguro(u.id)) return falha("A cópia tem um utente inválido.");
      const r = validaUtente(u);
      if (!r.ok) return falha("A cópia tem um utente inválido.");
      utentes.push({ id: u.id, ...r.valor, arquivado: u.arquivado === true,
                     ...(ehObjeto(u.consentimento) && diaValido(u.consentimento.data) ? { consentimento: { data: u.consentimento.data } } : {}),
                     criado: ehTexto(u.criado, 40) ? u.criado : "", alterado: ehTexto(u.alterado, 40) ? u.alterado : "" });
    }
    const ids = new Set(utentes.map(u => u.id));
    const planos = [];
    for (const p of d.planos) {
      if (!ehObjeto(p) || !idSeguro(p.id) || !Array.isArray(p.itens) || p.itens.length > MAX.itens) return falha("A cópia tem um plano inválido.");
      const r = validaPlano(p);
      if (!r.ok) return falha("A cópia tem um plano inválido.");
      if (p.utenteId !== null && !ids.has(p.utenteId)) return falha("A cópia tem um plano de um utente que não existe.");
      const itens = [];
      for (const i of p.itens) { const l = itemLimpo(i); if (!l) return falha("A cópia tem uma dose inválida."); itens.push(l); }
      const registo = {};
      if (p.registo !== undefined) {
        if (!ehObjeto(p.registo) || Object.keys(p.registo).length > 400) return falha("A cópia tem um registo inválido.");
        for (const [dia, x] of Object.entries(p.registo)) {
          if (!diaValido(dia) || !ehObjeto(x) || !Number.isInteger(x.feitos) || !Number.isInteger(x.total) || x.total < 1 || x.total > 100 || x.feitos < 0 || x.feitos > x.total || !dorValida(x.dor)) return falha("A cópia tem um registo inválido.");
          registo[dia] = { feitos: x.feitos, total: x.total, dor: x.dor };
        }
      }
      planos.push({ id: p.id, utenteId: p.utenteId, ...r.valor, itens, registo,
                    ...(Number.isInteger(p.fase) && p.fase >= 1 && p.fase <= 99 ? { fase: p.fase } : {}),
                    ...(idSeguro(p.anterior) ? { anterior: p.anterior } : {}),
                    ...(p.estado === "concluido" ? { estado: "concluido" } : {}),
                    criado: ehTexto(p.criado, 40) ? p.criado : "", alterado: ehTexto(p.alterado, 40) ? p.alterado : "" });
    }
    const def = ehObjeto(d.definicoes) ? d.definicoes : {};
    const definicoes = { profissional: ehTexto(def.profissional, 80) ? def.profissional : "", aviso: ehTexto(def.aviso, 300) ? def.aviso : "",
                         urlUtente: ehTexto(def.urlUtente, 200) && /^https:\/\/[^\s#?]{3,200}$/.test(def.urlUtente) ? def.urlUtente : "",
                         validadeDias: [0, 30, 90, 180].includes(def.validadeDias) ? def.validadeDias : 90,
                         contacto: typeof def.contacto === "string" && /^[0-9]{9,15}$/.test(def.contacto) ? def.contacto : "" };
    return { ok: true, estado: { versao: 2, exercicios, utentes, planos, avisoVisto: d.avisoVisto === true, definicoes } };
  }

  function validaDefinicoes(f) {
    const erros = {};
    textoMax(f, erros, "profissional", 80, "O nome pode ter no máximo 80 caracteres.");
    textoMax(f, erros, "aviso", 300, "O aviso pode ter no máximo 300 caracteres.");
    const url = t(f, "urlUtente");
    if (url && !/^https:\/\/[^\s#?]{3,200}$/.test(url)) erros.urlUtente = "Escreva um endereço que comece por https:// (sem espaços).";
    const ct = t(f, "contacto").split(" ").join("").split("+").join("");
    if (ct && !/^[0-9]{9,15}$/.test(ct)) erros.contacto = "Escreva o número com indicativo do país, por exemplo 351912345678.";
    const vd = f.validadeDias === undefined || f.validadeDias === "" ? 90 : Number(f.validadeDias);
    if (![0, 30, 90, 180].includes(vd)) erros.validadeDias = "Escolha uma das validades da lista.";
    return fim(erros, { profissional: t(f, "profissional"), aviso: t(f, "aviso"), urlUtente: url, validadeDias: vd, contacto: ct });
  }

  /* ---------- link para o utente ---------- */
  // O plano vai codificado no próprio link (depois do #, que nunca chega ao servidor). Os exercícios
  // iniciais não viajam: a página do utente já os tem. Só vão por inteiro os que foram alterados ou criados.
  const MAX_LINK = 12000;

  const b64url = {
    codifica: txt => {
      let s = ""; for (const b of new TextEncoder().encode(txt)) s += String.fromCharCode(b);
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    descodifica: p => {
      const s = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
      return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(s, c => c.charCodeAt(0)));
    },
  };

  const primeiroNome = n => String(n || "").trim().split(/\s+/)[0] || "";

  function linkPlano(plano, utenteNome, exercicios, sementes, def, agora) {
    def = def || {};
    const porId = new Map(exercicios.map(e => [e.id, e]));
    const sem = new Map(sementes.map(x => [x.id, daSemente(x, "")]));
    const i = [], x = [];
    for (const it of plano.itens) {
      const e = porId.get(it.exId);
      if (!e) continue;
      i.push([e.id, it.series, it.repeticoes == null ? 0 : it.repeticoes, it.segundos == null ? 0 : it.segundos, it.nota || ""]);
      const s = sem.get(e.id);
      if (!(s && mesmoConteudo(e, s) && e.figura === s.figura) && !x.some(y => y.id === e.id)) {
        x.push({ id: e.id, nome: e.nome, regiao: e.regiao, objetivo: e.objetivo, material: e.material || "",
                 descricao: e.descricao || "", cuidados: e.cuidados || "", figura: e.figura || null });
      }
    }
    const o = { v: 1, n: plano.nome, f: plano.frequencia, i };
    if (plano.id) o.k = plano.id;
    if (def.contacto) o.c = def.contacto;
    if (plano.notas) o.o = plano.notas;
    const u = primeiroNome(utenteNome); if (u) o.u = u;
    if (def.profissional) o.p = def.profissional;
    if (def.aviso) o.a = def.aviso;
    if (x.length) o.x = x;
    // Validade (em dias desde 1970, UTC): depois dela a página recusa o link. 0 / ausente = sem limite.
    if (def.validadeDias > 0) o.e = Math.floor(Date.parse(agora || new Date().toISOString()) / 86400000) + def.validadeDias;
    return b64url.codifica(JSON.stringify(o));
  }

  // Lê o que vem depois de «#p=». Devolve {ok, plano, exercicios, paraNome, profissional, aviso} ou {ok:false, erro}.
  function planoDeLink(payload, regioes, objetivos, figuras, sementes, agora) {
    const falha = erro => ({ ok: false, erro });
    if (typeof payload !== "string" || !payload || payload.length > MAX_LINK || !/^[A-Za-z0-9_-]+$/.test(payload)) return falha("Este link não está completo ou foi alterado.");
    let o;
    try { o = JSON.parse(b64url.descodifica(payload)); } catch (e) { return falha("Este link não está completo ou foi alterado."); }
    if (!ehObjeto(o) || o.v !== 1 || !Array.isArray(o.i) || o.i.length > MAX.itens) return falha("Este link é de uma versão que não conheço.");
    if (o.x !== undefined && (!Array.isArray(o.x) || o.x.length > MAX.exercicios)) return falha("Este link não está completo ou foi alterado.");
    if (o.e !== undefined) {
      if (!Number.isInteger(o.e)) return falha("Este link não está completo ou foi alterado.");
      if (Math.floor(Date.parse(agora) / 86400000) > o.e) return { ok: false, expirado: true, erro: "Este plano já não está disponível." };
    }
    if (o.k !== undefined && !idSeguro(o.k)) return falha("Este link não está completo ou foi alterado.");
    if (o.c !== undefined && !(typeof o.c === "string" && /^[0-9]{9,15}$/.test(o.c))) return falha("Este link não está completo ou foi alterado.");
    for (const [c, max] of [["u", 80], ["p", 80], ["a", 300]]) if (o[c] !== undefined && !ehTexto(o[c], max)) return falha("Este link não está completo ou foi alterado.");

    const itens = [], exercicios = [], vistos = new Set();
    // A dose verdadeira vem nos itens; o exercício leva uma cópia dela só para passar a validação.
    const doseDe = id => { const it = o.i.find(v => Array.isArray(v) && v[0] === id); return it ? { series: it[1], repeticoes: it[2] || null, segundos: it[3] || null, nota: it[4] } : {}; };
    for (const x of (o.x || [])) { exercicios.push(ehObjeto(x) ? { ...x, ...doseDe(x.id) } : x); vistos.add(x && x.id); }
    const sem = new Map(sementes.map(s => [s.id, daSemente(s, agora)]));
    for (const it of o.i) {
      if (!Array.isArray(it) || it.length !== 5) return falha("Este link não está completo ou foi alterado.");
      const [exId, series, reps, seg, nota] = it;
      if (!vistos.has(exId) && sem.has(exId)) { exercicios.push(sem.get(exId)); vistos.add(exId); }
      itens.push({ exId, series, repeticoes: reps || null, segundos: seg || null, nota });
    }
    const r = importaPlano({ exercicios: [] }, { formato: "planofisio-plano", versao: 1,
      plano: { nome: o.n, frequencia: o.f, notas: o.o || "", itens }, exercicios }, regioes, objetivos, figuras, agora);
    if (!r.ok) return falha("Este link não está completo ou foi alterado.");
    return { ok: true, plano: r.plano, exercicios: r.novos, paraNome: o.u || "", profissional: o.p || "", aviso: o.a || "", k: o.k || "", contacto: o.c || "", expiraEm: Number.isInteger(o.e) ? o.e : null };
  }

  /* ---------- resposta do utente (resumo enviado por mensagem) ---------- */
  // O utente envia uma mensagem normal (WhatsApp) com um resumo legível e uma linha «Código» que a app da
  // fisioterapeuta sabe ler. Tudo o que vem de fora é validado como não confiável.
  const DIA_MS = 86400000;
  const NL = String.fromCharCode(10);
  const ROTULO_DOR = ["sem dor", "um pouco de dor", "dor forte"];
  const diaValido = d => typeof d === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d) && !Number.isNaN(Date.parse(d + "T00:00:00Z"));
  const dorValida = d => d === null || d === 0 || d === 1 || d === 2;
  const dataCurta = d => d.slice(8, 10) + "/" + d.slice(5, 7);

  // pro = {dias:{AAAA-MM-DD:[ids feitos]}, dor:{AAAA-MM-DD:0|1|2}}; devolve os últimos 60 dias com registo.
  function resumoDoUtente(planoId, pro, ids, hoje) {
    const limite = Date.parse(hoje + "T00:00:00Z") - 60 * DIA_MS, out = [];
    const dias = (pro && pro.dias) || {};
    for (const d of new Set([...Object.keys(dias), ...Object.keys((pro && pro.dor) || {})])) {
      if (!diaValido(d) || Date.parse(d + "T00:00:00Z") < limite) continue;
      const feitos = new Set((Array.isArray(dias[d]) ? dias[d] : []).filter(id => ids.includes(id))).size;
      const dor = pro.dor && pro.dor[d] !== undefined && dorValida(pro.dor[d]) ? pro.dor[d] : null;
      if (feitos > 0 || dor !== null) out.push([d, feitos, ids.length, dor]);
    }
    out.sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return { v: 1, k: planoId, d: out.slice(0, 60) };
  }

  function mensagemResumo({ nomePlano, paraNome, resumo }) {
    const L = [paraNome ? "Olá! Resumo de " + paraNome + " do plano «" + nomePlano + "»:" : "Olá! Resumo do plano «" + nomePlano + "»:"];
    for (const [d, f, t, dor] of resumo.d.slice(0, 7)) L.push("• " + dataCurta(d) + ": " + f + " de " + t + " exercícios" + (dor === null ? "" : ", " + ROTULO_DOR[dor]));
    L.push("", "Código (não apague): PF1." + b64url.codifica(JSON.stringify(resumo)));
    return L.join(NL);
  }

  // Procura o código numa mensagem colada. Devolve {ok, k, d} ou {ok:false, erro}.
  function lerResposta(texto) {
    const falha = erro => ({ ok: false, erro });
    const m = /PF1[.]([A-Za-z0-9_-]{8,12000})/.exec(String(texto || ""));
    if (!m) return falha("Não encontrei o código do resumo. Cole a mensagem inteira, com a linha «Código».");
    let o;
    try { o = JSON.parse(b64url.descodifica(m[1])); } catch (e) { return falha("O código do resumo está incompleto. Peça ao utente para enviar de novo."); }
    if (!ehObjeto(o) || o.v !== 1 || !idSeguro(o.k) || !Array.isArray(o.d) || o.d.length > 60) return falha("Este resumo não é válido.");
    const d = [];
    for (const x of o.d) {
      if (!Array.isArray(x) || x.length !== 4) return falha("Este resumo não é válido.");
      const [dia, f, t, dor] = x;
      if (!diaValido(dia) || !Number.isInteger(f) || !Number.isInteger(t) || f < 0 || t < 1 || t > 100 || f > t || !dorValida(dor)) return falha("Este resumo não é válido.");
      d.push([dia, f, t, dor]);
    }
    return { ok: true, k: o.k, d };
  }

  // Junta o resumo ao registo do plano (o que o utente enviou por último prevalece). Devolve quantos dias mudaram.
  function aplicaResposta(plano, resposta) {
    plano.registo = plano.registo || {};
    let n = 0;
    for (const [dia, f, t, dor] of resposta.d) {
      const a = plano.registo[dia];
      if (!a || a.feitos !== f || a.total !== t || a.dor !== dor) { plano.registo[dia] = { feitos: f, total: t, dor }; n++; }
    }
    return n;
  }

  // Dias completos e parciais nos últimos `dias` dias (contando hoje).
  function adesao(plano, hoje, dias) {
    const fim = Date.parse(hoje + "T00:00:00Z"), ini = fim - (dias - 1) * DIA_MS;
    let completos = 0, parciais = 0;
    for (const [d, r] of Object.entries(plano.registo || {})) {
      const t = Date.parse(d + "T00:00:00Z");
      if (Number.isNaN(t) || t < ini || t > fim) continue;
      if (r.feitos === r.total) completos++; else if (r.feitos > 0) parciais++;
    }
    return { completos, parciais };
  }

  const registoOrdenado = plano => Object.entries(plano.registo || {}).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  /* ---------- lembretes (ficheiro de calendário .ics) ---------- */
  // Gera um evento semanal repetido nos dias do plano. Hora «flutuante» (a do calendário do utente), sem fusos.
  const CRLF = String.fromCharCode(13, 10);
  const BARRA = String.fromCharCode(92);
  const DIAS_POR_FREQ = { 1: ["WE"], 2: ["TU", "FR"], 3: ["MO", "WE", "FR"], 4: ["MO", "TU", "TH", "FR"],
                          5: ["MO", "TU", "WE", "TH", "FR"], 6: ["MO", "TU", "WE", "TH", "FR", "SA"], 7: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] };
  const SEMANA_UTC = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];   // Date.getUTCDay()

  // N vezes por semana → dias da semana o mais espaçados possível. null se N for inválido.
  const diasDaSemana = freq => (Number.isInteger(freq) && DIAS_POR_FREQ[freq] ? DIAS_POR_FREQ[freq].slice() : null);

  // Texto de uma propriedade iCalendar (RFC 5545): escapa barra, ponto e vírgula, vírgula e quebras de linha.
  const escIcs = s => String(s == null ? "" : s).split(BARRA).join(BARRA + BARRA).split(";").join(BARRA + ";").split(",").join(BARRA + ",")
    .split(String.fromCharCode(13)).join("").split(String.fromCharCode(10)).join(BARRA + "n");

  // Linhas com mais de 75 octetos são dobradas (CRLF + espaço), sem partir carateres de vários bytes.
  function dobraIcs(linha) {
    const enc = new TextEncoder();
    let out = "", n = 0;
    for (const c of linha) {
      const b = enc.encode(c).length;
      if (n + b > 75) { out += CRLF + " "; n = 1; }
      out += c; n += b;
    }
    return out;
  }

  const dd = n => String(n).padStart(2, "0");
  const dataHoraIcs = d => d.getUTCFullYear() + dd(d.getUTCMonth() + 1) + dd(d.getUTCDate()) + "T" + dd(d.getUTCHours()) + dd(d.getUTCMinutes()) + "00";

  // inicio/ate: «AAAA-MM-DD»; hm: [hora, minuto]. Devolve o texto do .ics ou null se os dados não servirem.
  function criaIcs({ nome, freq, hm, inicio, ate, url, uid, agoraISO }) {
    const dias = diasDaSemana(freq);
    if (!dias || !diaValido(inicio) || !diaValido(ate) || !Array.isArray(hm) || !Number.isInteger(hm[0]) || !Number.isInteger(hm[1])
        || hm[0] < 0 || hm[0] > 23 || hm[1] < 0 || hm[1] > 59 || !idSeguro(uid)) return null;
    let d = new Date(inicio + "T00:00:00Z"), achou = false;
    for (let i = 0; i < 7; i++) {
      if (dias.includes(SEMANA_UTC[d.getUTCDay()])) { achou = true; break; }
      d = new Date(d.getTime() + DIA_MS);
    }
    if (!achou) return null;
    const ini = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hm[0], hm[1]));
    const fim = new Date(ini.getTime() + 30 * 60000);
    const limite = new Date(ate + "T00:00:00Z");
    if (limite.getTime() < new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth(), ini.getUTCDate())).getTime()) return null;
    const ag = new Date(agoraISO || new Date().toISOString());
    const stamp = dataHoraIcs(ag).slice(0, 13) + dd(ag.getUTCSeconds()) + "Z";
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PlanoFisio//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:" + uid + "@planofisio", "DTSTAMP:" + stamp,
      "DTSTART:" + dataHoraIcs(ini), "DTEND:" + dataHoraIcs(fim),
      "RRULE:FREQ=WEEKLY;BYDAY=" + dias.join(",") + ";UNTIL=" + limite.getUTCFullYear() + dd(limite.getUTCMonth() + 1) + dd(limite.getUTCDate()) + "T235959",
      "SUMMARY:" + escIcs("Exercícios: " + nome),
      "DESCRIPTION:" + escIcs("Abra o seu plano de exercícios:" + String.fromCharCode(10) + (url || "")),
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:" + escIcs("Exercícios: " + nome), "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"];
    return L.map(dobraIcs).join(CRLF) + CRLF;
  }

  /* ---------- sessão guiada (página do utente) ---------- */
  // Exercícios por fazer hoje; se já está tudo feito, a sessão repete o plano inteiro.
  function itensDaSessao(itens, feitos) {
    const f = feitos instanceof Set ? feitos : new Set(feitos || []);
    const pendentes = itens.filter(i => !f.has(i.exId));
    return pendentes.length ? pendentes : itens.slice();
  }

  // 20 -> "0:20", 75 -> "1:15"
  const formataSeg = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  // Posição anterior na sessão: (exercício i, série k) -> mesma lista, ou null se já está no início.
  function passoAnterior(itens, i, serie) {
    if (serie > 1) return { i, serie: serie - 1 };
    if (i > 0) return { i: i - 1, serie: itens[i - 1].series };
    return null;
  }

  /* ---------- PIN de bloqueio ---------- */
  const K256 = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];

  // SHA-256 em JavaScript puro (Uint8Array -> Uint8Array de 32 bytes), para não depender do contexto seguro do navegador.
  function sha256(bytes) {
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const n = bytes.length, total = ((n + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total);
    m.set(bytes); m[n] = 0x80;
    const bits = n * 8;
    for (let i = 0; i < 8; i++) m[total - 1 - i] = i < 4 ? (bits >>> (8 * i)) & 255 : 0;
    const w = new Array(64);
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (m[o + 4*i] << 24) | (m[o + 4*i + 1] << 16) | (m[o + 4*i + 2] << 8) | m[o + 4*i + 3];
      for (let i = 16; i < 64; i++) {
        const a = w[i-15], b = w[i-2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    const out = new Uint8Array(32);
    H.forEach((v, i) => { out[4*i] = v >>> 24; out[4*i+1] = (v >>> 16) & 255; out[4*i+2] = (v >>> 8) & 255; out[4*i+3] = v & 255; });
    return out;
  }

  const utf8 = s => { const r = []; for (const c of unescape(encodeURIComponent(s))) r.push(c.charCodeAt(0)); return Uint8Array.from(r); };
  const hex = u => Array.from(u, x => x.toString(16).padStart(2, "0")).join("");
  const RONDAS_PIN = 20000;

  // Hash do PIN: SHA-256 repetido com sal. Não é encriptação dos dados: só serve para conferir o PIN.
  function hashPin(pin, salt, rondas) {
    let h = sha256(utf8(salt + ":" + pin));
    const s = utf8(salt);
    for (let i = 0; i < rondas; i++) { const b = new Uint8Array(h.length + s.length); b.set(h); b.set(s, h.length); h = sha256(b); }
    return hex(h);
  }

  const pinValido = pin => typeof pin === "string" && /^[0-9]{4,8}$/.test(pin);
  const novoPin = (pin, salt) => ({ salt, rondas: RONDAS_PIN, hash: hashPin(pin, salt, RONDAS_PIN) });

  function verificaPin(pin, cfg) {
    if (!cfg || !pinValido(pin)) return false;
    const h = hashPin(pin, cfg.salt, cfg.rondas);
    let d = h.length ^ String(cfg.hash).length;
    for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ String(cfg.hash).charCodeAt(i);
    return d === 0;
  }

  // Segundos de espera depois de `falhas` tentativas erradas seguidas: 0 até 4; depois 30, 60, 120… até 15 min.
  function esperaPin(falhas) {
    return falhas < 5 ? 0 : Math.min(900, 30 * Math.pow(2, falhas - 5));
  }

  /* ---------- armazenamento ---------- */
  // Devolve o estado na versão atual (2) ou null se o objeto não for um estado válido.
  function migra(lido) {
    if (!lido || !Array.isArray(lido.exercicios)) return null;
    if (lido.versao === 1) return { ...lido, versao: 2, utentes: [], planos: [] };
    if (lido.versao === 2 && Array.isArray(lido.utentes) && Array.isArray(lido.planos)) return lido;
    return null;
  }

  return { norm, novoId, inteiro, valida, filtra, doseTexto, daSemente, repoeSementes, duplica, exportaUtente, registaConsentimento, proximoNome, proximaFase, resumoPlano, linhaDoTempo, ordemPlanos,
           validaUtente, filtraUtentes, apagaUtente,
           validaPlano, validaDose, novoPlano, adicionaItem, moveItem, removeItem,
           planoDeModelo, modeloDePlano, duplicaPlano, planosComExercicio, removeExercicioDosPlanos,
           itensComExercicio, migra,
           b64url, primeiroNome, linkPlano, planoDeLink, itensDaSessao, formataSeg, passoAnterior,
           resumoDoUtente, mensagemResumo, lerResposta, aplicaResposta, adesao, registoOrdenado, ROTULO_DOR, dataCurta,
           diasDaSemana, criaIcs, escIcs, dobraIcs,
           sha256, hashPin, pinValido, novoPin, verificaPin, esperaPin,
           slug, planoParaTexto, exportaPlano, importaPlano, exportaCopia, validaCopia, validaDefinicoes };
})();

if (typeof module !== "undefined") module.exports = Logica;
