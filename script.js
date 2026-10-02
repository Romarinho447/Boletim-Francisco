/* =========================================================
   BOLETIM DIGITAL — script.js (Ajustado para sua Planilha)
   ========================================================= */

// URL configurada especificamente para puxar a aba "Notas" em formato CSV
const URL_PLANILHA = 'https://google.com';

const MEDIA_MINIMA = 6.0;

window.addEventListener('DOMContentLoaded', carregarDadosDaPlanilha);

async function carregarDadosDaPlanilha() {
  try {
    const resposta = await fetch(URL_PLANILHA);
    const textoCSV = await resposta.text();

    const dados = processarCSV(textoCSV);

    renderizarCards(dados);
    renderizarTabela(dados);

  } catch (erro) {
    console.error('Erro ao carregar dados:', erro);
    document.getElementById('corpo-tabela').innerHTML = `
      <tr><td colspan="7" style="color:#d9a441; text-align:center;">Erro ao carregar notas. Verifique a publicação da planilha.</td></tr>
    `;
  }
}

function processarCSV(texto) {
  // Divide o CSV por linhas, tratando quebras de página comuns
  const linhas = texto.split(/\r?\n/);
  const listaDisciplinas = [];

  // Na sua imagem, os dados de verdade começam na linha 6 (índice 5 do array)
  // E vão até a linha 19 (índice 18). Vamos ignorar o "TOTAL GERAL" da linha 20.
  for (let i = 5; i <= 18; i++) {
    if (!linhas[i]) continue;

    // Divide as colunas por vírgula
    const colunas = linhas[i].split(',');

    // Se a linha estiver vazia ou não tiver o nome da matéria, pula
    if (!colunas[0] || colunas[0].trim() === "" || colunas[0].includes("TOTAL GERAL")) continue;

    // Limpa aspas extras que o Google Sheets coloca no CSV
    const limpar = (texto) => texto ? texto.replace(/"/g, '').trim() : "";

    listaDisciplinas.push({
      disciplina: limpar(colunas[0]),
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
  
  // Se na planilha estiver como 85 em vez de 8.5, faz a divisão
  if (numero > 10 && numero <= 100) return numero / 10;
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
      <td>0</td> <!-- Faltas serão integradas depois se quiser -->
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
