import { describe, expect, test } from 'bun:test'
import { events } from '@remake/data'
import type { GameState, Properties } from './state'
import {
    daoChance,
    weightEvents,
    LuckyTalentId,
    DaoTalentId,
    LuckyMultiplier,
    DaoMultiplier,
    LuckyExcludedEvents,
} from './game'

function makeState(talents: number[], intelligence: number): GameState {
    const base: Properties = {
        age: 18,
        charm: 5,
        intelligence,
        strength: 5,
        money: 5,
        spirit: 5,
    }
    return {
        props: {
            current: { ...base },
            highest: { ...base },
            lowest: { ...base },
        },
        life: 1,
        talents: new Set(talents),
        events: new Set(),
        achievements: new Set(),
        talentTriggers: new Map(),
    }
}

const allIds = Array.from(events.keys())
const daoIds = new Set(
    allIds.filter(id => /悟出.*大道/.test(events.get(id)!.event)),
)
const positiveId = allIds.find(id => {
    const e = events.get(id)!
    return (
        !daoIds.has(id) &&
        !!e.effect &&
        ((e.effect.INT ?? 0) > 0 ||
            (e.effect.STR ?? 0) > 0 ||
            (e.effect.CHR ?? 0) > 0 ||
            (e.effect.MNY ?? 0) > 0 ||
            (e.effect.SPR ?? 0) > 0)
    )
})!
const plainId = allIds.find(id => {
    const e = events.get(id)!
    if (daoIds.has(id) || id === positiveId) return false
    return !e.effect || Object.values(e.effect).every(v => !v || v <= 0)
})!

function daoShare(list: [number, number][]) {
    const total = list.reduce((s, [, w]) => s + w, 0)
    const dao = list
        .filter(([id]) => daoIds.has(id))
        .reduce((s, [, w]) => s + w, 0)
    return dao / total
}

describe('悟道概率 daoChance', () => {
    test('智力 0 → 1%', () => {
        expect(daoChance(0)).toBeCloseTo(0.01, 6)
    })
    test('智力 500 → 2%', () => {
        expect(daoChance(500)).toBeCloseTo(0.02, 6)
    })
    test('智力 999 → 接近 3%', () => {
        expect(daoChance(999)).toBeCloseTo(0.02998, 6)
    })
    test('智力 1000 → 3% + 原有 1% = 4%', () => {
        expect(daoChance(1000)).toBeCloseTo(0.04, 6)
    })
    test('智力再高也不超过 4%', () => {
        expect(daoChance(999999)).toBeCloseTo(0.04, 6)
    })
    test('负智力按 0 处理', () => {
        expect(daoChance(-50)).toBeCloseTo(0.01, 6)
    })
})

describe('悟道事件加权', () => {
    test('识别到「悟出…大道」事件', () => {
        expect(daoIds.size).toBeGreaterThan(0)
    })
    test('智力 0、无天赋时悟道总概率被校正到约 1%', () => {
        const candidates: [number, number][] = [
            ...Array.from(daoIds).map(id => [id, 0.01] as [number, number]),
            [plainId, 1] as [number, number],
        ]
        const weighted = weightEvents(candidates, makeState([], 0))
        expect(daoShare(weighted)).toBeCloseTo(0.01, 3)
    })
    test('智力 1000 时悟道总概率被校正到约 4%', () => {
        const candidates: [number, number][] = [
            ...Array.from(daoIds).map(id => [id, 0.01] as [number, number]),
            [plainId, 1] as [number, number],
        ]
        const weighted = weightEvents(candidates, makeState([], 1000))
        expect(daoShare(weighted)).toBeCloseTo(0.04, 3)
    })
    test('先天道体把悟道概率再放大到约 3 倍', () => {
        const candidates: [number, number][] = [
            ...Array.from(daoIds).map(id => [id, 0.01] as [number, number]),
            [plainId, 1] as [number, number],
        ]
        const without = daoShare(weightEvents(candidates, makeState([], 500)))
        const withDao = daoShare(
            weightEvents(candidates, makeState([DaoTalentId], 500)),
        )
        expect(withDao / without).toBeCloseTo(DaoMultiplier, 1)
    })
    test('候选里没有悟道事件时原样返回', () => {
        const candidates: [number, number][] = [[plainId, 1]]
        const weighted = weightEvents(candidates, makeState([], 1000))
        expect(weighted).toEqual(candidates)
    })
})

describe('气运之子', () => {
    test('正向属性事件权重 ×3，其他不变', () => {
        const candidates: [number, number][] = [
            [positiveId, 2],
            [plainId, 5],
        ]
        const weighted = weightEvents(candidates, makeState([LuckyTalentId], 0))
        expect(weighted.find(([id]) => id === positiveId)![1]).toBe(
            2 * LuckyMultiplier,
        )
        expect(weighted.find(([id]) => id === plainId)![1]).toBe(5)
    })
    test('没有该天赋时不加权', () => {
        const candidates: [number, number][] = [
            [positiveId, 2],
            [plainId, 5],
        ]
        const weighted = weightEvents(candidates, makeState([], 0))
        expect(weighted.find(([id]) => id === positiveId)![1]).toBe(2)
    })
    test('排除名单内的事件不被加权（净收益不为正 / 噪声事件）', () => {
        const excluded = [10217, 10314, 11290, 11291, 11335, 11346]
        const candidates = excluded.map(id => [id, 2] as [number, number])
        const weighted = weightEvents(candidates, makeState([LuckyTalentId], 0))
        for (const id of excluded) {
            expect(weighted.find(([x]) => x === id)![1]).toBe(2)
        }
    })
    test('排除名单外的正向事件仍然 ×3', () => {
        const kept = [10084, 10193, 10555, 20365, 20366]
        const candidates = kept.map(id => [id, 2] as [number, number])
        const weighted = weightEvents(candidates, makeState([LuckyTalentId], 0))
        for (const id of kept) {
            expect(weighted.find(([x]) => x === id)![1]).toBe(
                2 * LuckyMultiplier,
            )
        }
    })
    test('排除名单共 16 个事件', () => {
        expect(LuckyExcludedEvents.size).toBe(16)
    })
})
