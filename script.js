// ====== DADOS FICTÍCIOS PADRONIZADOS (8º ANO) ======
// Guardamos todas as 15 disciplinas em um Array de Objetos.
const dadosBoletim = [
  { disciplina: "Língua Portuguesa", tri1: 82, tri2: "7,8", tri3: 85, faltas: [2, 1, 1] },
  { disciplina: "Matemática", tri1: 52, tri2: "5,8", tri3: null, faltas: [3, 2, 1] },
  { disciplina: "Ciências", tri1: "8,1", tri2: 76, tri3: 8.0, faltas: [1, 2, 0] },
  { disciplina: "História", tri1: 7.0, tri2: 84, tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Geografia", tri1: 68, tri2: 7.3, tri3: "7,9", faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 86, tri2: "8,1", tri3: 8.7, faltas: [1, 0, 0] },
  { disciplina: "Arte", tri1: 9.0, tri2: 92, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 95, tri2: 9.0, tri3: "9,4", faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 88, tri2: 9.1, tri3: 93, faltas: [1, 0, 1] },
  { disciplina: "Educação Financeira", tri1: 74, tri2: "7,8", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Estudo Orientado", tri1: 8.0, tri2: 83, tri3: "8,5", faltas: [0, 1, 0] },
  { disciplina: "Redação e Leitura", tri1: 62, tri2: "6,8", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 48, tri2: 5.6, tri3: "6,0", faltas: [2, 2, 1] },
  { disciplina: "Literatura Arte e Movimento", tri1: "7,7", tri2: 80, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Práticas Experimentais", tri1: 58, tri2: "6,2", tri3: 6.4, faltas: [1, 1, 1] }
];

// ====== FUNÇÃO DE NORMALIZAÇÃO DE NOTAS ======
// Converte qualquer formato (ex: 82, "7,8", 8.5) para a escala de 0 a 10.
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Converte vírgula para ponto se for string e transforma em número
  let nota = Number(String(valor).replace(",", "."));

  // Se não for um número válido, retorna null
  if (isNaN(nota)) {
    return null;
  }

  // Se a nota estiver entre 0 e 10, mantém
  if (nota >= 0 && nota <= 10) {
    return nota;
  }

  // Se estiver entre 10 e 100 (ex: 82 ou 100), divide por 10
  if (nota > 10 && nota <= 100) {
    return nota / 10;
  }

  // Qualquer valor fora dessas regras é inválido
  return null;
}

// ====== CÁLCULOS ======
// Calcula a média ignorando notas não lançadas (null)
function calcularMedia(notasValidas) {
  if (notasValidas.length === 0) return null;
  const soma = notasValidas.reduce((total, nota) => total + nota, 0);
  return soma / notasValidas.length;
}

// Formatador para exibição na tela (ex: 8.2 vira "8,2")
function formatarExibicao(nota) {
  if (nota === null) return "—";
  return nota.toFixed(1).replace(".", ",");
}

// ====== EXIBIÇÃO NA TELA (DOM) ======
function carregarBoletim() {
  const corpoTabela = document.getElementById("corpo-tabela");
  
  let somaMediasGerais = 0;
  let qtdDisciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let disciplinasBomDesempenho = 0;
  let disciplinasAtencao = 0;

  // Limpa a tabela antes de preencher
  corpoTabela.innerHTML = "";

  // forEach: Passa por cada uma das 15 disciplinas do array
  dadosBoletim.forEach((item) => {
    // Normaliza as notas dos 3 trimestres
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    // Filtra apenas as notas válidas para calcular a média
    const notasDisponiveis = [n1, n2, n3].filter((n) => n !== null);
    const media = calcularMedia(notasDisponiveis);

    // Soma as faltas dos 3 trimestres
    const totalFaltasDisciplina = item.faltas.reduce((a, b) => a + b, 0);
    totalFaltasGeral += totalFaltasDisciplina;

    // Define a situação da matéria
    let situacao = "Nota ainda não disponível";
    if (media !== null) {
      if (media >= 6.0) {
        situacao = "Bom desempenho";
        disciplinasBomDesempenho++;
      } else {
        situacao = "Atenção";
        disciplinasAtencao++;
      }
      somaMediasGerais += media;
      qtdDisciplinasComMedia++;
    }

    // Cria a linha da tabela dinamicamente usando DOM
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.disciplina}</td>
      <td>${formatarExibicao(n1)}</td>
      <td>${formatarExibicao(n2)}</td>
      <td>${formatarExibicao(n3)}</td>
      <td>${formatarExibicao(media)}</td>
      <td>${totalFaltasDisciplina}</td>
      <td>${situacao}</td>
    `;
    corpoTabela.appendChild(tr);
  });

  // Atualiza os Cards de Resumo na página (se os IDs existirem no seu HTML)
  const mediaGeral = qtdDisciplinasComMedia > 0 ? somaMediasGerais / qtdDisciplinasComMedia : null;

  if (document.getElementById("card-media-geral")) {
    document.getElementById("card-media-geral").textContent = formatarExibicao(mediaGeral);
  }
  if (document.getElementById("card-total-faltas")) {
    document.getElementById("card-total-faltas").textContent = totalFaltasGeral;
  }
  if (document.getElementById("card-bom-desempenho")) {
    document.getElementById("card-bom-desempenho").textContent = disciplinasBomDesempenho;
  }
  if (document.getElementById("card-atencao")) {
    document.getElementById("card-atencao").textContent = disciplinasAtencao;
  }
  if (document.getElementById("card-frequencia")) {
    // NOTA: A frequência de 92% é apenas demonstrativa para esta etapa.
    document.getElementById("card-frequencia").textContent = "92% (Frequência adequada)";
  }
}

// Executa a função assim que a página carrega
window.addEventListener("DOMContentLoaded", carregarBoletim);