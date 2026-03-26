import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ActualEntry } from "@/types/kpi.types"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCountUp } from "@/hooks/useCountUp"

type Props = {
  rows: ActualEntry[]
}

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]

export default function PerformanceCharts({ rows }: Props) {
  const cssVar = (name: string) => `hsl(var(${name}))`
  const [leaderboardMode, setLeaderboardMode] = useState<"top" | "bottom">("top")

  /** TOTAL SALES (currency) by executive — same as Vision Excel. */
  const revenueData = useMemo(() => {
    const execs = [...new Set(rows.filter((r) => r.role === "sales-executive").map((r) => r.employeeName))]
    return execs.map((name) => {
      const r = rows.find((x) => x.employeeName === name && x.kpiName === "TOTAL SALES")
      return {
        name,
        target: r ? r.target / 1_000_000 : 0,
        actual: r ? r.actual / 1_000_000 : 0,
      }
    })
  }, [rows])

  /** Synthetic month ramp toward YTD % (workbook has no monthly split). */
  const monthlyTrendData = useMemo(() => {
    const g = (team: string) => rows.find((x) => x.employeeName === team && x.kpiName === "TOTAL SALES")?.attainmentPct ?? 0
    const imp = g("Import Team")
    const exp = g("Export Team")
    const sea = g("Sea Freight Dept")
    return MONTHS.map((month, i) => {
      const k = 0.88 + i * 0.024
      return {
        month,
        importTeam: Math.min(110, imp * k),
        exportTeam: Math.min(110, exp * k),
        seaManager: Math.min(110, sea * k),
      }
    })
  }, [rows])

  const heatmapRows = useMemo(() => {
    const kpis = [...new Set(rows.map((r) => r.kpiName))]
    const people = [...new Set(rows.map((r) => r.employeeName))]
    return kpis.map((kpi) => ({
      kpi,
      cells: people.map((name) => rows.find((r) => r.employeeName === name && r.kpiName === kpi)),
    }))
  }, [rows])

  const employees = useMemo(() => [...new Set(rows.map((r) => r.employeeName))], [rows])
  const trendWaterfall = useMemo(() => {
    const hq = rows.find((x) => x.employeeName === "Corporate HQ" && x.kpiName === "TOTAL SALES")
    const ytd = hq?.attainmentPct ?? 0
    return MONTHS.map((month, i) => {
      const k = 0.9 + i * 0.02
      return {
        month,
        target: 100,
        actual: Math.min(110, ytd * k),
      }
    })
  }, [rows])

  const leaderboard = useMemo(() => {
    const map = new Map<string, { name: string; role: string; avg: number; trend: number[]; met: number; total: number }>()
    for (const name of employees) {
      const personRows = rows.filter((r) => r.employeeName === name)
      const avg = personRows.reduce((sum, r) => sum + r.attainmentPct, 0) / Math.max(personRows.length, 1)
      map.set(name, {
        name,
        role: personRows[0]?.role ?? "-",
        avg,
        trend: personRows[0]?.trend ?? [],
        met: personRows.filter((r) => r.attainmentPct >= 100).length,
        total: personRows.length,
      })
    }
    const arr = [...map.values()].sort((a, b) => (leaderboardMode === "top" ? b.avg - a.avg : a.avg - b.avg))
    return arr.slice(0, 5)
  }, [rows, employees, leaderboardMode])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">Revenue Attainment by Executive</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={cssVar("--chart-grid")} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${Number(value ?? 0).toFixed(1)}M`} />
              <Tooltip formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}M`, ""]} />
              <Legend />
              <ReferenceLine
                y={revenueData.reduce((m, d) => Math.max(m, d.target), 0)}
                stroke={cssVar("--chart-grid")}
                strokeDasharray="4 4"
              />
              <Bar dataKey="target" name="Target" fill={cssVar("--chart-grid")} radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill={cssVar("--chart-target")} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        </Card>

        <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">Monthly Attainment Trend %</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={cssVar("--chart-grid")} />
              <XAxis dataKey="month" />
              <YAxis domain={[70, 110]} />
              <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, ""]} />
              <Legend />
              <ReferenceLine y={100} stroke={cssVar("--chart-grid")} strokeDasharray="4 4" label="Target" />
              <Line type="monotone" dataKey="importTeam" name="Import Team" stroke={cssVar("--chart-target")} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="exportTeam" name="Export Team" stroke={cssVar("--chart-actual")} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="seaManager" name="Sea Manager" stroke={cssVar("--chart-alt")} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-base">Attainment Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <div className="grid gap-1" style={{ gridTemplateColumns: `180px repeat(${employees.length}, minmax(90px, 1fr))` }}>
                <div className="font-medium text-sm p-2">KPI / Employee</div>
                {employees.map((name) => <div key={name} className="text-xs font-medium p-2">{name}</div>)}
                {heatmapRows.map((row) => (
                  <div key={row.kpi} className="contents">
                    <div key={`${row.kpi}-name`} className="text-xs p-2 font-medium">{row.kpi}</div>
                    {row.cells.map((cell, idx) => {
                      const value = cell?.attainmentPct ?? 0
                      const bg = value >= 100 ? "bg-green-200" : value >= 85 ? "bg-amber-200" : "bg-red-200"
                      return (
                        <div
                          key={`${row.kpi}-${employees[idx]}`}
                          title={`${employees[idx]} | ${row.kpi} | ${value.toFixed(1)}%`}
                          className={`h-12 rounded text-xs font-semibold flex items-center justify-center ${bg}`}
                        >
                          {value.toFixed(0)}%
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-base">KPI Trend Waterfall</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendWaterfall}>
                <CartesianGrid strokeDasharray="3 3" stroke={cssVar("--chart-grid")} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="target" stroke={cssVar("--chart-grid")} strokeDasharray="6 4" name="Target line" />
                <Bar dataKey="actual" fill={cssVar("--chart-target")} name="Actual bar" />
                <ReferenceLine y={100} stroke={cssVar("--chart-grid")} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Top Performers - FY 2025-26 YTD</CardTitle>
          <div className="inline-flex rounded-md border p-0.5">
            <Button size="sm" variant={leaderboardMode === "top" ? "secondary" : "ghost"} onClick={() => setLeaderboardMode("top")}>
              Top Performers
            </Button>
            <Button size="sm" variant={leaderboardMode === "bottom" ? "secondary" : "ghost"} onClick={() => setLeaderboardMode("bottom")}>
              Needs Attention
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.map((person, index) => <LeaderboardItem key={person.name} person={person} index={index} mode={leaderboardMode} />)}
        </CardContent>
      </Card>
    </div>
  )
}

function LeaderboardItem({
  person,
  index,
  mode,
}: {
  person: { name: string; role: string; avg: number; trend: number[]; met: number; total: number }
  index: number
  mode: "top" | "bottom"
}) {
  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`
  const rank = useCountUp(index + 1, 800, `${mode}-${person.name}`)
  return (
    <div className="border rounded-md p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="text-xl min-w-8 text-center">{index < 3 ? medal : Math.round(rank)}</div>
        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold">
          {person.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <div>
          <div className="font-medium">{person.name}</div>
          <Badge variant="outline" className="capitalize">{person.role.replace("-", " ")}</Badge>
        </div>
      </div>
      <div className={person.avg >= 100 ? "text-green-700 font-semibold" : person.avg < 85 ? "text-red-700 font-semibold" : "text-amber-700 font-semibold"}>
        {person.avg.toFixed(1)}%
      </div>
      <svg width="70" height="20" viewBox="0 0 70 20">
        <polyline
          fill="none"
          stroke="hsl(var(--chart-target))"
          strokeWidth="2"
          points={person.trend.map((v, i) => `${(i / Math.max(person.trend.length - 1, 1)) * 70},${20 - (v / 120) * 20}`).join(" ")}
        />
      </svg>
      <div className="text-sm text-muted-foreground">KPIs Met: {person.met}/{person.total}</div>
    </div>
  )
}
