/* =========================================================
   BOLETIM DIGITAL — Integração com a API do professor
   Preserva as disciplinas e os dados demonstrativos existentes.
   ========================================================= */

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

/* =========================================================
   DADOS DEMONSTRATIVOS ORIGINAIS
   Usados somente quando a API não possui dados salvos.
   ========================================================= */

function obterDadosDemonstrativos() {
  return [
    { disciplina: "Língua Portuguesa", tri1: 75, tri2: 82, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "Matemática", tri1: 82, tri2: 75, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "Ciências", tri1: 80, tri2: 85, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "História", tri1: 78, tri2: 80, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "Geografia", tri1: 85, tri2: 88, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "Inglês", tri1: 90, tri2: 85, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "Educação Física", tri1: 90, tri2: 92, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 },
    { disciplina: "Arte", tri1: 85, tri2: 90, tri3: null, faltas1: 0, faltas2: 0, faltas3: 0 }
  ];
}

/* =========================================================
   NORMALIZAÇÃO DAS NOTAS ANTIGAS
   75 -> 7,5 | 82 -> 8,2 | 100 -> 10
   "8,5" -> 8,5 | 8.5 -> 8,5 | null -> sem nota
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
    numero = numero / 10;
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
    faltas1: normalizarFaltaAntiga(item.faltas1 ?? item.faltas_tri1 ?? 0),
    faltas2: normalizarFaltaAntiga(item.faltas2 ?? item.faltas_tri2 ?? 0),
    faltas3: normalizarFaltaAntiga(item.faltas3 ?? item.faltas_tri3 ?? 0)
  };
}

/* =========================================================
   ACESSO À API
   ========================================================= */

async function entrar(evento) {
  evento.preventDefault();

  if (carregando) return;

  const campoPin = $("campo-pin");
  const pinDigitado = campoPin.value.trim();
  const botao = $("botao-entrar");

  if (!pinDigitado) {
    mostrarMensagemAcesso("Digite seu PIN.");
    campoPin.focus();
    return;
  }

  carregando = true;
  botao.disabled = true;
  botao.textContent = "Conectando...";
  mostrarMensagemAcesso("Conectando...");

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      resultado = null;
    }

    if (resposta.status === 401) {
      mostrarMensagemAcesso("Turma, chamada ou PIN inválidos.");
      return;
    }

    if (resposta.status === 429) {
      mostrarMensagemAcesso("Muitas tentativas. Aguarde um minuto e tente novamente.");
      return;
    }

    if (!resposta.ok) {
      mostrarMensagemAcesso(
        obterMensagemErro(resultado, "Não foi possível abrir o boletim. Tente novamente.")
      );
      return;
    }

    if (!resultado || !Object.prototype.hasOwnProperty.call(resultado, "dados")) {
      mostrarMensagemAcesso("A resposta do servidor não contém os dados esperados.");
      return;
    }

    pinSessao = pinDigitado;
    campoPin.value = "";

    if (resultado.dados !== null) {
      if (!Array.isArray(resultado.dados.disciplinas)) {
        pinSessao = null;
        mostrarMensagemAcesso("Os dados recebidos do servidor são inválidos.");
        return;
      }

      dadosBoletim = resultado.dados.disciplinas.map(normalizarDisciplina);
    } else {
      dadosBoletim = obterDadosDemonstrativos().map(normalizarDisciplina);
    }

    modoEdicao = false;
    $("area-acesso").hidden = true;
    $("area-boletim").hidden = false;
    $("area-editor").hidden = true;

    $("status-boletim").textContent =
      resultado.dados === null
        ? "Dados demonstrativos. As alterações só serão salvas quando você clicar em Salvar alterações."
        : "Boletim carregado do servidor.";

    renderizarInterface();
  } catch (erro) {
    mostrarMensagemAcesso(
      "Não foi possível conectar ao servidor. Tente novamente."
    );
  } finally {
    carregando = false;
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
}

function obterMensagemErro(resultado, padrao) {
  if (resultado && typeof resultado.detail === "string") {
    return resultado.detail;
  }

  if (resultado && typeof resultado.message === "string") {
    return resultado.message;
  }

  if (resultado && typeof resultado.mensagem === "string") {
    return resultado.mensagem;
  }

  return padrao;
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
  if (valor === null || valor === undefined) return "—";
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

  criarCard(containerCards, "Média Geral", mediaGeral.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }));

  criarCard(containerCards, "Disciplinas", String(dadosBoletim.length));
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

      input.addEventListener("input", () => validarCampoVisual(input, erro));

      grupoCampo.append(label, input, erro);
      grupo.appendChild(grupoCampo);
    });

    container.appendChild(grupo);
  });

  $("botao-editar").disabled = true;
  $("area-editor").scrollIntoView({ behavior: "smooth", block: "start" });
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

  return { valido: false, erro: "Campo inválido." };
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
    const resultado = validarValor(input.value, input.dataset.tipo);
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
   SALVAMENTO NA API
   ========================================================= */

async function salvarAlteracoes(evento) {
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
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinSessao,
        dados: {
          disciplinas: novosDados.map((item) => ({
            disciplina: item.disciplina,
            tri1: item.tri1,
            tri2: item.tri2,
            tri3: item.tri3,
            faltas1: item.faltas1,
            faltas2: item.faltas2,
            faltas3: item.faltas3
          }))
        }
      })
    });

    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      resultado = null;
    }

    if (resposta.status === 401) {
      $("mensagem-edicao").textContent =
        "A sessão não foi autorizada. Entre novamente com seu PIN.";
      return;
    }

    if (resposta.status === 429) {
      $("mensagem-edicao").textContent =
        "Muitas tentativas. Aguarde um minuto e tente novamente.";
      return;
    }

    if (!resposta.ok) {
      $("mensagem-edicao").textContent = obterMensagemErro(
        resultado,
        "Não foi possível salvar. Suas alterações continuam no editor. Tente novamente."
      );
      return;
    }

    dadosBoletim = novosDados;
    renderizarInterface();

    modoEdicao = false;
    $("area-editor").hidden = true;
    $("status-boletim").textContent = "Boletim atualizado.";
    $("mensagem-edicao").textContent = "Dados salvos com sucesso.";
  } catch (erro) {
    $("mensagem-edicao").textContent =
      "Não foi possível conectar ao servidor. Suas alterações continuam no editor. Tente novamente.";
  } finally {
    salvando = false;
    botaoSalvar.disabled = false;
    botaoCancelar.disabled = false;
    botaoSalvar.textContent = "Salvar alterações";
    $("botao-editar").disabled = false;
  }
}