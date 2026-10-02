/* =========================================================
   BOLETIM DIGITAL — script.js (Ajustado para o seu link CSV Real)
   ========================================================= */

// O link exato gerado na tela do seu Google Sheets
const URL_PLANILHA = 'https://google.com';

const MEDIA_MINIMA = 6.0;

window.addEventListener('DOMContentLoaded', carregarDadosDaPlanilha);

async function carregarDadosDaPlanilha() {
  try {
    // Usando proxy público para evitar bloqueio de segurança (CORS) ao testar localmente no PC
    const urlComProxy = 'https://allorigins.win' + encodeURIComponent(URL_PLANILHA);
    
    const resposta = await fetch(urlComProxy);
    if (!resposta.ok) throw new Error('Não foi possível ler a planilha pública.');
    
    const textoCSV = await resposta.text();
    const dados = processarCSV(textoCSV);

    renderizarCards(dados);
    renderizarTabela(dados);

  } catch (erro) {
    console.error('Erro detalhado:', erro);
    document.getElementById('corpo-tabela').innerHTML = `
      <tr><td colspan="7" style="color:#d9a441; text-align:center; padding: 20px;">
        Erro ao carregar notas. Verifique a conexão com a planilha.
      </td></tr>
    `;
  }
}

function processarCSV(texto) {
  const linhas = texto.split(/\r?\n/);
  const listaDisciplinas = [];

  // Na sua planilha real, os dados de notas começam estritamente na linha 6 (índice 5 do JavaScript)
  // E vão até a linha 19 (índice 18). Vamos ler exatamente esse intervalo.
  for (let i = 5; i <= 18; i++) {
    if (!linhas[i]) continue;

    // Expressão regular que separa por vírgula mas IGNERA vírgulas dentro de aspas (ex: "8,5")
    const colunas = linhas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*\$)/g) || linhas[i].split(',');

    if (!colunas || colunas.length < 4) continue;

    const limpar = (txt) => txt ? txt.replace(/"/g, '').trim() : "";

    const disciplina = limpar(colunas[0]);
    if (disciplina === "" || disciplina.includes("TOTAL GERAL")) continue;

    listaDisciplinas.push({
      disciplina: disciplina,
      tri1: limpar(colunas[1]),
      tri2: limpar(colunas[2]),
      tri3: limpar(colunas[3])
    });
  }
  return listaDisciplinas;
}

function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "" || valor === "-") {
    return null;
  }
  let numero = typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);
  if (isNaN(numero)) return null;
  return numero;
}

function renderizarTabela(dados) {
  const corpoTabela = document.getElementById('corpo-tabela');
  corpoTabela.innerHTML = '';

  dados.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const notasValidas = [n1, n2, n3].filter(n => n !== null);
    const media = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length) : null;
    
    let situacaoTexto = "Em andamento";
    let situacaoClasse = "situacao-neutra";

    if (media !== null) {
      if (media >= MEDIA_MINIMA) {
        situacaoTexto = "Aprovado";
        situacaoClasse = "situacao-bom";
      } else {
        situacaoTexto = "Atenção";
        situacaoClasse = "situacao-atencao";
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.disciplina}</td>
      <td>${n1 !== null ? n1.toFixed(1) : '-'}</td>
      <td>${n2 !== null ? n2.toFixed(1) : '-'}</td>
      <td>${n3 !== null ? n3.toFixed(1) : '-'}</td>
      <td style="font-weight: bold;">${media !== null ? media.toFixed(1) : '-'}</td>
      <td>0</td> <!-- Campo de faltas padrão zerado -->
      <td class="${situacaoClasse}">${situacaoTexto}</td>
    `;
    corpoTabela.appendChild(tr);
  });
}

function renderizarCards(dados) {
  const containerCards = document.getElementById('cards');
  
  let somaMedias = 0;
  let contagemMedias = 0;

  dados.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);
    const notasValidas = [n1, n2, n3].filter(n => n !== null);
    
    if (notasValidas.length > 0) {
      somaMedias += (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length);
      contagemMedias++;
    }
  });

  const mediaGeral = contagemMedias > 0 ? (somaMedias / contagemMedias) : 0;

  containerCards.innerHTML = `
    <div class="card">
      <div class="rotulo">Média Geral</div>
      <div class="valor">${mediaGeral.toFixed(1)}</div>
    </div>
    <div class="card">
      <div class="rotulo">Disciplinas</div>
      <div class="valor">${dados.length}</div>
    </div>
    <div class="card">
      <div class="rotulo">Ano Letivo</div>
      <div class="valor" style="font-size: 1.2rem; padding-top: 5px;">8º Ano</div>
    </div>
  `;
}
