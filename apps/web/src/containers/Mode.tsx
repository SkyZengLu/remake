import { PullCount } from '@/config'
import { useModeChoose } from '@remake/hooks'
import { useCheatMode } from '@/storage/cheat'
import './Mode.css'

export function Mode() {
    const [Mode, choose] = useModeChoose()
    // 【作弊模式】只有导入带 cheatmode 标记的存档才会出现
    const cheatMode = useCheatMode()
    return (
        <div className="screen mode">
            <button onClick={() => choose(Mode.Classic)}>
                <div className="name">经典模式</div>
                <div className="description">
                    <span>{PullCount} 连抽天赋</span>
                    <span>自由分配属性</span>
                </div>
            </button>
            <button onClick={() => choose(Mode.Celebrity)}>
                <div className="name">名人模式</div>
                <div className="description">
                    <span>前世古代名人，重开到了现代</span>
                </div>
            </button>
            <button onClick={() => choose(Mode.Custom)}>
                <div className="name">我的命运我做主！</div>
                <div className="description">
                    <span>列出全部天赋</span>
                    <span>最多可选10个</span>
                </div>
            </button>
            {cheatMode && (
                <button onClick={() => choose(Mode.Cheat)}>
                    <div className="name">作弊模式</div>
                    <div className="description">
                        <span>列出全部天赋</span>
                        <span>可以全选</span>
                    </div>
                </button>
            )}
        </div>
    )
}

export default Mode
