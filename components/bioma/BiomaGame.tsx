'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { LiveRoundView, Meta, SessionState, Sym, Triple } from '@/lib/types';
import s from './bioma.module.css';
import { useSounds } from './useSounds';

/** Cada símbolo do modelo (A–E) é exibido como um animal. */
const ANIMALS: Record<Sym, { name: string; plural: string; img: string }> = {
  A: { name: 'Abelha', plural: 'abelhas', img: '/bioma/abelha.png' },
  B: { name: 'Porco', plural: 'porcos', img: '/bioma/porco.png' },
  C: { name: 'Sapo', plural: 'sapos', img: '/bioma/sapo.png' },
  D: { name: 'Panda', plural: 'pandas', img: '/bioma/panda.png' },
  E: { name: 'Camelo', plural: 'camelos', img: '/bioma/camelo.png' },
};
const REEL: Sym[] = ['A', 'B', 'C', 'D', 'E'];

/** Colunas exibidas antes do primeiro giro (topo, centro, base), só para a tela não começar vazia. */
const INITIAL_COLUMNS: Triple[] = [
  ['A', 'B', 'C'],
  ['E', 'A', 'B'],
  ['B', 'C', 'D'],
];

const MIN_SPIN_MS = 1400;
const REEL_STOP_GAP_MS = 320;
const TICK_MS = 85;

/** Rastros de movimento do frame "Girando" (posição horizontal em %, topo e altura em px). */
const TRAILS = [
  { left: '10%', top: 52, height: 132 },
  { left: '30%', top: 50, height: 110 },
  { left: '74%', top: 62, height: 162 },
  { left: '85%', top: 34, height: 114 },
];

/** Confetes do frame "Vitória" (posição em % do visor). */
const CONFETTI = [
  { left: '2%', top: 10, w: 10, h: 7, rot: 0, gold: true },
  { left: '7.7%', top: 41, w: 7, h: 14, rot: 17, gold: false },
  { left: '19.4%', top: 72, w: 10, h: 7, rot: 34, gold: true },
  { left: '28.4%', top: 103, w: 7, h: 14, rot: 51, gold: false },
  { left: '40.2%', top: 134, w: 10, h: 7, rot: 68, gold: true },
  { left: '52.3%', top: 165, w: 7, h: 14, rot: 85, gold: false },
  { left: '67%', top: 196, w: 10, h: 7, rot: 12, gold: true },
  { left: '79.6%', top: 227, w: 7, h: 14, rot: 29, gold: false },
  { left: '91.2%', top: 13, w: 10, h: 7, rot: 46, gold: true },
];

