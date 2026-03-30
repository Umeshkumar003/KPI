import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTenantKpiItems } from "@/hooks/useTenantScope"
import { EmptyState } from "@/components/ui/empty-state"

export default function KPIItemList() {
  const navigate = useNavigate()
  const items = useTenantKpiItems()
  const rows = useMemo(() => items, [items])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>KPI Items</CardTitle>
        <Button onClick={() => navigate("/kpi-items/new")}>
          <Plus className="mr-2 h-4 w-4" /> New KPI
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No KPI items"
            description="Create a KPI item to start building templates."
            action={{ label: "Create KPI item", onClick: () => navigate("/kpi-items/new") }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.kpiCode}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="capitalize">{item.periodType}</TableCell>
                    <TableCell>{item.weight}%</TableCell>
                    <TableCell className="capitalize">{item.statusId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
