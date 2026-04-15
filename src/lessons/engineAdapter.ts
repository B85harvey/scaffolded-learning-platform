/**
 * Thin adapter between the lesson state model and the Phase 1 scaffold engine.
 *
 * The engine expects `Answer[]`. Lesson state stores answers as `SlideAnswers`
 * (a discriminated union keyed by slide id). This module converts between the
 * two shapes without touching either the engine or the reducer.
 */
import { assemble } from '@/lib/scaffold'
import type { Answer, AssemblyResult } from '@/lib/scaffold'
import type { SlideAnswers, SlideConfig } from '@/lessons/types'

type ScaffoldSlide = Extract<SlideConfig, { type: 'scaffold' }>

/**
 * Converts a `SlideAnswers` value into the `Answer[]` format expected by the
 * scaffold engine, using the prompt definitions in the slide config to fill in
 * any missing entries with empty strings.
 */
export function buildEngineAnswers(
  slide: ScaffoldSlide,
  slideAnswers: SlideAnswers | undefined
): Answer[] {
  if (slide.mode === 'freeform-table') {
    if (!slideAnswers || slideAnswers.kind !== 'table') return []
    return slideAnswers.rows.map((row) => ({ kind: 'table-row' as const, values: row }))
  }

  // framed or guided: one text answer per prompt
  const textValues = slideAnswers?.kind === 'text' ? slideAnswers.values : {}
  return (slide.config.prompts ?? []).map((p) => ({
    kind: 'text' as const,
    promptId: p.id,
    value: textValues[p.id] ?? '',
  }))
}

/**
 * Runs the scaffold engine for a single slide and returns the `AssemblyResult`
 * (paragraph text + warnings). Caller is responsible for dispatching the result
 * to the reducer.
 */
export function assembleSlide(
  slide: ScaffoldSlide,
  slideAnswers: SlideAnswers | undefined
): AssemblyResult {
  return assemble(slide.config, buildEngineAnswers(slide, slideAnswers))
}
