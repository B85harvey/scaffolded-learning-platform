/**
 * LiveWall — full-screen projector display for the teacher at
 * /teacher/livewall/:lessonId.
 *
 * Opens in its own window (window.open from the lesson editor / dashboard).
 * No TeacherNav, no sidebar. Protected by AdminRoute.
 *
 * Features:
 * - Slide selector (scaffold + class-check MCQ slides)
 * - Scaffold slides: response cards — one per group, revealed on demand
 * - MCQ slides: live bar chart showing vote distribution
 * - Dark / light theme toggle (default dark, persisted to localStorage)
 * - Escape key exits full-screen
 * - Live updates via Supabase Realtime
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Moon, Sun, X } from 'lucide-react'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { SlideSelector } from '@/components/teacher/livewall/SlideSelector'
import type { WallSlide } from '@/components/teacher/livewall/SlideSelector'
import { RevealControls } from '@/components/teacher/livewall/RevealControls'
import type { GroupCard } from '@/components/teacher/livewall/RevealControls'
import { McqBarChart } from '@/components/teacher/McqBarChart'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const THEME_KEY = 'livewall-theme'

const SECTION_DISPLAY: Record<string, string> = {
  orientation: 'Orientation',
  aim: 'Aim',
  issues: 'Issues',
  decision: 'Decision',
  justification: 'Justification',
  implementation: 'Implementation',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbSlide {
  id: string
  sort_order: number
  type: 'content' | 'mcq' | 'scaffold' | 'review'
  config: Record<string, unknown>
}

interface DbGroup {
  id: string
  lesson_id: string
  group_name: string
}

interface DbGroupMember {
  group_id: string
  student_id: string
  is_scribe: boolean
}

interface Submission {
  studentId: string
  slideId: string
  section: string | null
  paragraph: string | null
  /** MCQ answer — present only for MCQ-type submissions. */
  promptAnswers: { selectedOption?: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionLabel(section: string): string {
  return SECTION_DISPLAY[section] ?? section.charAt(0).toUpperCase() + section.slice(1)
}

function dbSlidesToWallSlides(slides: DbSlide[]): WallSlide[] {
  const wallSlides: WallSlide[] = []
  for (const slide of slides) {
    if (slide.type === 'scaffold') {
      const cfg = slide.config as { section?: string }
      const section = cfg.section ?? ''
      wallSlides.push({
        slideId: slide.id,
        type: 'scaffold',
        label: sectionLabel(section),
        section,
      })
    } else if (slide.type === 'mcq') {
      const cfg = slide.config as {
        variant?: string
        question?: string
        options?: Array<{ id: string; text: string; correct?: boolean }>
      }
      if (cfg.variant === 'class') {
        const q = typeof cfg.question === 'string' ? cfg.question : ''
        wallSlides.push({
          slideId: slide.id,
          type: 'mcq',
          label: q.length > 30 ? q.slice(0, 30) + '…' : q || 'Class check',
          options: (cfg.options ?? []).map((o) => ({
            id: o.id,
            text: o.text,
            correct: o.correct,
          })),
        })
      }
    }
  }
  return wallSlides
}

// ── Inner page (inside AdminRoute) ────────────────────────────────────────────

function LiveWallInner() {
  const { lessonId } = useParams<{ lessonId: string }>()

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem(THEME_KEY) as 'dark' | 'light') ?? 'dark'
  )

  // Data
  const [wallSlides, setWallSlides] = useState<WallSlide[]>([])
  const [groups, setGroups] = useState<DbGroup[]>([])
  const [scribeMap, setScribeMap] = useState<Map<string, string>>(new Map())
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlide, setSelectedSlide] = useState<WallSlide | null>(null)

  // Track mounted to avoid state updates after unmount.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ── Theme toggle ────────────────────────────────────────────────────────────

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  // ── Escape → exit full-screen ───────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Data fetching ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!lessonId) return

    let cancelled = false

    async function loadData() {
      // 1. Slides
      const { data: slidesData } = await supabase
        .from('slides')
        .select('id, sort_order, type, config')
        .eq('lesson_id', lessonId!)
        .order('sort_order')

      if (cancelled) return

      const dbSlides = (slidesData ?? []) as DbSlide[]
      const computed = dbSlidesToWallSlides(dbSlides)
      setWallSlides(computed)
      setSelectedSlide(computed[0] ?? null)

      // 2. Groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, lesson_id, group_name')
        .eq('lesson_id', lessonId!)

      if (cancelled) return

      const fetchedGroups = (groupsData ?? []) as DbGroup[]
      setGroups(fetchedGroups)

      // 3. Group members → build scribe map (groupId → studentId)
      const groupIds = fetchedGroups.map((g) => g.id)
      if (groupIds.length > 0) {
        const { data: membersData } = await supabase
          .from('group_members')
          .select('group_id, student_id, is_scribe')
          .in('group_id', groupIds)

        if (!cancelled) {
          const map = new Map<string, string>()
          for (const m of (membersData ?? []) as DbGroupMember[]) {
            if (m.is_scribe && m.student_id && !map.has(m.group_id)) {
              map.set(m.group_id, m.student_id)
            }
          }
          setScribeMap(map)
        }
      }

      // 4. Existing submissions (scaffold paragraphs + MCQ answers)
      const { data: subsData } = await supabase
        .from('lesson_submissions')
        .select('student_id, slide_id, section, committed_paragraph, prompt_answers')
        .eq('lesson_id', lessonId!)

      if (!cancelled) {
        const parsed: Submission[] = (
          (subsData ?? []) as Array<{
            student_id: string | null
            slide_id: string
            section: string | null
            committed_paragraph: string | null
            prompt_answers: unknown
          }>
        )
          .filter((r) => r.student_id !== null)
          .map((r) => ({
            studentId: r.student_id as string,
            slideId: r.slide_id,
            section: r.section,
            paragraph: r.committed_paragraph,
            promptAnswers: r.prompt_answers as Submission['promptAnswers'],
          }))
        setSubmissions(parsed)
        setLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [lessonId])

  // ── Realtime subscription ───────────────────────────────────────────────────

  useEffect(() => {
    if (!lessonId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`livewall-${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_submissions',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload: {
          new: {
            student_id: string | null
            slide_id: string
            section: string | null
            committed_paragraph: string | null
            prompt_answers: unknown
          }
        }) => {
          const row = payload.new
          if (!row.student_id) return

          setSubmissions((prev) => {
            const idx = prev.findIndex(
              (s) => s.studentId === row.student_id && s.slideId === row.slide_id
            )
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = {
                ...next[idx],
                paragraph: row.committed_paragraph,
                promptAnswers: row.prompt_answers as Submission['promptAnswers'],
              }
              return next
            }
            return [
              ...prev,
              {
                studentId: row.student_id!,
                slideId: row.slide_id,
                section: row.section,
                paragraph: row.committed_paragraph,
                promptAnswers: row.prompt_answers as Submission['promptAnswers'],
              },
            ]
          })
        }
      )
      .subscribe()

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase as any).removeChannel(channel)
    }
  }, [lessonId])

  // ── Derived: scaffold response cards ─────────────────────────────────────────

  const cards = useMemo<GroupCard[]>(() => {
    if (!selectedSlide || selectedSlide.type !== 'scaffold') return []
    return groups.map((g) => {
      const scribeId = scribeMap.get(g.id)
      const sub = scribeId
        ? submissions.find((s) => s.studentId === scribeId && s.section === selectedSlide.section)
        : undefined
      return {
        groupId: g.id,
        groupName: g.group_name,
        paragraph: sub?.paragraph ?? null,
      }
    })
  }, [groups, scribeMap, submissions, selectedSlide])

  // ── Derived: MCQ chart data ───────────────────────────────────────────────────

  const mcqOptionTexts = useMemo(
    () => selectedSlide?.options?.map((o) => o.text) ?? [],
    [selectedSlide]
  )

  const mcqCounts = useMemo(() => {
    if (!selectedSlide || selectedSlide.type !== 'mcq' || !selectedSlide.options) return []
    const slideSubmissions = submissions.filter((s) => s.slideId === selectedSlide.slideId)
    return selectedSlide.options.map(
      (opt) => slideSubmissions.filter((s) => s.promptAnswers?.selectedOption === opt.id).length
    )
  }, [selectedSlide, submissions])

  const mcqTotal = useMemo(() => mcqCounts.reduce((sum, c) => sum + c, 0), [mcqCounts])

  const mcqCorrectIndex = useMemo(() => {
    if (!selectedSlide?.options) return 0
    const idx = selectedSlide.options.findIndex((o) => o.correct)
    return idx >= 0 ? idx : 0
  }, [selectedSlide])

  // ── Render ──────────────────────────────────────────────────────────────────

  const isDark = theme === 'dark'

  return (
    <div
      data-testid="live-wall"
      className={cn(
        'flex min-h-screen flex-col font-sans',
        isDark ? 'bg-[#1a1c23] text-white' : 'bg-white text-ga-ink'
      )}
    >
      {/* Slide selector bar */}
      <SlideSelector
        slides={wallSlides}
        selectedSlideId={selectedSlide?.slideId ?? null}
        onSelect={setSelectedSlide}
        theme={theme}
      />

      {/* Main content */}
      <main id="main" className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div
              className={cn(
                'h-8 w-8 animate-spin rounded-full border-4 border-t-ga-primary',
                isDark ? 'border-white/20' : 'border-ga-border'
              )}
              aria-label="Loading…"
              aria-busy="true"
            />
          </div>
        ) : selectedSlide ? (
          selectedSlide.type === 'mcq' ? (
            <McqBarChart
              options={mcqOptionTexts}
              counts={mcqCounts}
              correctIndex={mcqCorrectIndex}
              total={mcqTotal}
              theme={theme}
            />
          ) : (
            <RevealControls key={selectedSlide.slideId} cards={cards} theme={theme} />
          )
        ) : (
          <p
            className={cn(
              'font-sans text-sm italic',
              isDark ? 'text-white/40' : 'text-ga-ink-muted'
            )}
          >
            No scaffold or class-check slides found.
          </p>
        )}
      </main>

      {/* Corner controls */}
      {/* Theme toggle — top-left */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        data-testid="theme-toggle"
        className={cn(
          'fixed left-4 top-4 rounded-ga-sm p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70',
          isDark
            ? 'bg-white/10 text-white/60 opacity-40 hover:opacity-100'
            : 'bg-ga-surface-muted text-ga-ink-muted opacity-40 hover:opacity-100'
        )}
      >
        {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      </button>

      {/* Exit button — top-right */}
      <button
        type="button"
        onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
          }
          window.close()
        }}
        aria-label="Exit live wall"
        data-testid="exit-btn"
        className={cn(
          'fixed right-4 top-4 rounded-ga-sm p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70',
          isDark
            ? 'bg-white/10 text-white/60 opacity-40 hover:opacity-100'
            : 'bg-ga-surface-muted text-ga-ink-muted opacity-40 hover:opacity-100'
        )}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Exported page (wrapped in AdminRoute) ─────────────────────────────────────

export function LiveWall() {
  return (
    <AdminRoute>
      <LiveWallInner />
    </AdminRoute>
  )
}
