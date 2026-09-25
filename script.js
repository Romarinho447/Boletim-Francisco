/* =========================================================
   BOLETIM DIGITAL — script.js
   Responsável por: normalizar notas, calcular médias,
   somar faltas, definir situação, preencher cards e tabela.
   ========================================================= */

/* ---------------------------------------------------------
   DADOS BRUTOS (FICTÍCIOS) — 8º ANO
   Cada item é um OBJETO com: disciplina, notas dos 3 trimestres
   e um ARRAY de faltas por trimestre.
   --------------------------------------------------------- */
const dados = [
  { disciplina: "Língua Portuguesa",        tri1: 82,   tri2: "7,8", tri3: 85,   faltas: [2, 1, 1] },
  { disciplina: "Matemática",               tri1: 52,   tri2: "5,8", tri3: null, faltas: [3, 2, 1] },
  { disciplina: "Ciências",                 tri1: "8,1", tri2: 76,   tri3: 8.0,  faltas: [1, 2, 0] },
  { disciplina: "História",                 tri1: 7.0,  tri2: 84,   tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Geografia",                tri1: 68,   tri2: 7.3,  tri3: "7,9", faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa",           tri1: 86,   tri2: "8,1", tri3: 8.7,  faltas: [1, 0, 0] },
  { disciplina: "Arte",                     tri1: 9.0,  tri2: 92,   tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Educação Física",          tri1: 95,   tri2: 9.0,  tri3: "9,4", faltas: [0, 1, 0] },
  { disciplina: "Educação Digital",         tri1: 88,   tri2: 9.1,  tri3: 93,   faltas: [1, 0, 1] },
  { disciplina: "Educação Financeira",      tri1: 74,   tri2: "7,8", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Estudo Orientado",         tri1: 8.0,  tri2: 83,   tri3: "8,5", faltas: [0, 1, 0] },
  { disciplina: "Redação e Leitura",        tri1: 62,   tri2: "6,8", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico",        tri1: 48,   tri2: 5.6,  tri3: "6,0", faltas: [2, 2, 1] },
  { disciplina: "Literatura Arte e Movimento", tri1: "7,7", tri2: 80, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Práticas Experimentais",   tri1: 58,   tri2: "6,2", tri3: 6.4,  faltas: [1, 1, 1] }
];

/* Média mínima de referência */
const MEDIA_MINIMA = 6.0;

/* Frequência FICTÍCIA/DEMONSTRATIVA
   IMPORTANTE: este valor é apenas ilustrativo nesta primeira versão.
   No futuro, a frequência será tratada de outra forma (ex.: com carga horária). */
const FREQUENCIA_DEMONSTRATIVA = 92;

/* ---------------------------------------------------------
   FUNÇÃO: normalizarNota(valor)
   Converte qualquer nota bruta para a escala 0–10.
   Regras:
   - vazio, null ou undefined → null (nota não lançada)
   - 0 a 10 → mantém
   - >10 e <=100 → divide por 10
   - aceita ponto OU vírgula
   - fora das regras → null (inválida, não entra na média)
   --------------------------------------------------------- */
function normalizarNota(valor) {
  // Nota ausente
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Se for texto, troca vírgula por ponto
  let numero;
  if (typeof valor === "string") {
    numero = parseFloat(valor.replace(",", "."));
  } else {
    numero = Number(valor);
  }

  // Se não virou número, é inválida
  if (isNaN(numero)) {
    return null;
  }

  // 0 a 10 → mantém
  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  // >10 e <=100 → divide por 10
  if (numero > 10 && numero <= 100) {
    return numero / 10;
  }

  // Fora das regras → inválida
  return null;
}

/* ---------------------------------------------------------
   FUNÇÃO: calcularMedia(notas)
   Recebe um array de notas já normalizadas (com null nas ausentes).
   Calcula a média usando SOMENTE as notas válidas.
   Uma nota ausente NUNCA vira zero.
   --------------------------------------------------------- */
function calcularMedia(notas) {
  // Filtra só as notas válidas (não nulas)
  const validas = notas.filter(function (n) {
    return n !== null;
  });

  // Se não há nenhuma nota válida, retorna null
  if (validas.length === 0) {
    return null;
  }

  // Soma todas e divide pela quantidade
  const soma = validas.reduce(function (total, n) {
    return total + n;
  }, 0);

  return soma / validas.length;
}

/* ---------------------------------------------------------
   FUNÇÃO: somarFaltas(faltas)
   Recebe um array de faltas e retorna o total (número inteiro).
   --------------------------------------------------------- */
function somarFaltas(faltas) {
  return faltas.reduce(function (total, f) {
    return total + f;
  }, 0);
}

/* ---------------------------------------------------------
   FUNÇÃO: definirSituacao(media)
   Retorna a situação conforme a média:
   - sem média → "Nota ainda não disponível"
   - >= 6,0 → "Bom desempenho"
   - < 6,0  → "Atenção"
   --------------------------------------------------------- */
function definirSituacao(media) {
  if (media === null) {
    return "Nota ainda não disponível";
  }
  if (media >= MEDIA_MINIMA) {
    return "Bom desempenho";
  }
  return "Atenção";
}

/* ---------------------------------------------------------
   FUNÇÃO: formatarNota(nota)
   Mostra a nota com uma casa decimal ou "—" se for null.
   --------------------------------------------------------- */
function formatarNota(nota) {
  if (nota === null) {
    return "—";
  }
  return nota.toFixed(1).replace(".", ",");
}

/* ---------------------------------------------------------
   FUNÇÃO: processarDados()
   Percorre os dados brutos, normaliza as notas, calcula média,
   soma faltas e define situação.
   Retorna um novo array pronto para exibir.
   --------------------------------------------------------- */
function processarDados() {
  return dados.map(function (item) {
    // Normaliza as três notas
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    // Média usando apenas as notas disponíveis
    const media = calcularMedia([n1, n2, n3]);

    // Total de faltas
    const totalFaltas = somarFaltas(item.faltas);

    // Situação
    const situacao = definirSituacao(media);

    return {
      disciplina: item.disciplina,
      n1: n1,
      n2: n2,
      n3: n3,
      media: media,
      faltas: totalFaltas,
      situacao: situacao
    };
  });
}

/* ---------------------------------------------------------
   FUNÇÃO: montarTabela(lista)
   Preenche o <tbody id="corpo-tabela"> com uma linha por disciplina.
   --------------------------------------------------------- */
function montarTabela(lista) {
  const corpo = document.getElementById("corpo-tabela");
  corpo.innerHTML = ""; // limpa antes de preencher

  lista.forEach(function (item) {
    // Cria a linha <tr>
    const linha = document.createElement("tr");

    // Define a classe da situação para colorir
    let classeSituacao = "situacao-neutra";
    if (item.situacao === "Bom desempenho") classeSituacao = "situacao-bom";
    if (item.situacao === "Atenção") classeSituacao = "situacao-atencao";

    // Monta o HTML interno da linha
    linha.innerHTML =
      "<td>" + item.disciplina + "</td>" +
      "<td>" + formatarNota(item.n1) + "</td>" +
      "<td>" + formatarNota(item.n2) + "</td>" +
      "<td>" + formatarNota(item.n3) + "</td>" +
      "<td>" + (item.media === null ? "Ainda não lançada" : formatarNota(item.media)) + "</td>" +
      "<td>" + item.faltas + "</td>" +
      "<td class='" + classeSituacao + "'>" + item.situacao + "</td>";

    corpo.appendChild(linha);
  });
}

/* ---------------------------------------------------------
   FUNÇÃO: criarCard(rotulo, valor)
   Cria um card de resumo e devolve o elemento pronto.
   --------------------------------------------------------- */
function criarCard(rotulo, valor) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML =
    "<div class='rotulo'>" + rotulo + "</div>" +
    "<div class='valor'>" + valor + "</div>";
  return card;
}

/* ---------------------------------------------------------
   FUNÇÃO: montarCards(lista)
   Calcula os resumos e preenche a seção de cards.
   --------------------------------------------------------- */
function montarCards(lista) {
  const areaCards = document.getElementById("cards");
  areaCards.innerHTML = "";

  // ---- Média geral: média das médias disponíveis ----
  const mediasValidas = lista
    .map(function (i) { return i.media; })
    .filter(function (m) { return m !== null; });

  let mediaGeral = null;
  if (mediasValidas.length > 0) {
    const soma = mediasValidas.reduce(function (t, m) { return t + m; }, 0);
    mediaGeral = soma / mediasValidas.length;
  }

  // ---- Total de faltas ----
  const totalFaltas = lista.reduce(function (t, i) { return t + i.faltas; }, 0);

  // ---- Disciplinas com bom desempenho ----
  const bomDesempenho = lista.filter(function (i) {
    return i.situacao === "Bom desempenho";
  }).length;

  // ---- Disciplinas que precisam de atenção ----
  const atencao = lista.filter(function (i) {
    return i.situacao === "Atenção";
  }).length;

  // ---- Monta cada card ----
  areaCards.appendChild(
    criarCard("Média geral", mediaGeral === null ? "—" : formatarNota(mediaGeral))
  );
  areaCards.appendChild(criarCard("Total de faltas", totalFaltas));
  areaCards.appendChild(criarCard("Bom desempenho", bomDesempenho + " disciplinas"));
  areaCards.appendChild(criarCard("Precisam de atenção", atencao + " disciplinas"));
  areaCards.appendChild(
    criarCard("Frequência (demonstrativa)", FREQUENCIA_DEMONSTRATIVA + "% — Frequência adequada")
  );
}

/* ---------------------------------------------------------
   INICIALIZAÇÃO
   Quando a página carrega, processa os dados e monta tudo.
   --------------------------------------------------------- */
function iniciar() {
  const listaProcessada = processarDados();
  montarCards(listaProcessada);
  montarTabela(listaProcessada);
}

// Espera o HTML estar pronto antes de rodar
document.addEventListener("DOMContentLoaded", iniciar);