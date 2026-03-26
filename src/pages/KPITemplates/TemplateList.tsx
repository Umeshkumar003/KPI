import { Layers } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTenantKpiTemplates } from "@/hooks/useTenantScope"
import { EmptyState } from "@/components/ui/empty-state"

export default function TemplateList() {
  const navigate = useNavigate()
  const templates = useTenantKpiTemplates()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>KPI Templates</CardTitle>
        <Button onClick={() => navigate("/kpi-templates/new")}>New Template</Button>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No KPI templates"
            description="Create a template to start configuring scorecards."
            action={{ label: "New Template", onClick: () => navigate("/kpi-templates/new") }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>KPI Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.templateCode}</TableCell>
                    <TableCell>{template.templateName}</TableCell>
                    <TableCell className="capitalize">{(template.applicableRoles ?? []).join(", ")}</TableCell>
                    <TableCell className="capitalize">{template.periodType}</TableCell>
                    <TableCell>{template.kpiItems.length}</TableCell>
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
