import type { Achievement, Event, Talent } from '@remake/data'
import { ages, events, AchievementOpportunity as Ao } from '@remake/data'
import type { GameState, ProfileState } from './state'
import { createState, nextProfile, propsEffect } from './state'
import { summary as stateSummary } from './state'
import type { ReplacementResult, AdditionalPoints } from './talent'
import { pull, exclude, replacement, additionalPoints } from './talent'
import { trigger as ttr } from './talent'
import { trigger as atr } from './achievement'
import { trigger as etr, check as ec } from './event'
import type { RNG } from '@remake/vitex'
import { pickWeight } from '@remake/vitex'
import { produce, enableMapSet } from 'immer'
enableMapSet()

/** 气运之子：遇到增加属性的事件概率提升 */
export const LuckyTalentId: Talent['id'] = 2100
/** 先天道体：悟出大道的概率提升 */
export const DaoTalentId: Talent['id'] = 2101
/** 气运之子的事件权重倍率 */
export const LuckyMultiplier = 3
/** 先天道体的悟道权重倍率 */
export const DaoMultiplier = 3

/** 「悟出大道」类事件的识别 */
const DaoEventPattern = /悟出.*大道/
const daoEventCache = new Map<Event['id'], boolean>()
function isDaoEvent(id: Event['id']): boolean {
    const cached = daoEventCache.get(id)
    if (cached !== undefined) return cached
    const result = DaoEventPattern.test(events.get(id)?.event ?? '')
    daoEventCache.set(id, result)
    return result
}

/** 事件是否增加属性（至少一项为正） */
function isPositivePropEvent(id: Event['id']): boolean {
    const { effect } = events.get(id)!
    if (!effect) return false
    return (
        (effect.CHR ?? 0) > 0 ||
        (effect.INT ?? 0) > 0 ||
        (effect.STR ?? 0) > 0 ||
        (effect.MNY ?? 0) > 0 ||
        (effect.SPR ?? 0) > 0
    )
}

/**
 * 悟出大道的目标概率
 * - 智力 0 → 1%
 * - 随智力线性提升，智力 1000 → 3%
 * - 智力 ≥ 1000 → 3% + 原有 1% = 4%
 */
export function daoChance(intelligence: number): number {
    if (intelligence >= 1000) return 0.04
    const ratio = Math.max(intelligence, 0) / 1000
    return 0.01 + ratio * 0.02
}

/**
 * 对候选事件重新加权
 * 1. 气运之子：增加属性的事件权重 ×3
 * 2. 悟道事件：全局按智力把「悟出大道」的总概率调整到 daoChance
 * 3. 先天道体：悟道权重再 ×3
 */
export function weightEvents(
    list: [Event['id'], number][],
    state: GameState,
): [Event['id'], number][] {
    if (list.length === 0) return list
    const hasLucky = state.talents.has(LuckyTalentId)
    const hasDao = state.talents.has(DaoTalentId)

    let weighted: [Event['id'], number][] = hasLucky
        ? list.map(
              ([id, w]) =>
                  [
                      id,
                      isPositivePropEvent(id) ? w * LuckyMultiplier : w,
                  ] as [Event['id'], number],
          )
        : list

    const daoItems = weighted.filter(([id]) => isDaoEvent(id))
    if (daoItems.length > 0) {
        const othersTotal = weighted
            .filter(([id]) => !isDaoEvent(id))
            .reduce((sum, [, w]) => sum + w, 0)
        const target = Math.min(
            daoChance(state.props.current.intelligence) *
                (hasDao ? DaoMultiplier : 1),
            0.9,
        )
        const currentTotal = daoItems.reduce((sum, [, w]) => sum + w, 0)
        if (othersTotal > 0 && currentTotal > 0) {
            const desiredTotal = (target / (1 - target)) * othersTotal
            const factor = desiredTotal / currentTotal
            weighted = weighted.map(
                ([id, w]) =>
                    [id, isDaoEvent(id) ? w * factor : w] as [
                        Event['id'],
                        number,
                    ],
            )
        }
    }
    return weighted
}

export interface TriggerResult<T> {
    state: GameState
    triggers: T[]
}
export interface PickResult {
    talents: ReplacementResult
    additionalPoints: AdditionalPoints
}
export function pick(talents: Iterable<Talent['id']>, rng?: RNG): PickResult {
    const r = replacement(talents, rng)
    const ap = additionalPoints(r.talents)
    return { talents: r, additionalPoints: ap }
}

export interface StartResult {
    state: GameState
    achievements: Achievement['id'][]
}
export function start(
    profile: ProfileState,
    ...args: Parameters<typeof createState>
): StartResult {
    const state = createState(...args)
    const ar = atr(Ao.Start, state, profile)
    return { state: ar.state, achievements: ar.triggers }
}
export interface NextResult {
    state: GameState
    age: number
    achievements: Achievement['id'][]
    events: Event['id'][]
    talents: Talent['id'][]
    end: boolean
}

export function next(
    state: GameState,
    profile: ProfileState,
    rng?: RNG,
): NextResult {
    let s = produce(state, draft => {
        draft.props = propsEffect(state.props, { age: 1 })
    })
    const age = s.props.current.age
    const tr = ttr(s, profile, rng)
    const candidates = ages
        .get(age)!
        .event.filter(([e]) => ec(e, tr.state, profile))
    const weighted = weightEvents(candidates, tr.state)
    const event = pickWeight(weighted, rng)!
    const er = etr(event, tr.state, profile)
    const ar = atr(Ao.Trajectory, er.state, profile)
    const end = ar.state.life < 1
    return {
        state: ar.state,
        age,
        achievements: ar.triggers,
        events: er.triggers,
        talents: tr.triggers,
        end,
    }
}

export interface SummaryResult {
    state: GameState
    summary: number
    achievements: Achievement['id'][]
}
export function summary(
    state: GameState,
    profile: ProfileState,
): SummaryResult {
    const ar = atr(Ao.Summary, state, profile)
    const s = stateSummary(ar.state)
    return { state: ar.state, summary: s, achievements: ar.triggers }
}

export interface EndResult {
    profile: ProfileState
    achievements: Achievement['id'][]
}

export function end(
    state: GameState,
    profile: ProfileState,
    locked?: Talent['id'][],
) {
    const ar = atr(Ao.End, state, profile)
    const p = nextProfile(profile, ar.state, locked)
    return { profile: p, achievements: ar.triggers }
}

export { pull, exclude }
