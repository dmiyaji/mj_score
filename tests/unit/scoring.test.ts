import { describe, expect, it } from "vitest"
import { calculateGamePoints, RANK_POINTS, RETURN_SCORE, TOTAL_SCORE } from "@/lib/scoring"

const players = (...scores: number[]) => scores.map((score, i) => ({ name: `P${i + 1}`, score }))

const sumPoints = (results: Array<{ points: number }>) =>
  Math.round(results.reduce((sum, r) => sum + r.points, 0) * 10) / 10

describe("calculateGamePoints", () => {
  it("同点なし: 素点と順位点からポイントを計算し、順位順に返す", () => {
    const result = calculateGamePoints(players(15000, 45000, 10000, 30000))

    expect(result.map((r) => [r.name, r.rank, r.points])).toEqual([
      ["P2", 1, 65],
      ["P4", 2, 10],
      ["P1", 3, -25],
      ["P3", 4, -50],
    ])
  })

  it("持ち点合計が 10 万点ならポイント合計は 0 になる", () => {
    const result = calculateGamePoints(players(38000, 27000, 20000, 15000))
    expect(sumPoints(result)).toBeCloseTo(0)
  })

  it("2位タイ: 同順位とし、2位と3位の順位点を平均して分け合う", () => {
    const result = calculateGamePoints(players(40000, 25000, 25000, 10000))

    expect(result.map((r) => [r.name, r.rank, r.points])).toEqual([
      ["P1", 1, 60],
      ["P2", 2, -5], // (25000 - 30000) / 1000 + (10 + -10) / 2
      ["P3", 2, -5],
      ["P4", 4, -50],
    ])
    expect(sumPoints(result)).toBeCloseTo(0)
  })

  it("1位タイ: 1位と2位の順位点を平均する", () => {
    const result = calculateGamePoints(players(35000, 35000, 20000, 10000))

    expect(result.map((r) => [r.rank, r.points])).toEqual([
      [1, 35], // 5 + (50 + 10) / 2
      [1, 35],
      [3, -20],
      [4, -50],
    ])
  })

  it("3人タイ: 2〜4位の順位点を平均する", () => {
    const result = calculateGamePoints(players(40000, 20000, 20000, 20000))

    expect(result.map((r) => r.rank)).toEqual([1, 2, 2, 2])
    expect(result[1].points).toBeCloseTo(-10 + (10 - 10 - 30) / 3, 1)
    expect(result[1].points).toBe(-20)
  })

  it("全員同点: 全員 1 位で順位点の平均（+5）を受け取る", () => {
    const result = calculateGamePoints(players(25000, 25000, 25000, 25000))

    expect(result.every((r) => r.rank === 1)).toBe(true)
    expect(result.every((r) => r.points === 0)).toBe(true) // -5 + (50 + 10 - 10 - 30) / 4
  })

  it("同順位の並びは入力順を保つ", () => {
    const result = calculateGamePoints(players(10000, 30000, 30000, 30000))
    expect(result.map((r) => r.name)).toEqual(["P2", "P3", "P4", "P1"])
  })

  it("浮動小数点誤差を小数第1位で丸める", () => {
    // 0.3 + 50 などは誤差が出るため丸めが必要（持ち点は 100 点単位で入力される）
    const result = calculateGamePoints(players(30300, 29900, 25700, 14100))
    expect(result.map((r) => r.points)).toEqual([50.3, 9.9, -14.3, -45.9])
    expect(sumPoints(result)).toBeCloseTo(0)
  })

  it("入力の他プロパティを保持し、入力配列は変更しない", () => {
    const input = [
      { id: "a", score: 40000, teamId: "t1" },
      { id: "b", score: 30000, teamId: "t2" },
      { id: "c", score: 20000, teamId: "t1" },
      { id: "d", score: 10000, teamId: "t2" },
    ]
    const snapshot = structuredClone(input)

    const result = calculateGamePoints(input)

    expect(result[0]).toMatchObject({ id: "a", teamId: "t1", rank: 1 })
    expect(input).toEqual(snapshot)
  })

  it("ルール定数", () => {
    expect(TOTAL_SCORE).toBe(100000)
    expect(RETURN_SCORE).toBe(30000)
    expect(RANK_POINTS).toEqual([50, 10, -10, -30])
  })
})
