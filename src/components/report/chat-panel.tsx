import type { Analysis, ChatMessage } from '@shared/types'
import { motion } from 'motion/react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { askGuide, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useRepository } from '@/hooks/use-history'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'

export function ChatPanel({ analysis }: { analysis: Analysis }) {
  const repository = useRepository()
  const { accessToken } = useAuth()
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const [messages, setMessages] = useState<ChatMessage[]>(analysis.messages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(analysis.messages)
  }, [analysis.id, analysis.messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 350)
    return () => window.clearTimeout(timer)
  }, [analysis.id])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || sending) return

    haptic('light', hapticsEnabled)
    const previous = messages
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      createdAt: Date.now(),
    }
    const withUser = [...previous, userMessage]
    setMessages(withUser)
    setInput('')
    setSending(true)

    try {
      const answer = await askGuide({
        report: analysis.report,
        messages: previous,
        question,
        language: analysis.language,
        token: accessToken,
      })
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        createdAt: Date.now(),
      }
      const final = [...withUser, assistantMessage]
      setMessages(final)
      await repository?.updateMessages(analysis.id, final)
      bumpHistory()
    } catch (error) {
      setMessages(previous)
      toast.error(error instanceof ApiError ? error.message : 'The guide could not answer.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <p className="mx-auto max-w-[19rem] text-[14px] leading-relaxed text-muted-foreground">
              Ask anything about {analysis.report.title}. I know the details in your photo.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {analysis.report.suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void send(question)}
                  className="rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] text-foreground transition-colors hover:bg-secondary active:scale-[0.97]"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-[1.35rem] px-4 py-2.5 text-[14px] leading-relaxed',
                message.role === 'user'
                  ? 'rounded-br-lg bg-primary text-primary-foreground'
                  : 'rounded-bl-lg border border-border/70 bg-card text-foreground',
              )}
            >
              {message.content}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-[1.35rem] rounded-bl-lg border border-border/70 bg-card px-4 py-3">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="size-1.5 rounded-full bg-muted-foreground"
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.16 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="safe-bottom border-t border-border/60 bg-background/90 px-3.5 pt-3 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            data-no-swipe
            rows={1}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send(input)
              }
            }}
            placeholder="Ask a question…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-[1.35rem] border border-border bg-card px-4 py-3 text-[14px] leading-snug outline-none transition-colors focus-visible:border-primary/60"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || sending}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
