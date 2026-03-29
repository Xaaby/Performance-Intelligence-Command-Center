import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { VendorScore } from '../../types/vendor.types';
import { askVendorAnalyst } from '../../services/vendorAnalyst';

function formatAnalystError(err: unknown): string {
  const hint =
    'If this persists, confirm the backend is running on port 3001 and your Google API key is set in the repo-root .env.';
  if (err instanceof Error && err.message.trim()) {
    return `${err.message.trim()}\n\n${hint}`;
  }
  return `Unable to connect to the analyst engine. Check your API connection and try again.\n\n${hint}`;
}

export const DEMO_FRAUD_VENDOR_NAMES = [
  'PhantomReach Media',
  'ShadowClick Network',
  'GhostTraffic Pro',
] as const;

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  isAuto?: boolean;
};

type Props = {
  vendor: VendorScore | null;
  isOpen: boolean;
  onClose: () => void;
};

function tierLabel(v: VendorScore): string {
  if (v.quality_tier === 'high') {
    return v.effective_score >= 0.85 ? 'PLATINUM' : 'GOLD';
  }
  if (v.quality_tier === 'medium') return 'SILVER';
  return 'RESTRICTED';
}

function isFraudVendor(v: VendorScore): boolean {
  return v.fraud_p >= 0.8 || v.budget_decision === 'emergency_pause';
}

function isHighQualityChip(v: VendorScore): boolean {
  return v.effective_score >= 0.75 && !isFraudVendor(v);
}

function getHeaderChipStyle(v: VendorScore): {
  chipStyle: CSSProperties;
  dotColor: string;
} {
  if (isFraudVendor(v)) {
    return {
      chipStyle: {
        background: '#1C0505',
        borderColor: 'rgba(255,180,171,0.3)',
        color: '#FFB4AB',
        borderWidth: 1,
        borderStyle: 'solid',
      },
      dotColor: '#FFB4AB',
    };
  }
  if (isHighQualityChip(v)) {
    return {
      chipStyle: {
        background: '#052E16',
        borderColor: 'rgba(74,225,118,0.3)',
        color: '#4AE176',
        borderWidth: 1,
        borderStyle: 'solid',
      },
      dotColor: '#4AE176',
    };
  }
  return {
    chipStyle: {
      background: '#1A1D27',
      borderColor: 'rgba(164,201,255,0.3)',
      color: '#A4C9FF',
      borderWidth: 1,
      borderStyle: 'solid',
    },
    dotColor: '#A4C9FF',
  };
}

function getAssistantBorderColor(text: string): string {
  const lower = text.toLowerCase();
  if (/fraud|pause|suspend/.test(lower)) return '#FFB4AB';
  if (/scale|positive|platinum/.test(lower)) return '#4AE176';
  return '#C0C1FF';
}

function formatLogTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const FRAUD_CHIPS = [
  'Why was this vendor flagged?',
  'Should I pause budget?',
  'Compare to top vendor',
] as const;

const CLEAN_CHIPS = [
  "What's driving this vendor's score?",
  'Scale budget recommendation?',
  'What would improve this score?',
] as const;

const COLD_CHIPS = [
  'How far from A/B testing?',
  "What's the current confidence level?",
  'Expected timeline to active pool?',
] as const;

function suggestedChips(vendor: VendorScore): readonly string[] {
  if (vendor.experiment_phase === 'cold_start') return COLD_CHIPS;
  if (isFraudVendor(vendor)) return FRAUD_CHIPS;
  if (vendor.effective_score >= 0.75) return CLEAN_CHIPS;
  return CLEAN_CHIPS;
}

