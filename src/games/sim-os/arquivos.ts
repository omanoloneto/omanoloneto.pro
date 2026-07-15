// Sistema de arquivos virtual — SÓ memória, nada persiste (decisão de
// projeto: recarregar a página = computador novo). Seeds vêm dos dados
// e são protegidos; notas do aluno nascem aqui e podem ir pra Lixeira.
import type { Arquivo, Arquivos, Contexto, EventoArquivos } from './tipos';

export function criarArquivos(ctx: Contexto): Arquivos {
  const itens: Arquivo[] = ctx.dados.arquivosSeed.map((s) => ({
    id: s.id,
    nome: s.nome,
    icone: s.icone,
    origem: 'fabrica',
    janela: s.janela,
    abrirCom: s.abrirCom,
    texto: s.texto,
    naLixeira: false,
  }));
  let seq = 0;
  const assinantes = new Set<(ev: EventoArquivos) => void>();

  function emitir(ev: EventoArquivos) {
    assinantes.forEach((fn) => fn(ev));
  }

  function obter(id: string): Arquivo | null {
    return itens.find((a) => a.id === id) || null;
  }

  function criarNota(nome: string, texto: string): Arquivo {
    const arq: Arquivo = {
      id: 'nota-' + ++seq,
      nome,
      icone: 'txt',
      origem: 'aluno',
      abrirCom: 'bloco-de-notas',
      texto,
      naLixeira: false,
    };
    itens.push(arq);
    emitir({ tipo: 'criado', arquivo: arq });
    return arq;
  }

  function salvarNota(id: string, texto: string): boolean {
    const arq = obter(id);
    if (!arq || arq.naLixeira || arq.origem !== 'aluno') return false;
    arq.texto = texto;
    emitir({ tipo: 'alterado', arquivo: arq });
    return true;
  }

  function excluir(id: string): boolean {
    const arq = obter(id);
    if (!arq || arq.origem === 'fabrica' || arq.naLixeira) return false;
    arq.naLixeira = true;
    emitir({ tipo: 'excluido', arquivo: arq });
    return true;
  }

  function restaurar(id: string): boolean {
    const arq = obter(id);
    if (!arq || !arq.naLixeira) return false;
    arq.naLixeira = false;
    emitir({ tipo: 'restaurado', arquivo: arq });
    return true;
  }

  function esvaziar() {
    for (let i = itens.length - 1; i >= 0; i--) {
      if (itens[i].naLixeira) itens.splice(i, 1);
    }
    emitir({ tipo: 'esvaziada' });
  }

  function nomeLivre(nome: string): string {
    const existe = (n: string) => itens.some((a) => a.nome.toLowerCase() === n.toLowerCase());
    if (!existe(nome)) return nome;
    const ponto = nome.lastIndexOf('.');
    const base = ponto > 0 ? nome.slice(0, ponto) : nome;
    const ext = ponto > 0 ? nome.slice(ponto) : '';
    for (let n = 2; ; n++) {
      const tentativa = base + ' (' + n + ')' + ext;
      if (!existe(tentativa)) return tentativa;
    }
  }

  return {
    listar: () => itens.filter((a) => !a.naLixeira),
    naLixeira: () => itens.filter((a) => a.naLixeira),
    obter,
    criarNota,
    salvarNota,
    excluir,
    restaurar,
    esvaziar,
    nomeLivre,
    assinar(fn) {
      assinantes.add(fn);
      return () => assinantes.delete(fn);
    },
  };
}
