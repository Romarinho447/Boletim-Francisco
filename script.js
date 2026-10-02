/* =========================================================
   BOLETIM DIGITAL MULTIDIRECIONAL — script.js
   Puxa dados do Sheets e envia digitações de volta em tempo real
   ========================================================= */

// URL de LEITURA (O link CSV que você gerou na publicação da web)
const URL_LEITURA = 'https://google.com';

// URL de ESCRITA (Cole aqui o link que você copiou lá no Passo 1 do Apps Script)
const URL_ESCRITA_APPS_SCRIPT = 'COLE_AQUI_O_URL_DO_SEU_APPS_SCRIPT';

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
    
    // Divisor inteligente de colunas que ignora vírgulas dentro de aspas
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
    const estiloInput = `background: #2a2e35; border: 1px solid #3a3f47; color: #e6e8eb; width: 60px; text-align: center; border-radius: 4px; padding: 4px; font-size: 0.9rem;`;

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

  // Escuta as digitações para recalcular o site e salvar na planilha
  corpoTabela.addEventListener('change', async (evento) => {
    if (evento.target.classList.contains('input-nota')) {
      const disciplina = evento.target.getAttribute('data-disciplina');
      const campo = evento.target.getAttribute('data-campo');
      const valor = evento.target.value;

      const linhaElemento = evento.target.closest('tr');
      const n1 = linhaElemento.querySelectorAll('.input-nota')[0].value;
      const n2 = linhaElemento.querySelectorAll('.input-nota')[1].value;
      const n3 = linhaElemento.querySelectorAll('.input-nota')[2].value;

      atualizarLinha(linhaElemento, n1, n2, n3);
      atualizarCardsResumo();

      // Envia a nova nota de forma assíncrona para a planilha do Google
      try {
        evento.target.style.borderColor = '#d9a441'; // Fica amarelo indicando "salvando..."
        await fetch(URL_ESCRITA_APPS_SCRIPT, {
          method: 'POST',
          mode: 'no-cors', // Evita problemas de segurança entre domínios
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disciplina, campo, valor })
        });
        evento.target.style.borderColor = '#4caf7d'; // Fica verde indicando "salvo no Sheets!"
      } catch (e) {
        console.error("Erro ao salvar no Sheets:", e);
        evento.target.style.borderColor = '#ff4a4a'; // Fica vermelho se falhar
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
    const mediaTexto = linha.querySelector('.col-media').textContent;
    if (mediaTexto !== "-") {
      somaMedias += parseFloat(mediaTexto);
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
      <div class="valor">${linhas.length}</div>
    </div>
    <div class="card">
      <div class="rotulo">Ano Letivo</div>
      <div class="valor" style="font-size: 1.2rem; padding-top: 5px;">8º Ano</div>
    </div>
  `;
}
