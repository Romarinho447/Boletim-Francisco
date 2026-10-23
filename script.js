/* =========================================================
   BOLETIM DIGITAL — versão local, sem API
   As notas e faltas são guardadas no navegador (localStorage).
   ========================================================= */

const CONFIG_ALUNO = {
  turma: "8A",
  numeroChamada: 10
};

const MEDIA_MINIMA = 6.0;
const CHAVE_BOLETIM = "boletimFranciscoDados";

let pinSessao = null;
let dadosBoletim = [];
let modoEdicao = false;
let carregando = false;
let salvando = false;

const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", iniciar);

function iniciar() {
  $("form-acesso").addEventListener("submit", entrar);
  $("botao-editar").addEventListener("click", abrirEditor);
  $("botao-cancelar").addEventListener("click", cancelarEdicao);
  $("form-edicao").addEventListener("submit", salvarAlteracoes);
}

/* =========================================================
   DADOS INICIAIS — 15 DISCIPLINAS
   Notas copiadas do print da planilha.
   ========================================================= */

function obterDadosDemonstrativos() {
  const disciplinas = [
    ["Língua Portuguesa", 9.5, 9.1],
    ["Matemática", 9.0, 9.0],
    ["Ciências", 8.9, 9.4],
    ["História", 10.0, 9.7],
    ["Geografia", 10.0, 8.0],
    ["Língua Inglesa", 9.2, 10.0],
    ["Arte", 8.5, 10.0],
    ["Educação Física", 9.1, 9.0],
    ["Educação Digital", 9.5, 10.0],
    ["Educação Financeira", 8.8, 9.8],
    ["Estudo Orientado", 10.0, 9.5],
    ["Redação e Leitura", 9.2, 9.0],
    ["Pensamento Lógico", 9.0, 9.4],
    ["Literatura Arte e Movimento", 7.8, 6.4],
    ["Práticas Experimentais", 8.7, 9.8]
  ];

  return disciplinas.map(([disciplina, tri1, tri2]) => ({
    disciplina,
    tri1,
    tri2,
    tri3: null,
    faltas1: 0,
    faltas2: 0,
    faltas3: 0
  }));
}

/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */

function normalizarNotaAntiga(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor === "string" && valor.trim() === "-") {
    return null;
  }

  let numero;

  if (typeof valor === "number") {
    numero = valor;
  } else {
    const texto = String(valor).trim().replace(",", ".");

    if (texto === "") return null;

    numero = Number(texto);
  }

  if (!Number.isFinite(numero)) return null;

  if (numero > 10 && numero <= 100) {
    numero /= 10;
  }

  return numero >= 0 && numero <= 10 ? numero : null;
}

function normalizarFaltaAntiga(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  const numero = Number(valor);

  return Number.isInteger(numero) && numero >= 0 ? numero : 0;
}

function normalizarDisciplina(item) {
  return {
    disciplina: String(item.disciplina ?? item.nome ?? ""),
    tri1: normalizarNotaAntiga(item.tri1),
    tri2: normalizarNotaAntiga(item.tri2),
    tri3: normalizarNotaAntiga(item.tri3),
    faltas1: normalizarFaltaAntiga(
      item.faltas1 ?? item.faltas_tri1 ?? 0
    ),
    faltas2: normalizarFaltaAntiga(
      item.faltas2 ?? item.faltas_tri2 ?? 0
    ),
    faltas3: normalizarFaltaAntiga(
      item.faltas3 ?? item.faltas_tri3 ?? 0
    )
  };
}

/* =========================================================
   ENTRADA — NÃO UTILIZA A API
   O PIN não é validado nesta versão.
   ========================================================= */

