/* =========================================================
   BOLETIM DIGITAL MULTIDIRECIONAL — script.js (CORRIGIDO)
   Puxa dados do Sheets e envia digitações de volta em tempo real
   ========================================================= */

// URL de LEITURA (O link CSV que você gerou na publicação da web)
const URL_LEITURA = 'https://google.com';

// URL de ESCRITA (Substitua pelo link gerado na implantação do seu Apps Script)
const URL_ESCRITA_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbzBIISfkzxOF_2YlmE3NRlVoX0ow-hx8Ej6qqSiM3qvBrMhfqf94gs-qnftKIFceeAu/exec';

const MEDIA_MINIMA = 6.0;

window.addEventListener('DOMContentLoaded', carregarDadosIniciais);

async function carregarDadosIniciais() {
  try {
    const resposta = await fetch(URL_LEITURA);
    const textoCSV = await resposta.text();
    const dados = processarCSV(textoCSV);

    renderizarInterface(dados);
  } catch (erro) {
    console.error('Erro ao carregar dados:', erro);
    document.getElementById('corpo-tabela').innerHTML = `
      <tr><td colspan="7" style="color:#d9a441; text-align:center; padding:20px;">Erro de conexão com a planilha.</td></tr>
    `;
  }
}

function processarCSV(texto) {
  const linhas = texto.split(/\r?\n/);
  const listaDisciplinas = [];

  for (let i = 5; i <= 18; i++) {
    if (!linhas[i]) continue;
    
    const colunas = [];
    let dentroDeAspas = false;
    let colunaAtual = '';
    for (let char of linhas[i]) {
      if (char === '"') dentroDeAspas = !dentroDeAspas;
      else if (char === ',' && !dentroDeAspas) { colunas.push(colunaAtual.trim()); colunaAtual = ''; }
      else colunaAtual += char;
    }
    colunas.push(colunaAtual.trim());

    if (colunas.length < 4) continue;
    const disciplina = colunas[0].replace(/"/g, '');
    if (!disciplina || disciplina.includes("TOTAL GERAL")) continue;

    listaDisciplinas.push({
      disciplina: disciplina,
      tri1: colunas[1].replace(/"/g, ''),
      tri2: colunas[2].replace(/"/g, ''),
      tri3: colunas[3].replace(/"/g, '')
    });
  }
  return listaDisciplinas;
}

function normalizarNota(valor) {
  if (!valor || valor === "-") return null;
  let numero = parseFloat(String(valor).replace(",", "."));
  return isNaN(numero) ? null : numero;
}

function renderizarInterface(dados) {
  const corpoTabela = document.getElementById('corpo-tabela');
  corpoTabela.innerHTML = '';

  dados.forEach((item, index) => {
    const tr = document.createElement('tr');
    const estiloInput = `background: #2a2e35; border: 1px solid #3a3f47; color: #e6e8eb; width: 60px; text-align: center; border-radius: 4px; padding: 4px; font-size: 0.9rem; transition: border-color 0.3s;`;

    tr.innerHTML = `
      <td style="font-weight: bold; text-align: left;">${item.disciplina}</td>
      <td><input type="text" class="input-nota" data-disciplina="${item.disciplina}" data-campo="tri1" value="${item.tri1}" style="${estiloInput}"></td>
      <td><input type="text" class="input-nota" data-disciplina="${item.disciplina}" data-campo="tri2" value="${item.tri2}" style="${estiloInput}"></td>
      <td><input type="text" class="input-nota" data-disciplina="${item.disciplina}" data-campo="tri3" value="${item.tri3}" style="${estiloInput}"></td>
      <td class="col-media" style="font-weight: bold;">-</td>
      <td><input type="number" value="0" style="${estiloInput} width: 50px;" disabled></td>
      <td class="col-situacao">-</td>
    `;

    corpoTabela.appendChild(tr);
    atualizarLinha(tr, item.tri1, item.tri2, item.tri3);
  });

  atualizarCardsResumo();

  // Escuta o evento 'change' (quando o usuário digita e clica fora da caixinha)
  corpoTabela.addEventListener('change', async (evento) => {
    if (evento.target.classList.contains('input-nota')) {
      const disciplina = evento.target.getAttribute('data-disciplina');
      const campo = evento.target.getAttribute('data-campo');
      const valor = evento.target.value;

      const linhaElemento = evento.target.closest('tr');
      const inputs = linhaElemento.querySelectorAll('.input-nota');
      
      // CORREÇÃO AQUI: Lendo os índices corretos do array de inputs
      const n1 = inputs[0].value;
      const n2 = inputs[1].value;
      const n3 = inputs[2].value;

      atualizarLinha(linhaElemento, n1, n2, n3);
      atualizarCardsResumo();

      // Envia a nova nota para o Google Sheets
      try {
        evento.target.style.borderColor = '#d9a441'; // Borda amarela: salvando...
        
        // CORREÇÃO AQUI: Enviando como text/plain evita bloqueios de CORS do Google
        await fetch(URL_ESCRITA_APPS_SCRIPT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ disciplina, campo, valor })
        });
        
        evento.target.style.borderColor = '#4caf7d'; // Borda verde: sucesso!
      } catch (e) {
        console.error("Erro ao salvar no Sheets:", e);
        evento.target.style.borderColor = '#ff4a4a'; // Borda vermelha: erro!
      }
    }
  });
}

function atualizarLinha(linhaElemento, tri1, tri2, tri3) {
  const n1 = normalizarNota(tri1);
  const n2 = normalizarNota(tri2);
  const n3 = normalizarNota(tri3);

  const notasValidas = [n1, n2, n3].filter(n => n !== null);
  const media = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length) : null;

  const celulaMedia = linhaElemento.querySelector('.col-media');
  const celulaSituacao = linhaElemento.querySelector('.col-situacao');

  if (media !== null) {
    celulaMedia.textContent = media.toFixed(1);
    if (media >= MEDIA_MINIMA) {
      celulaSituacao.textContent = "Aprovado";
      celulaSituacao.className = "col-situacao situacao-bom";
    } else {
      celulaSituacao.textContent = "Atenção";
      celulaSituacao.className = "col-situacao situacao-atencao";
    }
  } else {
    celulaMedia.textContent = "-";
    celulaSituacao.textContent = "Em andamento";
    celulaSituacao.className = "col-situacao situacao-neutra";
  }
}

function atualizarCardsResumo() {
  const containerCards = document.getElementById('cards');
  const linhas = document.querySelectorAll('#corpo-tabela tr');
  
  let somaMedias = 0;
  let contagemMedias = 0;

  linhas.forEach(linha => {
    const mediaCelula = linha.querySelector('.col-media');
    if (mediaCelula) {
      const mediaTexto = mediaCelula.textContent;
      if (mediaTexto !== "-") {
        somaMedias += parseFloat(mediaTexto);
        contagemMedias++;
      }
    }
  });

  const mediaGeral = contagemMedias > 0 ? (somaMedias / contagemMedias) : 0;

  if (containerCards) {
    containerCards.innerHTML = `
      <div class="card">
        <div class="rotulo">Média Geral</div>
        <div class="valor">${mediaGeral.toFixed(1)}</div>
      </div>
      <div class="card">
        <div class="rotulo">Disciplinas</div>
        <div class="valor">${linhas.length}</div>
      </div>
      <div class="card">
        <div class="rotulo">Ano Letivo</div>
        <div class="valor" style="font-size: 1.2rem; padding-top: 5px;">8º Ano</div>
      </div>
    `;
  }
}
