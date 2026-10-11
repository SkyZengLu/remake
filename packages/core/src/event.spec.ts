import { expect, test, describe } from 'bun:test'
import { createState } from './state'
import { trigger } from './event'
import { enableMapSet } from 'immer'
enableMapSet()

describe('Event', () => {
    const profile = {
        times: 0,
        talents: new Set([]),
        achievements: new Set([]),
        events: new Set([]),
    }
    const allocation = {
        charm: 10,
        intelligence: 10,
        strength: 0,
        money: 0,
        spirit: 5,
    }

    test('branch 10003:0 [玉佩]', () => {
        const result = trigger(
            10003,
            createState(allocation, [1001, 1002, 1003]),
            profile,
        )
        expect(result.state.life).toBe(1)
        expect(result.state.events).toEqual(new Set([10003, 10004]))
        expect(result.triggers).toEqual([10003, 10004])
    })

    test('branch 10003:1 [死了]', () => {
        const result = trigger(10003, createState(allocation, []), profile)
        expect(result.state.life).toBe(0)
        expect(result.state.events).toEqual(new Set([10003, 10000]))
        expect(result.triggers).toEqual([10003, 10000])
    })

    // AGE 效果曾在上游未被实现，导致「回到100年前」「转世重生」等事件只改文案不改年龄
    test('AGE 效果：20390 运用时间大道回到100年前 → 年龄 -100', () => {
        const state = createState(allocation, [])
        state.props.current.age = 495
        state.props.highest.age = 495
        const result = trigger(20390, state, profile)
        expect(result.state.props.current.age).toBe(395)
        // 历史最高年龄不应被回退影响
        expect(result.state.props.highest.age).toBe(495)
    })

    test('AGE 效果：20409 转世重生 → 年龄 -500', () => {
        const state = createState(allocation, [])
        state.props.current.age = 500
        state.props.highest.age = 500
        const result = trigger(20409, state, profile)
        expect(result.state.props.current.age).toBe(0)
    })

    test('AGE 效果：11469 回到年轻时候 → 年龄 -50', () => {
        const state = createState(allocation, [])
        state.props.current.age = 60
        const result = trigger(11469, state, profile)
        expect(result.state.props.current.age).toBe(10)
    })

    test('AGE 效果：11468 时光倒流 → 年龄 -5', () => {
        const state = createState(allocation, [])
        state.props.current.age = 30
        const result = trigger(11468, state, profile)
        expect(result.state.props.current.age).toBe(25)
    })
})