function entrar(evento) {
  evento.preventDefault();

  if (carregando) return;

  const campoPin = $("campo-pin");
  const pinDigitado = campoPin.value.trim();

  if (!pinDigitado) {
    mostrarMensagemAcesso("Digite seu PIN.");
    campoPin.focus();
    return;
  }

  carregando = true;

  try {
    const dadosSalvos = localStorage.getItem(CHAVE_BOLETIM);

    if (dadosSalvos) {
      const parseados = JSON.parse(dadosSalvos);

      if (!Array.isArray(parseados) || parseados.length === 0) {
        throw new Error("Formato dos dados locais inválido.");
      }

      dadosBoletim = parseados.map(normalizarDisciplina);
    } else {
      dadosBoletim = obterDadosDemonstrativos();
    }
  } catch (erro) {
    mostrarMensagemAcesso(
      "Não foi possível ler os dados salvos neste navegador."
    );
    carregando = false;
    return;
  }

  carregando = false;
  pinSessao = null;
  campoPin.value = "";
  modoEdicao = false;

  $("area-acesso").hidden = true;
  $("area-boletim").hidden = false;
  $("area-editor").hidden = true;

  $("status-boletim").textContent =
    "Boletim local: os dados ficam salvos somente neste navegador.";

  renderizarInterface();
}

function mostrarMensagemAcesso(mensagem) {
  $("mensagem-acesso").textContent = mensagem;
}

/* =========================================================
   RENDERIZAÇÃO DA TABELA E DOS CARDS
   ========================================================= */

function renderizarInterface() {
  const corpoTabela = $("corpo-tabela");
  const containerCards = $("cards");

  corpoTabela.replaceChildren();
  containerCards.replaceChildren();

  dadosBoletim.forEach((item) => {
    const linha = document.createElement("tr");

    const celulaDisciplina = document.createElement("td");
    celulaDisciplina.textContent = item.disciplina;
    celulaDisciplina.style.fontWeight = "bold";
    celulaDisciplina.style.textAlign = "left";
    linha.appendChild(celulaDisciplina);

    ["tri1", "tri2", "tri3"].forEach((campo) => {
      const celula = document.createElement("td");
      celula.textContent = formatarNota(item[campo]);
      linha.appendChild(celula);
    });

    const celulaMedia = document.createElement("td");
    celulaMedia.className = "col-media";
    celulaMedia.style.fontWeight = "bold";
    linha.appendChild(celulaMedia);

    const celulaFaltas = document.createElement("td");
    celulaFaltas.textContent = String(
      item.faltas1 + item.faltas2 + item.faltas3
    );
    linha.appendChild(celulaFaltas);

    const celulaSituacao = document.createElement("td");
    celulaSituacao.className = "col-situacao";
    linha.appendChild(celulaSituacao);

    corpoTabela.appendChild(linha);

    atualizarLinha(linha, item);
  });

  atualizarCardsResumo();
}

function formatarNota(valor) {
  if (valor === null || valor === undefined) {
    return "—";
  }

  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function calcularMedia(item) {
  const notas = [item.tri1, item.tri2, item.tri3]
    .filter((nota) => nota !== null && nota !== undefined);

  if (notas.length === 0) return null;

  return notas.reduce((soma, nota) => soma + nota, 0) / notas.length;
}

function atualizarLinha(linha, item) {
  const media = calcularMedia(item);
  const celulaMedia = linha.querySelector(".col-media");
  const celulaSituacao = linha.querySelector(".col-situacao");

  if (media !== null) {
    celulaMedia.textContent = media.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });

    if (media >= MEDIA_MINIMA) {
      celulaSituacao.textContent = "Aprovado";
      celulaSituacao.className = "col-situacao situacao-bom";
    } else {
      celulaSituacao.textContent = "Atenção";
      celulaSituacao.className = "col-situacao situacao-atencao";
    }
  } else {
    celulaMedia.textContent = "—";
    celulaSituacao.textContent = "Em andamento";
    celulaSituacao.className = "col-situacao situacao-neutra";
  }
}

