# Anotações para o relatório

Pontos observados nos resultados oficiais que vale discutir no relatório. Os números vêm da execução oficial (`runOfficial()`; gerador pure-rand 8.4.2, xoroshiro128plus).

## E5: o RTP observado da tabela +10% ficou bem acima do teórico

- Com a tabela +10%, o RTP observado foi **97,29%**, contra **92,4%** na teoria. Na tabela base foram **88,45%** observados contra **84%** teóricos.
- **Causa:** a sequência da semente 2026 teve **88 prêmios E–E–E**, quando o esperado seria 10.000 × 1/125 = **80**. O E–E–E é o maior prêmio (50 na base, 55 na +10%) e responde pela maior contribuição para E[P]. Por isso, alguns acertos a mais puxam o RTP observado para cima nas duas tabelas.
- As duas tabelas foram avaliadas sobre os **mesmos sorteios**. Por isso, o RTP observado da +10% é exatamente 1,10 × o da base (0,8845 × 1,10 = 0,97295), e a frequência de prêmio é igual nas duas (4,18%).
- Mesmo assim, o **lucro médio continuou negativo** (−0,0271 por rodada na +10%), e o lucro esperado teórico é −0,076.
- **Uso na discussão:** "pagar mais" (prêmios maiores), "pagar com maior frequência" (a chance segue em 4%) e "ter lucro esperado positivo" são afirmações diferentes. Uma amostra favorável não muda a esperança, e não devemos trocar de semente para "corrigir" o resultado.

## E3: a mediana dos saldos finais é 0, e a média é 34,55

- Dos 100 participantes (saldo inicial de 100, até 500 rodadas, semente 42), **13% terminaram com ganho**, 0% empataram e **87% terminaram com perda**. **67% esgotaram o saldo**, o que corresponde a 77% das perdas.
- O **saldo final mediano é 0**, porque mais da metade dos participantes chegou a zero. A **média é 34,55** porque poucos vencedores, com saldos altos, puxam a média para cima.
- **Uso na discussão:** essa é a assimetria que um relato isolado de sucesso esconde. Os ganhadores existem e aparecem, mas o participante típico (a mediana) perdeu tudo. A média, sozinha, também engana, porque não mostra quantos chegaram a zero.
- **Limites:** a taxa de esgotamento descreve **este modelo, este saldo e este horizonte**. Ela não estima a situação de famílias brasileiras. Como a duração das sessões variou (média de 314,55 rodadas, mediana de 280), 100 − 500 × 0,16 = 20 não serve como referência automática para a média final.