export function VendorAnalystPanel({ vendor, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [lastQuestion, setLastQuestion] = useState('');
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMessages([]);
    setConversationHistory([]);
    setInputValue('');
    setLastQuestion('');
  }, [vendor?.vendor_id]);

  useEffect(() => {
    if (
      !isOpen ||
      !vendor ||
      !DEMO_FRAUD_VENDOR_NAMES.some((n) => n === vendor.vendor_name)
    ) {
      return;
    }

    let cancelled = false;
    demoTimeoutRef.current = setTimeout(async () => {
      if (cancelled) return;
      const autoQuestion = 'Why was this vendor flagged?';
      setIsLoading(true);
      setMessages([
        {
          role: 'user',
          content: autoQuestion,
          timestamp: new Date(),
          isAuto: true,
        },
      ]);
      try {
        const response = await askVendorAnalyst(vendor, autoQuestion, []);
        if (cancelled) return;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response, timestamp: new Date() },
        ]);
        setConversationHistory([
          { role: 'user', content: autoQuestion },
          { role: 'assistant', content: response },
        ]);
      } catch (err) {
        if (cancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: formatAnalystError(err),
            timestamp: new Date(),
            isError: true,
          },
        ]);
        setLastQuestion(autoQuestion);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current);
    };
  }, [isOpen, vendor?.vendor_id, vendor?.vendor_name]);

  const handleSend = async (text?: string) => {
    if (!vendor) return;
    const question = (text ?? inputValue).trim();
    if (!question || isLoading) return;

    const prevHistory = conversationHistory;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question, timestamp: new Date() },
    ]);
    setConversationHistory((prev) => [...prev, { role: 'user', content: question }]);
    setLastQuestion(question);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askVendorAnalyst(vendor, question, prevHistory);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response, timestamp: new Date() },
      ]);
      setConversationHistory((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: formatAnalystError(err),
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!vendor) {
    return null;
  }

  const { chipStyle, dotColor } = getHeaderChipStyle(vendor);
  const fraudBanner = isFraudVendor(vendor);
  const tier = tierLabel(vendor);
  const chips = suggestedChips(vendor);
  const showIncidentLog = vendor.fraud_p >= 0.8;

  const fraudSignals = vendor.fraud_signals;
  const incidentRows: { offsetMs: number; event: string; severity: 'critical' | 'high'; prob: number }[] = [];
  if (fraudSignals.velocity_anomaly > 0.6) {
    incidentRows.push({
      offsetMs: 2000,
      event: 'IP_VELOCITY_BURST',
      severity: 'critical',
      prob: fraudSignals.velocity_anomaly,
    });
  }
  if (fraudSignals.fp_clustering > 0.5) {
    incidentRows.push({
      offsetMs: 4000,
      event: 'DEVICE_FP_CLUSTER_DETECTED',
      severity: 'high',
      prob: fraudSignals.fp_clustering,
    });
  }
  if (fraudSignals.ip_concentration > 0.5) {
    incidentRows.push({
      offsetMs: 6000,
      event: 'IP_CONCENTRATION_ANOMALY',
      severity: 'high',
      prob: fraudSignals.ip_concentration,
    });
  }

  return (
    <div
      className={`fixed right-0 top-16 z-40 flex w-[380px] flex-col border-l border-[rgba(70,69,84,0.15)] transition-transform duration-300 ease-out ${!isOpen ? 'pointer-events-none' : ''}`}
      style={{
        height: 'calc(100vh - 64px)',
        background: '#191B22',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[rgba(70,69,84,0.15)] bg-[#191B22] px-4 py-3">
        <div>
          <div className="flex items-center">
            <span className="material-symbols-outlined text-base text-primary">smart_toy</span>
            <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-primary">Vendor Analyst</span>
          </div>
          <div
            className="mt-1 flex w-fit items-center gap-1.5 rounded border px-2 py-0.5"
            style={chipStyle}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
            <span className="font-mono text-[10px]">{vendor.vendor_name}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition-colors hover:text-on-surface"
          aria-label="Close analyst panel"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </header>

      {fraudBanner ? (
        <div
          className="flex shrink-0 items-center justify-between border-b border-[rgba(255,180,171,0.1)] px-4 py-2"
          style={{ background: '#1C0505' }}
        >
          <span className="font-mono text-[10px] uppercase text-error">ANALYZING: {vendor.vendor_name}</span>
          <span className="font-mono text-[10px] text-on-surface">
            Fraud_P: {vendor.fraud_p.toFixed(3)} | Eff: {vendor.effective_score.toFixed(3)} | SUSPENDED
          </span>
        </div>
      ) : (
        <div
          className="flex shrink-0 items-center justify-between border-b border-[rgba(74,225,118,0.1)] px-4 py-2"
          style={{ background: '#052E16' }}
        >
          <span className="font-mono text-[10px] uppercase text-tertiary">ANALYZING: {vendor.vendor_name}</span>
          <span className="font-mono text-[10px] text-on-surface">
            TQS: {vendor.tqs.toFixed(3)} | Eff: {vendor.effective_score.toFixed(3)} | {tier}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-[#111319]">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col gap-2">
              {chips.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void handleSend(q)}
                  className="cursor-pointer rounded border border-[rgba(70,69,84,0.2)] bg-[#1E1F26] px-3 py-2 text-left font-mono text-[10px] text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={`${i}-${m.timestamp.getTime()}`} className="mb-4 flex flex-col items-end">
                <div className="max-w-[75%] rounded-lg bg-[#1E1F26] px-3 py-2 font-body text-sm text-on-surface">
                  {m.content}
                </div>
                <span className="mt-1 text-right font-mono text-[10px] text-on-surface-variant">
                  {m.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <div key={`${i}-${m.timestamp.getTime()}`} className="mb-4 max-w-[90%]">
                <div className="flex items-center">
                  <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
                  <span className="ml-1 font-body text-xs font-bold text-primary">Vendor Analyst</span>
                </div>
                {m.isError ? (
                  <div
                    className="mt-1 whitespace-pre-wrap rounded-r-lg border-l-2 border-error bg-[#191B22] px-4 py-3 font-body text-sm leading-relaxed text-on-surface"
                    style={{ lineHeight: 1.6 }}
                  >
                    {m.content}
                    <button
                      type="button"
                      onClick={() => void handleSend(lastQuestion)}
                      className="mt-2 block font-mono text-[10px] text-primary underline"
                    >
                      Retry last question
                    </button>
                  </div>
                ) : (
                  <div
                    className="mt-1 rounded-r-lg border-l-2 bg-[#191B22] px-4 py-3 font-body text-sm text-on-surface"
                    style={{
                      borderLeftColor: getAssistantBorderColor(m.content),
                      lineHeight: 1.6,
                    }}
                  >
                    {m.content}
                  </div>
                )}
                <span className="mt-1 font-mono text-[10px] text-on-surface-variant">
                  {m.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ),
          )}

          {isLoading && (
            <div className="max-w-[90%]">
              <div className="flex items-center gap-1 py-2">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-on-surface-variant opacity-40" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-on-surface-variant opacity-70 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-on-surface-variant [animation-delay:300ms]" />
                </span>
              </div>
              <p className="font-mono text-[10px] text-on-surface-variant">Analyzing vendor data...</p>
            </div>
          )}
        </div>

        {showIncidentLog && incidentRows.length > 0 && (
          <div className="shrink-0 border-t border-[rgba(70,69,84,0.15)] bg-[#191B22] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">INCIDENT LOG</p>
            <div className="mt-2 space-y-2">
              {incidentRows.map((row) => {
                const ts = new Date(Date.now() - row.offsetMs);
                const badge =
                  row.severity === 'critical' ? (
                    <span className="rounded bg-error/10 px-1.5 py-0.5 font-mono text-[9px] text-error">CRITICAL</span>
                  ) : (
                    <span className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-[9px] text-secondary">HIGH</span>
                  );
                return (
                  <div key={row.event} className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-on-surface-variant">
                    <span>{formatLogTime(ts)}</span>
                    <span className="text-on-surface">{row.event}</span>
                    <span>Vector: {badge}</span>
                    <span>Probability: {row.prob.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-[rgba(70,69,84,0.15)] bg-[#191B22] px-4 py-3">
          <div className="flex items-end gap-2">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask about this vendor..."
              className="flex-1 rounded border border-outline-variant/20 bg-surface-container px-3 py-2 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || !inputValue.trim()}
              className="flex-shrink-0 rounded p-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #C0C1FF, #8083FF)',
              }}
            >
              <span className="material-symbols-outlined text-base text-[#0D0096]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
