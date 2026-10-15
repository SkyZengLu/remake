import { useMemo } from 'react'
import {
    useTalentPuller,
    useTalentPicker,
    useTalentClear,
    useTalentSubmit,
    useSubmitIsEnable,
    useMode,
    Mode,
} from '@remake/hooks'
import { talents as allTalents } from '@remake/data'
import { PullCount, dev } from '@/config'
import { toastMsg } from '@/toast'
import Talent from '@/components/Talent'
import './Pick.css'

export function Pick() {
    const mode = useMode()
    const isCustom = mode === Mode.Custom
    const isCheat = mode === Mode.Cheat
    /** 两种「列出全部天赋」的模式：我的命运我做主 / 作弊模式 */
    const isFree = isCustom || isCheat
    /** 作弊模式可以全选；我的命运我做主上限 10 个 */
    const limit = isCheat ? allTalents.size : isCustom ? 10 : undefined

    const [pulled, puller] = useTalentPuller()
    const [talents, picker] = useTalentPicker(limit)
    const clear = useTalentClear()
    const { enabled, min, max } = useSubmitIsEnable(
        isFree ? 0 : undefined,
        limit,
    )
    const submit = useTalentSubmit(enabled)
    const freeList = useMemo(
        () =>
            Array.from(allTalents.keys()).sort((a, b) => {
                const ga = allTalents.get(a)?.grade ?? 0
                const gb = allTalents.get(b)?.grade ?? 0
                return gb - ga || a - b
            }),
        [],
    )
    const msg = enabled
        ? '下一步'
        : `请选取 ${min == max ? min : `${min}~${max}`} 个天赋`
    const handleSubmit = () => {
        if (enabled) return submit()
        toastMsg(msg, 'pick-toast')
    }
    if (isFree) {
        const title = isCheat ? '作弊模式' : '我的命运我做主！'
        const hint = isCheat
            ? `全部天赋已列出（共 ${allTalents.size} 个） · 可以全选 · 点击可取消`
            : '全部天赋已列出 · 最多选择 10 个 · 点击可取消'
        const cap = isCheat ? `/${allTalents.size}` : '/10'
        const freeMsg = `开始新人生 · 已选 ${talents.size}${cap}`
        return (
            <div className="screen talent-pick custom-pick">
                <div className="section custom-header">
                    <div className="title">{title}</div>
                    <div className="custom-hint">{hint}</div>
                </div>
                <ul className="talent-list custom-talent-list">
                    {freeList.map(id => (
                        <li key={id} onClick={() => picker(id)}>
                            <Talent id={id} selected={talents.has(id)} />
                        </li>
                    ))}
                </ul>
                <div className="controls">
                    <button className="secondary" onClick={clear}>
                        清空
                    </button>
                    <button
                        className={enabled ? 'primary' : 'error'}
                        onClick={handleSubmit}
                    >
                        {freeMsg}
                    </button>
                </div>
            </div>
        )
    }
    if (!pulled)
        return (
            <div className="screen talent-pick">
                <button
                    className="primary font-mono focus"
                    onClick={() => puller()}
                >
                    {PullCount} 连抽!
                </button>
            </div>
        )
    const ps = dev.locked
        ? Array.from(new Set([...dev.locked, ...pulled]))
        : pulled
    return (
        <div className="screen talent-pick">
            <ul className="talent-list">
                {ps.map(id => (
                    <li key={id} onClick={() => picker(id)}>
                        <Talent id={id} selected={talents.has(id)} />
                    </li>
                ))}
            </ul>
            <button
                className={enabled ? 'primary' : 'error'}
                onClick={handleSubmit}
            >
                {msg}
            </button>
        </div>
    )
}
export default Pick
