/** 4人の持ち点合計 */
export const TOTAL_SCORE = 100000

/** 返し点（ポイント計算の基準点） */
export const RETURN_SCORE = 30000

/** 順位点（1位〜4位） */
export const RANK_POINTS = [50, 10, -10, -30] as const

/**
 * 持ち点から順位とポイントを計算する。
 *
 * - 同点は同順位とし、該当する順位点を平均して分け合う（例: 2位タイ → (10 + -10) / 2）
 * - ポイント = (持ち点 - 返し点) / 1000 + 順位点。小数第1位で四捨五入する
 * - 戻り値は順位の昇順（同順位は入力順）
 */
export function calculateGamePoints<T extends { score: number }>(players: T[]): Array<T & { rank: number; points: number }> {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  const ranked: Array<T & { rank: number }> = []
  let currentRank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i - 1].score !== sorted[i].score) {
      currentRank = i + 1
    }
    ranked.push({ ...sorted[i], rank: currentRank })
  }

  return ranked.map((player) => {
    const sameRankCount = ranked.filter((p) => p.rank === player.rank).length

    let totalRankPoints = 0
    for (let i = player.rank - 1; i < player.rank - 1 + sameRankCount; i++) {
      totalRankPoints += RANK_POINTS[i] ?? 0
    }

    const points = (player.score - RETURN_SCORE) / 1000 + totalRankPoints / sameRankCount
    return { ...player, points: Math.round(points * 10) / 10 }
  })
}
