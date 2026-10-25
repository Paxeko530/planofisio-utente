/* Listas fixas e exercícios iniciais da biblioteca.
   Os iniciais vêm da app Continuar em Movimento v1.3, com a linguagem neutralizada em género.
   São rascunhos: o conteúdo clínico deve ser revisto pelo fisioterapeuta antes de uso com utentes. */

const REGIOES   = ["Membro superior", "Tronco", "Anca", "Membro inferior", "Corpo todo"];
const OBJETIVOS = ["Força", "Alongamento", "Equilíbrio", "Mobilidade", "Resistência"];

const SEMENTE = [
  {id:"sentar", nome:"Levantar e sentar", regiao:"Membro inferior", objetivo:"Força", material:"Cadeira da cozinha, sem braços",
   descricao:"Sente-se na beira da cadeira, pés afastados. Levante-se devagar e sente-se em 3 segundos, controlando a descida.",
   series:2, repeticoes:10, segundos:null, nota:""},
  {id:"calcanhares", nome:"Pontas dos pés", regiao:"Membro inferior", objetivo:"Força", material:"Bancada, para apoio",
   descricao:"De pé, mãos na bancada. Suba nas pontas dos pés e desça devagar, sem deixar cair o calcanhar de repente.",
   series:2, repeticoes:12, segundos:null, nota:""},
  {id:"degrau", nome:"Subir o degrau", regiao:"Membro inferior", objetivo:"Força", material:"Escada de casa, com corrimão",
   descricao:"De frente para o degrau, com o corrimão à mão. Suba com uma perna, depois a outra, e desça pela mesma ordem.",
   series:2, repeticoes:8, segundos:null, nota:"por perna"},
  {id:"anca", nome:"Abrir a perna para o lado", regiao:"Anca", objetivo:"Força", material:"Bancada; depois meia com 1 kg de arroz",
   descricao:"De pé, com apoio na bancada, afaste a perna para o lado sem inclinar o tronco. Volte devagar, sem deixar cair.",
   series:2, repeticoes:10, segundos:null, nota:"por perna"},
  {id:"ponte", nome:"Ponte", regiao:"Anca", objetivo:"Força", material:"Cama ou tapete",
   descricao:"Deitado de costas, joelhos dobrados e pés apoiados. Levante a bacia até alinhar com o tronco e desça devagar.",
   series:2, repeticoes:10, segundos:null, nota:""},
  {id:"parede", nome:"Flexão na parede", regiao:"Membro superior", objetivo:"Força", material:"Parede lisa",
   descricao:"Mãos na parede à altura dos ombros, corpo direito e afastado. Dobre os cotovelos e empurre para voltar.",
   series:2, repeticoes:10, segundos:null, nota:""},
  {id:"saco", nome:"Puxar o saco das compras", regiao:"Membro superior", objetivo:"Força", material:"Saco com 2 garrafas",
   descricao:"Tronco inclinado à frente com as costas direitas, saco na mão. Puxe o cotovelo para trás, juntando as omoplatas.",
   series:2, repeticoes:12, segundos:null, nota:""},
  {id:"bracos", nome:"Levantar os braços", regiao:"Membro superior", objetivo:"Força", material:"Uma garrafa ou lata em cada mão",
   descricao:"Sentado ou de pé, uma garrafa em cada mão. Levante os braços à frente até à altura dos ombros e desça devagar.",
   series:2, repeticoes:10, segundos:null, nota:""},
  {id:"gemeos", nome:"Gémeos", regiao:"Membro inferior", objetivo:"Alongamento", material:"Parede",
   descricao:"Mãos na parede, uma perna atrás esticada com o calcanhar bem assente. Empurre a anca à frente até sentir o estiramento.",
   series:2, repeticoes:null, segundos:20, nota:"por perna"},
  {id:"coxa-tras", nome:"Parte de trás da coxa", regiao:"Membro inferior", objetivo:"Alongamento", material:"Banco e toalha de banho",
   descricao:"Perna em cima de um banco, toalha à volta do pé. Incline o tronco a partir da anca, com as costas direitas.",
   series:2, repeticoes:null, segundos:20, nota:"por perna"},
  {id:"peito", nome:"Peito e ombros", regiao:"Membro superior", objetivo:"Alongamento", material:"Vão da porta",
   descricao:"Antebraços apoiados nos batentes da porta, à altura dos ombros. Dê um passo à frente até sentir o peito a abrir.",
   series:2, repeticoes:null, segundos:20, nota:""},
  {id:"coxa-frente", nome:"Frente da coxa", regiao:"Membro inferior", objetivo:"Alongamento", material:"Cadeira, para apoio",
   descricao:"De pé, com apoio na cadeira, leve o calcanhar em direção à nádega e segure o pé. Mantenha os joelhos juntos.",
   series:2, repeticoes:null, segundos:20, nota:"por perna"},
  {id:"tronco", nome:"Rodar o tronco", regiao:"Tronco", objetivo:"Mobilidade", material:"Cadeira",
   descricao:"Sente-se com os pés no chão. Rode devagar o tronco para um lado e apoie a mão nas costas da cadeira. Depois o outro lado.",
   series:2, repeticoes:null, segundos:20, nota:"para cada lado"},
  {id:"unipodal", nome:"Apoio num pé", regiao:"Corpo todo", objetivo:"Equilíbrio", material:"Bancada, de frente",
   descricao:"Levante um pé do chão e mantenha. Olhe para um ponto fixo à frente. Depois troque de pé.",
   series:3, repeticoes:null, segundos:15, nota:"com as duas mãos na bancada"},
  {id:"tandem", nome:"Calcanhar-ponta", regiao:"Corpo todo", objetivo:"Equilíbrio", material:"Corredor, junto à parede",
   descricao:"Ande em linha reta encostando o calcanhar de um pé à ponta do outro, junto à parede.",
   series:1, repeticoes:10, segundos:null, nota:"passos, com apoio"},
  {id:"peso", nome:"Passar o peso", regiao:"Corpo todo", objetivo:"Equilíbrio", material:"Bancada ao lado",
   descricao:"Pés afastados à largura da anca. Passe o peso de uma perna para a outra, devagar, sem levantar os pés do chão.",
   series:3, repeticoes:10, segundos:null, nota:""},
];

// Texto por omissão no fim da folha do plano (vem da app Continuar em Movimento). Editável em Dados.
// Página do utente (repositório público Paxeko530/planofisio-utente, publicada com tools/publica-web.js).
const URL_UTENTE_PADRAO = "https://paxeko530.github.io/planofisio-utente/";

const AVISO_PADRAO = "Em caso de dor no peito, tonturas ou falta de ar, pare e contacte o seu fisioterapeuta.";