function atualizarCardsResumo() {
  const containerCards = $("cards");

  let somaMedias = 0;
  let contagemMedias = 0;

  dadosBoletim.forEach((item) => {
    const media = calcularMedia(item);

    if (media !== null) {
      somaMedias += media;
      contagemMedias++;
    }
  });

  const mediaGeral = contagemMedias > 0
    ? somaMedias / contagemMedias
    : 0;

  criarCard(
    containerCards,
    "Média Geral",
    mediaGeral.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
  );

  criarCard(
    containerCards,
    "Disciplinas",
    String(dadosBoletim.length)
  );

  criarCard(containerCards, "Ano Letivo", "8º Ano");
}

function criarCard(container, rotulo, valor) {
  const card = document.createElement("div");
  card.className = "card";

  const titulo = document.createElement("div");
  titulo.className = "rotulo";
  titulo.textContent = rotulo;

  const numero = document.createElement("div");
  numero.className = "valor";
  numero.textContent = valor;

  if (rotulo === "Ano Letivo") {
    numero.style.fontSize = "1.2rem";
    numero.style.paddingTop = "5px";
  }

  card.append(titulo, numero);
  container.appendChild(card);
}

/* =========================================================
   EDITOR DE NOTAS E FALTAS
   ========================================================= */

function abrirEditor() {
  if (modoEdicao || salvando) return;

  modoEdicao = true;

  $("mensagem-edicao").textContent = "";
  $("area-editor").hidden = false;

  const container = $("campos-edicao");
  container.replaceChildren();

  dadosBoletim.forEach((item, indice) => {
    const grupo = document.createElement("section");
    grupo.className = "grupo-disciplina";

    const titulo = document.createElement("h3");
    titulo.textContent = item.disciplina;
    grupo.appendChild(titulo);

    [
      { campo: "tri1", rotulo: "Nota do 1º trimestre", tipo: "nota" },
      { campo: "tri2", rotulo: "Nota do 2º trimestre", tipo: "nota" },
      { campo: "tri3", rotulo: "Nota do 3º trimestre", tipo: "nota" },
      { campo: "faltas1", rotulo: "Faltas do 1º trimestre", tipo: "faltas" },
      { campo: "faltas2", rotulo: "Faltas do 2º trimestre", tipo: "faltas" },
      { campo: "faltas3", rotulo: "Faltas do 3º trimestre", tipo: "faltas" }
    ].forEach((config) => {
      const grupoCampo = document.createElement("div");
      grupoCampo.className = "grupo-campo";

      const idCampo = `edicao-${indice}-${config.campo}`;

      const label = document.createElement("label");
      label.htmlFor = idCampo;
      label.textContent = config.rotulo;

      const input = document.createElement("input");
      input.id = idCampo;
      input.name = `${indice}-${config.campo}`;
      input.dataset.indice = String(indice);
      input.dataset.campo = config.campo;
      input.dataset.tipo = config.tipo;
      input.className = "campo-edicao";
      input.type = "text";
      input.inputMode = config.tipo === "nota" ? "decimal" : "numeric";
      input.autocomplete = "off";
      input.value = valorParaEditor(item[config.campo]);

      const erro = document.createElement("span");
      erro.className = "erro-campo";
      erro.id = `${idCampo}-erro`;
      erro.setAttribute("aria-live", "polite");

      input.setAttribute("aria-describedby", erro.id);

      input.addEventListener("input", () => {
        validarCampoVisual(input, erro);
      });

      grupoCampo.append(label, input, erro);
      grupo.appendChild(grupoCampo);
    });

    container.appendChild(grupo);
  });

  $("botao-editar").disabled = true;

  $("area-editor").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function valorParaEditor(valor) {
  if (valor === null || valor === undefined) return "";

  return String(valor).replace(".", ",");
}

function validarCampoVisual(input, elementoErro) {
  const resultado = validarValor(input.value, input.dataset.tipo);

  input.classList.toggle("invalido", !resultado.valido);
  input.setAttribute("aria-invalid", String(!resultado.valido));

  elementoErro.textContent = resultado.valido ? "" : resultado.erro;
}

function validarValor(valor, tipo) {
  const texto = valor.trim();

  if (tipo === "nota") {
    if (texto === "") {
      return { valido: true, valor: null };
    }

    if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(texto)) {
      return {
        valido: false,
        erro: "Digite uma nota entre 0 e 10."
      };
    }

    const numero = Number(texto.replace(",", "."));

    if (!Number.isFinite(numero) || numero < 0 || numero > 10) {
      return {
        valido: false,
        erro: "A nota deve estar entre 0 e 10."
      };
    }

    return { valido: true, valor: numero };
  }

  if (tipo === "faltas") {
    if (!/^\d+$/.test(texto)) {
      return {
        valido: false,
        erro: "Digite um número inteiro igual ou maior que zero."
      };
    }

    const numero = Number(texto);

    if (!Number.isSafeInteger(numero) || numero < 0) {
      return {
        valido: false,
        erro: "Digite um número inteiro válido de faltas."
      };
    }

    return { valido: true, valor: numero };
  }

  return {
    valido: false,
    erro: "Campo inválido."
  };
}