type Phase = 'idle' | 'spinning' | 'win' | 'lose';

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const windowAt = (k: number): Triple => [REEL[k % 5]!, REEL[(k + 1) % 5]!, REEL[(k + 2) % 5]!];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BiomaGame() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<LiveRoundView | null>(null);
  const [columns, setColumns] = useState<Triple[]>(INITIAL_COLUMNS);
  const [stopped, setStopped] = useState([true, true, true]);
  const [betIndex, setBetIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const help = useRef<HTMLDialogElement>(null);
  const ticker = useRef(0);

  const spinning = phase === 'spinning';
  const { effect } = useSounds(soundOn, spinning);

  const bets = meta?.arcade.bets ?? [10];
  const bet = bets[betIndex] ?? bets[0]!;
  const multipliers = meta ? meta.rules.paytables[meta.arcade.table] : null;

  const newSession = useCallback(async (m: Meta) => {
    setError(null);
    try {
      setSession(await api.createSession({ table: m.arcade.table, initialBalance: m.arcade.initialBalance }));
      setPhase('idle');
      setRound(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    api.meta().then(
      (m) => {
        setMeta(m);
        setBetIndex(Math.max(0, m.arcade.bets.indexOf(m.arcade.defaultBet)));
        void newSession(m);
      },
      (e: Error) => setError(e.message),
    );
  }, [newSession]);

  // Enquanto gira, cada rolo ainda em movimento troca de animal a cada TICK_MS.
  useEffect(() => {
    if (!spinning) return;
    const id = window.setInterval(() => {
      ticker.current++;
      setColumns((cols) => cols.map((c, i) => (stopped[i] ? c : windowAt(ticker.current + i * 2))));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [spinning, stopped]);

  async function spin() {
    if (!session || spinning) return;
    setError(null);
    setPhase('spinning');
    setStopped([false, false, false]);
    const started = Date.now();
    try {
      const res = await api.spin(session.id, 1, bet);
      const r = res.rounds[0]!;
      await sleep(Math.max(0, MIN_SPIN_MS - (Date.now() - started)));
      // Os rolos param um de cada vez, da esquerda para a direita, no resultado sorteado pela API.
      for (let i = 0; i < 3; i++) {
        setColumns((cols) => cols.map((c, j) => (j === i ? r.columns[i]! : c)));
        setStopped((st) => st.map((v, j) => (j === i ? true : v)));
        if (i < 2) await sleep(REEL_STOP_GAP_MS);
      }
      setRound(r);
      setSession(res.state);
      const won = r.prize > 0;
      setPhase(won ? 'win' : 'lose');
      effect(won ? 'premio' : 'semPremio');
    } catch (e) {
      setStopped([true, true, true]);
      setPhase(round ? (round.prize > 0 ? 'win' : 'lose') : 'idle');
      setError((e as Error).message);
    }
  }

  const balance = session ? (spinning ? session.balance - bet : session.balance) : null;
  const broke = !!session && !spinning && session.balance < Math.min(...bets);
  const cantAfford = !!session && !spinning && !broke && session.balance < bet;
  const win = phase === 'win' && round;
  const winSym = win ? round.center[0] : null;
  const maxMult = multipliers ? Math.max(...Object.values(multipliers)) : 0;

  const statusLabel = { idle: 'PRONTO PARA JOGAR', spinning: 'GIRO EM ANDAMENTO', win: 'COMBINAÇÃO VENCEDORA', lose: 'GIRO CONCLUÍDO' }[phase];

  return (
    <div className={s.page}>
      <div className={s.backdrop} aria-hidden="true" />

      <header className={s.nav}>
        <div className={s.brand}>
          <div className={s.emblem}>
            <img src="/bioma/gem-marca.svg" alt="" width={22} height={22} />
          </div>
          <span className={`${s.pixel} ${s.brandName}`}>BIOMA ARCADE</span>
          <span className={s.sep} />
          <span className={s.mode}>MODO DEMONSTRAÇÃO</span>
        </div>
        <div className={s.prefs}>
          <button
            type="button"
            className={`${s.pref} ${soundOn ? '' : s.prefOff}`}
            onClick={() => setSoundOn((v) => !v)}
            aria-pressed={soundOn}
          >
            <img src="/bioma/volume-2.svg" alt="" width={20} height={20} />
            <span className={s.prefLabel}>{soundOn ? 'Som ligado' : 'Som desligado'}</span>
          </button>
          <button type="button" className={s.pref} onClick={() => help.current?.showModal()}>
            <img src="/bioma/circle-help.svg" alt="" width={20} height={20} />
            <span className={s.prefLabel}>Como jogar</span>
          </button>
        </div>
      </header>

      <main className={s.area}>
        <section className={s.intro}>
          <div className={s.introText}>
            <span className={s.kicker}>FLORESTA NOTURNA / CAÇA-NÍQUEIS</span>
            <h1 className={`${s.pixel} ${s.title}`}>BIOMA DA SORTE</h1>
            <span className={s.tagline}>Encontre seu trio. A floresta guarda boas surpresas.</span>
          </div>
          <div className={s.rule}>
            <span className={s.ruleMain}>3 ROLOS · {REEL.length} ANIMAIS · 1 LINHA</span>
            <span className={s.ruleSub}>Só três iguais dão prêmio.</span>
          </div>
        </section>

        <div className={s.game}>
          <section className={`${s.machine} ${win ? s.machineWin : ''}`} aria-label="Máquina de três rolos">
            <div className={s.machineHead}>
              <div className={s.machineId}>
                <span className={s.light} />
                CLAREIRA DA SORTE
              </div>
              <span className={s.status}>{statusLabel}</span>
            </div>

            <div className={s.visor}>
              {columns.map((col, i) => {
                const moving = spinning && !stopped[i];
                return (
                  <div
                    key={i}
                    className={`${s.reel} ${moving ? s.reelSpinning : ''} ${spinning && stopped[i] ? s.reelStopped : ''}`}
                    role="img"
                    aria-label={moving ? `Rolo ${i + 1} girando` : `Rolo ${i + 1}: ${ANIMALS[col[1]].name}`}
                  >
                    <div className={s.strip}>
                      <img className={s.side} src={ANIMALS[col[0]].img} alt="" />
                      <img className={s.main} src={ANIMALS[col[1]].img} alt="" />
                      <img className={s.side} src={ANIMALS[col[2]].img} alt="" />
                    </div>
                    <div className={s.shade} />
                    <div className={s.shadeBottom} />
                    {moving &&
                      TRAILS.map((t) => (
                        <span key={t.left} className={s.trail} style={{ left: t.left, top: t.top, height: t.height }} />
                      ))}
                    {!moving && <span className={s.animalName}>{ANIMALS[col[1]].name.toUpperCase()}</span>}
                  </div>
                );
              })}
              <div className={s.payline} />
              <span className={`${s.indicator} ${s.indicatorLeft}`}>
                <img src={win ? '/bioma/indicador-esq-vitoria.svg' : '/bioma/indicador-esq.svg'} alt="" width={15.5885} height={13.5} />
              </span>
              <span className={`${s.indicator} ${s.indicatorRight}`}>
                <img src={win ? '/bioma/indicador-dir-vitoria.svg' : '/bioma/indicador-dir.svg'} alt="" width={15.5885} height={13.5} />
              </span>
              {win &&
                CONFETTI.map((c, i) => (
                  <span
                    key={i}
                    className={s.confetti}
                    style={{
                      left: c.left,
                      top: c.top,
                      width: c.w,
                      height: c.h,
                      background: c.gold ? '#f2d47f' : '#66e39d',
                      transform: `rotate(${c.rot}deg)`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                ))}
            </div>

            <Feedback phase={phase} round={round} bet={bet} error={error} multipliers={multipliers} />

            <div className={s.controls}>
              <div className={s.credits}>
                <span className={s.label}>SEU SALDO</span>
                <div className={s.amount}>
                  <img src="/bioma/gem-saldo.svg" alt="" width={18} height={18} />
                  <span className={s.amountValue}>{balance === null ? '—' : fmt(balance)}</span>
                  <span className={s.unit}>CR</span>
                </div>
              </div>
              <span className={s.vsep} />
              <div className={`${s.bet} ${spinning ? s.betDisabled : ''}`}>
                <span className={s.label} id="bet-label">
                  APOSTA POR GIRO
                </span>
                <div className={s.selector} role="group" aria-labelledby="bet-label">
                  <button
                    type="button"
                    className={s.stepper}
                    onClick={() => setBetIndex((i) => Math.max(0, i - 1))}
                    disabled={spinning || betIndex === 0}
                    aria-label="Diminuir aposta"
                  >
                    <img src="/bioma/minus.svg" alt="" width={14} height={14} />
                  </button>
                  <span aria-live="polite">
                    <span className={s.betValue}>{bet}</span> <span className={s.unit}>CR</span>
                  </span>
                  <button
                    type="button"
                    className={s.stepper}
                    onClick={() => setBetIndex((i) => Math.min(bets.length - 1, i + 1))}
                    disabled={spinning || betIndex >= bets.length - 1}
                    aria-label="Aumentar aposta"
                  >
                    <img src="/bioma/plus.svg" alt="" width={14} height={14} />
                  </button>
                </div>
              </div>
              <div className={s.lastPrize}>
                <span className={s.label}>PRÊMIO DO GIRO</span>
                <span className={`${s.lastPrizeValue} ${win ? s.lastPrizeWin : ''}`}>
                  {phase === 'win' || phase === 'lose' ? `${fmt(round?.prize ?? 0)} CR` : '—'}
                </span>
              </div>
              <SpinButton
                spinning={spinning}
                played={!!round}
                bet={bet}
                broke={broke}
                cantAfford={cantAfford}
                disabled={!session}
                onSpin={spin}
                onRestart={() => meta && void newSession(meta)}
                initialBalance={meta?.arcade.initialBalance ?? 0}
              />
            </div>
          </section>

          <aside className={s.rewards} aria-label="Recompensas">
            <div className={`${s.pixel} ${s.rewardsHead}`}>
              RECOMPENSAS
              <img src="/bioma/trophy-painel.svg" alt="" width={20} height={20} />
            </div>
            <p className={s.rewardsText}>3 animais iguais na linha central. O multiplicador vale sobre a aposta.</p>
            <ul className={s.rewardList}>
              {multipliers &&
                REEL.map((sym) => (
                  <li key={sym} className={`${s.reward} ${winSym === sym ? s.rewardHit : ''}`}>
                    <img className={s.rewardImg} src={ANIMALS[sym].img} alt="" />
                    <span className={s.rewardName}>
                      {ANIMALS[sym].name}
                      <small>3 iguais</small>
                    </span>
                    <span className={s.mult}>{fmt(multipliers[sym])}×</span>
                  </li>
                ))}
            </ul>
            <div className={s.maxPrize}>
              <img src="/bioma/gem-premio.svg" alt="" width={23} height={23} />
              <div>
                <span className={s.label} style={{ fontWeight: 600 }}>
                  PRÊMIO COM APOSTA ATUAL
                </span>
                <span className={s.maxPrizeValue}>Até {fmt(maxMult * bet)} créditos</span>
              </div>
            </div>
          </aside>
        </div>

        <section className={s.guide} aria-label="Guia rápido">
          {[
            ['01', 'Escolha a aposta', 'Ajuste os créditos antes de girar.'],
            ['02', 'Gire os três rolos', 'Cada giro usa a aposta selecionada.'],
            ['03', 'Combine três iguais', 'Apenas a linha central vale prêmio.'],
          ].map(([n, t, d]) => (
            <div key={n} className={s.step}>
              <span className={`${s.pixel} ${s.stepNum}`}>{n}</span>
              <div>
                <strong>{t}</strong>
                <span>{d}</span>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className={s.footer}>
        <div>
          <img src="/bioma/info.svg" alt="" width={14} height={14} />
          Créditos fictícios. Sem depósitos, saques ou valor monetário.
        </div>
        <span>Conceito de fã · Não oficial Minecraft</span>
      </footer>

      <dialog ref={help} className={s.dialog} aria-labelledby="help-title">
        <h2 id="help-title" className={s.pixel}>
          COMO JOGAR
        </h2>
        <ol>
          <li>
            <strong>Escolha a aposta</strong> com os botões − e +.
          </li>
          <li>
            <strong>Gire os três rolos.</strong> Cada giro desconta a aposta do saldo.
          </li>
          <li>
            <strong>Três animais iguais na linha central</strong> pagam a aposta multiplicada pelo valor do animal. Qualquer
            outra combinação não paga.
          </li>
        </ol>
        <form method="dialog">
          <button className={s.dialogClose}>Fechar</button>
        </form>
      </dialog>
    </div>
  );
}

function Feedback({
  phase,
  round,
  bet,
  error,
  multipliers,
}: {
  phase: Phase;
  round: LiveRoundView | null;
  bet: number;
  error: string | null;
  multipliers: Record<Sym, number> | null;
}) {
  if (error) {
    return (
      <div className={s.feedback} role="alert">
        <img src="/bioma/rotate-ccw.svg" alt="" width={28} height={28} />
        <div className={s.feedbackText}>
          <span className={s.feedbackTitle}>Não foi possível girar.</span>
          <span className={s.feedbackSub}>{error}</span>
        </div>
      </div>
    );
  }
  if (phase === 'spinning') {
    return (
      <div className={s.feedback} aria-live="polite">
        <img className={s.spin} src="/bioma/loader-feedback.svg" alt="" width={28} height={28} />
        <div className={s.feedbackText}>
          <span className={s.feedbackTitle}>Os animais estão a caminho…</span>
          <span className={s.feedbackSub}>
            Giro em andamento. {fmt(bet)} créditos usados — aguarde o resultado para jogar de novo.
          </span>
        </div>
        <div className={s.pulses} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }
  if (phase === 'win' && round) {
    const sym = round.center[0];
    const a = ANIMALS[sym];
    return (
      <div className={`${s.feedback} ${s.feedbackWin}`} aria-live="polite">
        <img src="/bioma/trophy-vitoria.svg" alt="" width={28} height={28} />
        <div className={s.feedbackText}>
          <span className={`${s.pixel} ${s.feedbackTitleWin}`}>TRIO DE {a.plural.toUpperCase()}!</span>
          <span className={s.feedbackSub}>
            3 {a.plural} na linha central · Aposta de {fmt(round.bet)} CR × {fmt(multipliers?.[sym] ?? 0)}. Prêmio adicionado
            ao saldo!
          </span>
        </div>
        <span className={s.feedbackAmount}>+{fmt(round.prize)} CR</span>
      </div>
    );
  }
  if (phase === 'lose' && round) {
    const [x, y, z] = round.center;
    const allDifferent = x !== y && y !== z && x !== z;
    return (
      <div className={s.feedback} aria-live="polite">
        <img src="/bioma/rotate-ccw.svg" alt="" width={28} height={28} />
        <div className={s.feedbackText}>
          <span className={s.feedbackTitle}>Não foi desta vez. Sem prêmio.</span>
          <span className={s.feedbackSub}>
            {allDifferent
              ? 'Os três animais são diferentes. Só uma combinação de três iguais dá prêmio.'
              : 'Dois animais iguais não bastam. Só uma combinação de três iguais dá prêmio.'}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className={s.feedback}>
      <img src="/bioma/sparkles.svg" alt="" width={28} height={28} />
      <div className={s.feedbackText}>
        <span className={s.feedbackTitle}>A clareira está pronta. E você?</span>
        <span className={s.feedbackSub}>Escolha sua aposta e gire. Três animais iguais na linha central dão prêmio.</span>
      </div>
    </div>
  );
}

function SpinButton({
  spinning,
  played,
  bet,
  broke,
  cantAfford,
  disabled,
  onSpin,
  onRestart,
  initialBalance,
}: {
  spinning: boolean;
  played: boolean;
  bet: number;
  broke: boolean;
  cantAfford: boolean;
  disabled: boolean;
  onSpin: () => void;
  onRestart: () => void;
  initialBalance: number;
}) {
  if (spinning) {
    return (
      <button type="button" className={`${s.spinButton} ${s.spinButtonBusy}`} disabled>
        <span className={`${s.pixel} ${s.spinAction}`}>
          <img className={s.spin} src="/bioma/loader-botao.svg" alt="" width={22} height={22} />
          GIRANDO...
        </span>
        <span className={s.spinSub}>Aguarde os rolos pararem</span>
      </button>
    );
  }
  if (broke) {
    return (
      <button type="button" className={s.spinButton} onClick={onRestart}>
        <span className={`${s.pixel} ${s.spinAction}`}>
          <img src="/bioma/rotate-cw.svg" alt="" width={22} height={22} />
          RECOMEÇAR
        </span>
        <span className={s.spinSub}>Saldo esgotado · novo saldo de {fmt(initialBalance)} CR</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`${s.spinButton} ${cantAfford ? s.spinButtonBusy : ''}`}
      onClick={onSpin}
      disabled={disabled || cantAfford}
    >
      <span className={`${s.pixel} ${s.spinAction}`}>
        <img src="/bioma/rotate-cw.svg" alt="" width={22} height={22} />
        {played ? 'GIRAR DE NOVO' : 'GIRAR'}
      </span>
      <span className={s.spinSub}>{cantAfford ? 'Saldo insuficiente para esta aposta' : `${fmt(bet)} créditos por giro`}</span>
    </button>
  );
}
