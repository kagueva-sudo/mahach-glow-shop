import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send } from "lucide-react";
import { startChatSession, sendChatMessage, getChatHistory } from "@/lib/chat.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

type Msg = { id: string; role: string; content: string };

const STORAGE_KEY = "nuri_chat_session";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<{ id: string; token: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startFn = useServerFn(startChatSession);
  const sendFn = useServerFn(sendChatMessage);
  const historyFn = useServerFn(getChatHistory);

  // restore from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setHydrating(false);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { id: string; token: string };
      historyFn({ data: { sessionId: parsed.id, sessionToken: parsed.token } })
        .then((res) => {
          setSession(parsed);
          setMessages(res.messages as Msg[]);
        })
        .catch(() => localStorage.removeItem(STORAGE_KEY))
        .finally(() => setHydrating(false));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setHydrating(false);
    }
  }, [historyFn]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && session) inputRef.current?.focus();
  }, [open, session]);

  async function handleStart(name: string, phone: string) {
    try {
      const res = await startFn({ data: { customer_name: name, phone, consent: true } });
      const s = { id: res.sessionId, token: res.sessionToken };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      setSession(s);
      setMessages([{ id: "g", role: "assistant", content: res.greeting }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось начать чат");
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !session || sending) return;
    setInput("");
    setSending(true);
    const tempId = `t-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, role: "user", content: text }]);
    try {
      const res = await sendFn({
        data: { sessionId: session.id, sessionToken: session.token, text },
      });
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: res.reply }]);
      if (res.orderId) toast.success("Заявка оформлена!");
      if (res.ticketOpened) toast.info("Оператор скоро подключится");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setMessages([]);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={open ? "Закрыть чат" : "Открыть чат"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-8rem))] bg-background border border-border shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <header className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
            <div>
              <p className="font-serif text-lg leading-tight">Нури · консультант</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Подберём свечу с душой
              </p>
            </div>
            {session && (
              <button
                onClick={handleReset}
                className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary"
              >
                Новый
              </button>
            )}
          </header>

          {hydrating ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Загрузка…
            </div>
          ) : !session ? (
            <StartForm onStart={handleStart} />
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages
                  .filter((m) => m.role === "user" || m.role === "assistant")
                  .map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.role === "user"
                          ? "ml-auto max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 text-sm whitespace-pre-wrap"
                          : "mr-auto max-w-[85%] bg-secondary text-foreground rounded-2xl rounded-tl-sm px-4 py-2 text-sm whitespace-pre-wrap"
                      }
                    >
                      {m.content}
                    </div>
                  ))}
                {sending && (
                  <div className="mr-auto bg-secondary rounded-2xl px-4 py-2 text-sm text-muted-foreground">
                    Печатает…
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="border-t border-border p-2 flex gap-2 items-end"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Напишите сообщение…"
                  className="flex-1 resize-none bg-transparent border-0 px-2 py-2 text-sm focus:outline-none max-h-32"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                  aria-label="Отправить"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

function StartForm({ onStart }: { onStart: (name: string, phone: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!consent) return;
        setLoading(true);
        await onStart(name.trim(), phone.trim());
        setLoading(false);
      }}
      className="flex-1 p-5 flex flex-col gap-3 overflow-y-auto"
    >
      <p className="text-sm text-muted-foreground">
        Я помогу подобрать свечу под ваш повод и настроение. Чтобы мы могли связаться по заказу — представьтесь, пожалуйста.
      </p>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Имя</span>
        <input
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Телефон</span>
        <input
          required
          type="tel"
          minLength={5}
          maxLength={30}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 ___ ___ __ __"
          className="w-full border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
          required
        />
        <span>
          Согласен с{" "}
          <Link to="/privacy" className="underline">
            политикой конфиденциальности
          </Link>{" "}
          и обработкой персональных данных.
        </span>
      </label>
      <button
        type="submit"
        disabled={!consent || loading}
        className="mt-2 bg-primary text-primary-foreground py-2.5 text-xs uppercase tracking-[0.2em] disabled:opacity-40"
      >
        {loading ? "Подключаем…" : "Начать чат"}
      </button>
    </form>
  );
}