function cancelarEdicao() {
  if (salvando) return;

  modoEdicao = false;
  $("area-editor").hidden = true;
  $("mensagem-edicao").textContent = "";
  $("botao-editar").disabled = false;
}

function coletarEdicao() {
  const inputs = $("campos-edicao").querySelectorAll(".campo-edicao");
  const novosDados = dadosBoletim.map((item) => ({ ...item }));

  let primeiroInvalido = null;

  for (const input of inputs) {
    const resultado = validarValor(
      input.value,
      input.dataset.tipo
    );

    const elementoErro = $(`${input.id}-erro`);

    input.classList.toggle("invalido", !resultado.valido);
    input.setAttribute("aria-invalid", String(!resultado.valido));

    elementoErro.textContent = resultado.valido ? "" : resultado.erro;

    if (!resultado.valido) {
      if (!primeiroInvalido) primeiroInvalido = input;
      continue;
    }

    const indice = Number(input.dataset.indice);
    const campo = input.dataset.campo;

    novosDados[indice][campo] = resultado.valor;
  }

  if (primeiroInvalido) {
    primeiroInvalido.focus();
    return null;
  }

  return novosDados;
}

/* =========================================================
   SALVAMENTO LOCAL — NÃO UTILIZA A API
   ========================================================= */

function salvarAlteracoes(evento) {
  evento.preventDefault();

  if (salvando || !modoEdicao) return;

  const novosDados = coletarEdicao();

  if (!novosDados) {
    $("mensagem-edicao").textContent =
      "Corrija os campos inválidos antes de salvar.";
    return;
  }

  salvando = true;

  const botaoSalvar = $("botao-salvar");
  const botaoCancelar = $("botao-cancelar");

  botaoSalvar.disabled = true;
  botaoCancelar.disabled = true;
  botaoSalvar.textContent = "Salvando...";
  $("mensagem-edicao").textContent = "Salvando...";

  try {
    localStorage.setItem(
      CHAVE_BOLETIM,
      JSON.stringify(novosDados)
    );

    dadosBoletim = novosDados;
    renderizarInterface();

    modoEdicao = false;
    $("area-editor").hidden = true;

    $("status-boletim").textContent =
      "Boletim salvo localmente neste navegador.";

    $("mensagem-edicao").textContent =
      "Dados salvos com sucesso!";
  } catch (erro) {
    $("mensagem-edicao").textContent =
      "Não foi possível salvar. Verifique o armazenamento do navegador.";
  } finally {
    salvando = false;
    botaoSalvar.disabled = false;
    botaoCancelar.disabled = false;
    botaoSalvar.textContent = "Salvar alterações";
    $("botao-editar").disabled = false;
  }
}