/* =========================================================
   BOLETIM DIGITAL — script.js (Versão Definitiva para Vercel)
   ========================================================= */

// Link direto e oficial da sua aba Notas sem intermediários
const URL_PLANILHA = 'https://docs.google.com/spreadsheets/d/13xqyosiJv61XSL9uarli7TKhVNW5YMs1/edit?usp=sharing&ouid=104410119680124003165&rtpof=true&sd=true';

const MEDIA_MINIMA = 6.0;

window.addEventListener('DOMContentLoaded', carregarDadosDaPlanilha);

async function carregarDadosDaPlanilha() {
  try {
    // Busca os dados diretamente do Google Sheets (sem bloqueio de CORS no Vercel)
    const resposta = await fetch(URL_PLANILHA);
    if (!resposta.ok) throw new Error('Erro ao acessar o Google Sheets.');
    
    const textoCSV = await resposta.text();
    const dados = processarCSV(textoCSV);

    renderizarCards(dados);
    renderizarTabela(dados);

  } catch (erro) {
    console.error('Erro de conexão:', erro);
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

  // Lendo da linha 6 (índice 5) até a linha 19 (índice 18) da sua planilha
  for (let i = 5; i <= 18; i++) {
    if (!linhas[i]) continue;

    // Separador inteligente: divide por vírgula, mas respeita o que está dentro das aspas das notas
    const colunas = [];
    let dentroDeAspas = false;
    let colunaAtual = '';

    for (let char of linhas[i]) {
      if (char === '"') {
        dentroDeAspas = !dentroDeAspas; // Inverte o estado ao achar aspas
      } else if (char === ',' && !dentroDeAspas) {
        colunas.push(colunaAtual.trim());
        colunaAtual = '';
      } else {
        colunaAtual += char;
      }
    }
    colunas.push(colunaAtual.trim());

    if (colunas.length < 4) continue;

    const disciplina = colunas[0];
    if (!disciplina || disciplina.includes("TOTAL GERAL")) continue;

    listaDisciplinas.push({
      disciplina: disciplina,
      tri1: colunas[1],
      tri2: colunas[2],
      tri3: colunas[3]
    });
  }
  return listaDisciplinas;
}

function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "" || valor === "-") {
    return null;
  }
  // Remove aspas residuais e converte a vírgula brasileira em ponto decimal
  let limpo = valor.replace(/"/g, '').replace(",", ".");
  let numero = parseFloat(limpo);
  
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

    const mapNotas = [n1, n2, n3].filter(n => n !== null);
    const media = mapNotas.length > 0 ? (mapNotas.reduce((a, b) => a + b, 0) / mapNotas.length) : null;
    
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
      <td>0</td>
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
    const mapNotas = [n1, n2, n3].filter(n => n !== null);
    
    if (mapNotas.length > 0) {
      somaMedias += (mapNotas.reduce((a, b) => a + b, 0) / mapNotas.length);
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
