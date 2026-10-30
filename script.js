const CONFIG_ALUNO = {
  turma: "8A",
  numeroChamada: 10,
  apiUrl: "https://boletim-api.profbt.com.br"
};

const MEDIA_MINIMA = 6.0;

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

/* ====== NORMALIZAÇÃO DOS DADOS ====== */

function normalizarNotaAntiga(valor) {
  if (valor === null || valor === undefined || valor === "" || valor === "-") {
    return null;
  }

  let nota = Number(String(valor).replace(",", "."));

  if (!Number.isFinite(nota)) {
    return null;
  }

  if (nota > 10 && nota <= 100) {
    nota /= 10;
  }

  return nota >= 0 && nota <= 10 ? nota : null;
}

function normalizarFaltaAntiga(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  const falta = Number(valor);

  return Number.isInteger(falta) && falta >= 0 ? falta : 0;
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

/* ====== ACESSO À API ====== */

async function entrar(evento) {
  evento.preventDefault();

  if (carregando) return;

  const campoPin = $("campo-pin");
  const pinDigitado = campoPin.value.trim();

  if (!pinDigitado) {
    mostrarMensagemAcesso("Digite seu PIN.");
    return;
  }

  carregando = true;

  const botaoEntrar = $("botao-entrar");
  botaoEntrar.disabled = true;
  botaoEntrar.textContent = "Conectando...";
  mostrarMensagemAcesso("Conectando...");

  try {
    const resposta = await fetch(
      `${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          turma: CONFIG_ALUNO.turma,
          numero_chamada: CONFIG_ALUNO.numeroChamada,
          pin: pinDigitado
        })
      }
    );

    if (resposta.status === 401) {
      throw new Error("PIN_INVALIDO");
    }

    if (resposta.status === 429) {
      throw new Error("LIMITE_TENTATIVAS");
    }

    if (!resposta.ok) {
      throw new Error("ERRO_SERVIDOR");
    }

    const resultado = await resposta.json();

    if (!resultado || !Object.prototype.hasOwnProperty.call(resultado, "dados")) {
      throw new Error("RESPOSTA_INVALIDA");
    }

    if (resultado.dados === null) {
      dadosBoletim = obterDadosDemonstrativos();
      $("status-boletim").textContent =
        "Dados fictícios carregados. Ainda não existem dados salvos na API.";
    } else {
      if (
        !resultado.dados ||
        !Array.isArray(resultado.dados.disciplinas)
      ) {
        throw new Error("RESPOSTA_INVALIDA");
      }

      dadosBoletim = resultado.dados.disciplinas.map(normalizarDisciplina);
      $("status-boletim").textContent = "Dados carregados da API.";
    }

    pinSessao = pinDigitado;
    campoPin.value = "";

    modoEdicao = false;
    $("area-acesso").hidden = true;
    $("area-boletim").hidden = false;
    $("area-editor").hidden = true;

    renderizarInterface();
  } catch (erro) {
    if (erro.message === "PIN_INVALIDO") {
      mostrarMensagemAcesso("Turma, chamada ou PIN inválidos.");
    } else if (erro.message === "LIMITE_TENTATIVAS") {
      mostrarMensagemAcesso(
        "Muitas tentativas. Aguarde um minuto e tente novamente."
      );
    } else if (
      erro.message === "RESPOSTA_INVALIDA" ||
      erro.message === "ERRO_SERVIDOR"
    ) {
      mostrarMensagemAcesso(
        "Não foi possível carregar os dados. Tente novamente."
      );
    } else {
      mostrarMensagemAcesso(
        "Não foi possível conectar ao servidor. Tente novamente."
      );
    }
  } finally {
    carregando = false;
    botaoEntrar.disabled = false;
    botaoEntrar.textContent = "Entrar";
  }
}

function mostrarMensagemAcesso(mensagem) {
  $("mensagem-acesso").textContent = mensagem;
}

/* ====== CÁLCULOS ====== */

function formatarNota(nota) {
  if (nota === null || nota === undefined) {
    return "—";
  }

  return nota.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function calcularMedia(disciplina) {
  const notas = [
    disciplina.tri1,
    disciplina.tri2,
    disciplina.tri3
  ].filter((nota) => nota !== null && nota !== undefined);

  if (notas.length === 0) {
    return null;
  }

  const soma = notas.reduce((total, nota) => total + nota, 0);
  return soma / notas.length;
}

function calcularTotalFaltas(disciplina) {
  return (
    disciplina.faltas1 +
    disciplina.faltas2 +
    disciplina.faltas3
  );
}

/* ====== RENDERIZAÇÃO ====== */

function renderizarInterface() {
  const corpoTabela = $("corpo-tabela");
  const cards = $("cards");

  corpoTabela.replaceChildren();
  cards.replaceChildren();

  dadosBoletim.forEach((disciplina, indice) => {
    const linha = document.createElement("tr");

    const celulaNome = document.createElement("td");
    celulaNome.textContent = disciplina.disciplina;
    linha.appendChild(celulaNome);

    const celulaTri1 = document.createElement("td");
    celulaTri1.textContent = formatarNota(disciplina.tri1);
    linha.appendChild(celulaTri1);

    const celulaTri2 = document.createElement("td");
    celulaTri2.textContent = formatarNota(disciplina.tri2);
    linha.appendChild(celulaTri2);

    const celulaTri3 = document.createElement("td");
    celulaTri3.textContent = formatarNota(disciplina.tri3);
    linha.appendChild(celulaTri3);

    const media = calcularMedia(disciplina);
    const celulaMedia = document.createElement("td");
    celulaMedia.textContent = formatarNota(media);
    linha.appendChild(celulaMedia);

    const celulaFaltas = document.createElement("td");
    celulaFaltas.textContent = calcularTotalFaltas(disciplina);
    linha.appendChild(celulaFaltas);

    const celulaSituacao = document.createElement("td");
    atualizarLinha(celulaSituacao, media);
    linha.appendChild(celulaSituacao);

    linha.dataset.indice = indice;
    corpoTabela.appendChild(linha);
  });

  atualizarCardsResumo();
}

function atualizarLinha(celula, media) {
  celula.className = "";

  if (media === null) {
    celula.textContent = "Nota ainda não disponível";
    celula.classList.add("situacao-neutra");
  } else if (media >= MEDIA_MINIMA) {
    celula.textContent = "Bom desempenho";
    celula.classList.add("situacao-bom");
  } else {
    celula.textContent = "Atenção";
    celula.classList.add("situacao-atencao");
  }
}

function atualizarCardsResumo() {
  const cards = $("cards");

  const medias = dadosBoletim
    .map(calcularMedia)
    .filter((media) => media !== null);

  const mediaGeral = medias.length
    ? medias.reduce((soma, media) => soma + media, 0) / medias.length
    : null;

  criarCard(
    cards,
    "Média Geral",
    mediaGeral === null ? "—" : formatarNota(mediaGeral)
  );

  criarCard(cards, "Disciplinas", String(dadosBoletim.length));
  criarCard(cards, "Ano Letivo", "8º Ano");
}

function criarCard(container, rotulo, valor) {
  const card = document.createElement("article");
  card.className = "card";

  const titulo = document.createElement("p");
  titulo.className = "rotulo";
  titulo.textContent = rotulo;

  const conteudo = document.createElement("p");
  conteudo.className = "valor";
  conteudo.textContent = valor;

  card.append(titulo, conteudo);
  container.appendChild(card);
}

/* ====== EDITOR ====== */

function abrirEditor() {
  if (modoEdicao || salvando) return;

  modoEdicao = true;
  $("area-editor").hidden = false;
  $("mensagem-edicao").textContent = "";

  const campos = $("campos-edicao");
  campos.replaceChildren();

  dadosBoletim.forEach((disciplina, indice) => {
    const grupo = document.createElement("div");
    grupo.className = "grupo-disciplina";

    const titulo = document.createElement("h3");
    titulo.textContent = disciplina.disciplina;
    grupo.appendChild(titulo);

    criarCampoEdicao(grupo, indice, "tri1", "Nota do 1º trimestre", "nota", disciplina.tri1);
    criarCampoEdicao(grupo, indice, "tri2", "Nota do 2º trimestre", "nota", disciplina.tri2);
    criarCampoEdicao(grupo, indice, "tri3", "Nota do 3º trimestre", "nota", disciplina.tri3);
    criarCampoEdicao(grupo, indice, "faltas1", "Faltas do 1º trimestre", "falta", disciplina.faltas1);
    criarCampoEdicao(grupo, indice, "faltas2", "Faltas do 2º trimestre", "falta", disciplina.faltas2);
    criarCampoEdicao(grupo, indice, "faltas3", "Faltas do 3º trimestre", "falta", disciplina.faltas3);

    campos.appendChild(grupo);
  });
}

function criarCampoEdicao(container, indice, campo, rotulo, tipo, valor) {
  const grupo = document.createElement("div");
  grupo.className = "grupo-campo";

  const id = `campo-${indice}-${campo}`;

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = rotulo;

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.className = "campo-edicao";
  input.dataset.indice = indice;
  input.dataset.campo = campo;
  input.dataset.tipo = tipo;
  input.inputMode = tipo === "nota" ? "decimal" : "numeric";
  input.value = valor === null ? "" : String(valor);

  const erro = document.createElement("span");
  erro.className = "erro-campo";
  erro.id = `${id}-erro`;

  input.setAttribute("aria-describedby", erro.id);

  input.addEventListener("input", () => {
    validarCampoVisual(input, erro);
  });

  grupo.append(label, input, erro);
  container.appendChild(grupo);
}

/* ====== VALIDAÇÃO ====== */

function validarValor(valor, tipo) {
  const texto = valor.trim();

  if (tipo === "nota") {
    if (texto === "") {
      return { valido: true, valor: null };
    }

    const numero = Number(texto.replace(",", "."));

    if (
      !Number.isFinite(numero) ||
      numero < 0 ||
      numero > 10
    ) {
      return {
        valido: false,
        mensagem: "Digite uma nota entre 0 e 10."
      };
    }

    return { valido: true, valor: numero };
  }

  if (!/^\d+$/.test(texto)) {
    return {
      valido: false,
      mensagem: "Digite um número inteiro igual ou maior que zero."
    };
  }

  const numero = Number(texto);

  if (!Number.isSafeInteger(numero)) {
    return {
      valido: false,
      mensagem: "Digite um número inteiro válido."
    };
  }

  return { valido: true, valor: numero };
}

function validarCampoVisual(input, erro) {
  const resultado = validarValor(
    input.value,
    input.dataset.tipo
  );

  input.classList.toggle("invalido", !resultado.valido);
  input.setAttribute("aria-invalid", String(!resultado.valido));
  erro.textContent = resultado.valido ? "" : resultado.mensagem;

  return resultado.valido;
}

function coletarEdicao() {
  const novosDados = dadosBoletim.map((disciplina) => ({
    ...disciplina
  }));

  const inputs = $("campos-edicao").querySelectorAll(
    "input[data-indice][data-campo]"
  );

  let tudoValido = true;

  inputs.forEach((input) => {
    const indice = Number(input.dataset.indice);
    const campo = input.dataset.campo;
    const tipo = input.dataset.tipo;
    const erro = $( `${input.id}-erro` );

    const valido = validarCampoVisual(input, erro);

    if (!valido) {
      tudoValido = false;
      return;
    }

    const resultado = validarValor(input.value, tipo);
    novosDados[indice][campo] = resultado.valor;
  });

  return tudoValido ? novosDados : null;
}

/* ====== CANCELAR E SALVAR ====== */

function cancelarEdicao() {
  if (salvando) return;

  modoEdicao = false;
  $("area-editor").hidden = true;
  $("mensagem-edicao").textContent = "";
}

async function salvarAlteracoes(evento) {
  evento.preventDefault();

  if (salvando) return;

  const novosDados = coletarEdicao();

  if (!novosDados) {
    $("mensagem-edicao").textContent =
      "Corrija os campos destacados antes de salvar.";
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
    const resposta = await fetch(
      `${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          turma: CONFIG_ALUNO.turma,
          numero_chamada: CONFIG_ALUNO.numeroChamada,
          pin: pinSessao,
          dados: {
            disciplinas: novosDados
          }
        })
      }
    );

    if (resposta.status === 401) {
      throw new Error("PIN_INVALIDO");
    }

    if (resposta.status === 429) {
      throw new Error("LIMITE_TENTATIVAS");
    }

    if (!resposta.ok) {
      throw new Error("ERRO_SERVIDOR");
    }

    dadosBoletim = novosDados;
    renderizarInterface();

    modoEdicao = false;
    $("area-editor").hidden = true;
    $("status-boletim").textContent = "Dados salvos na API.";
    $("mensagem-edicao").textContent = "Dados salvos com sucesso.";
  } catch (erro) {
    if (erro.message === "PIN_INVALIDO") {
      $("mensagem-edicao").textContent =
        "Turma, chamada ou PIN inválidos. Faça o acesso novamente.";
    } else if (erro.message === "LIMITE_TENTATIVAS") {
      $("mensagem-edicao").textContent =
        "Muitas tentativas. Aguarde um minuto e tente novamente.";
    } else {
      $("mensagem-edicao").textContent =
        "Não foi possível salvar os dados. Suas alterações foram mantidas. Tente novamente.";
    }
  } finally {
    salvando = false;
    botaoSalvar.disabled = false;
    botaoCancelar.disabled = false;
    botaoSalvar.textContent = "Salvar alterações";
  }
}