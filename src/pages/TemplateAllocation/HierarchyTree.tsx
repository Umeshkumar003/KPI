import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { ChevronDown, ChevronRight, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { HierarchyLevel, HierarchyNode } from "@/types/kpi.types"

export const HIERARCHY_SEED: HierarchyNode[] = [
  {
    id: "leadership",
    name: "Corporate HQ",
    role: "leadership",
    region: "Global",
    parentId: null,
    allocationStatus: "allocated",
    children: [
      {
        id: "branch-dubai",
        name: "Dubai, UAE",
        role: "branch-head",
        region: "UAE",
        parentId: "leadership",
        allocationStatus: "allocated",
        children: [
          {
            id: "sm-sea",
            name: "Sea Freight Dept",
            role: "sales-manager",
            region: "UAE",
            parentId: "branch-dubai",
            allocationStatus: "partial",
            children: [
              {
                id: "sl-import",
                name: "Import Team",
                role: "sales-lead",
                region: "UAE",
                parentId: "sm-sea",
                allocationStatus: "partial",
                children: [
                  {
                    id: "se-ahmed",
                    name: "Dileep",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-import",
                    allocationStatus: "allocated",
                    children: [],
                  },
                  {
                    id: "se-priya",
                    name: "Krishna",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-import",
                    allocationStatus: "allocated",
                    children: [],
                  },
                  {
                    id: "se-sajeer",
                    name: "Sajeer",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-import",
                    allocationStatus: "partial",
                    children: [],
                  },
                  {
                    id: "se-akshai",
                    name: "Akshai",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-import",
                    allocationStatus: "partial",
                    children: [],
                  },
                ],
              },
              {
                id: "sl-export",
                name: "Export Team",
                role: "sales-lead",
                region: "UAE",
                parentId: "sm-sea",
                allocationStatus: "allocated",
                children: [
                  {
                    id: "se-ravi",
                    name: "Guru",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-export",
                    allocationStatus: "partial",
                    children: [],
                  },
                  {
                    id: "se-sara",
                    name: "Vishnu",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-export",
                    allocationStatus: "none",
                    children: [],
                  },
                  {
                    id: "se-vishnu-muraly",
                    name: "Vishnu Muraly",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-export",
                    allocationStatus: "partial",
                    children: [],
                  },
                  {
                    id: "se-eric",
                    name: "Eric",
                    role: "sales-executive",
                    region: "UAE",
                    parentId: "sl-export",
                    allocationStatus: "partial",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

type Props = {
  nodes: HierarchyNode[]
  selectedId: string | null
  onSelect: (node: HierarchyNode) => void
  selectedNodeIds: Set<string>
  onSelectedNodeIdsChange: (ids: Set<string>) => void
  statusFilter: "all" | "allocated" | "partial" | "none"
  onStatusFilterChange: (status: "all" | "allocated" | "partial" | "none") => void
  levelFilter: "all" | HierarchyLevel
  onRequestBulkSetTargets: () => void
}

const roleBadgeByRole: Record<HierarchyLevel, { className: string; label: string }> = {
  leadership: { label: "Leadership", className: "border-orange-200 bg-orange-50 text-brand-blue" },
  "branch-head": { label: "Branch Head", className: "border-purple-200 bg-purple-50 text-purple-700" },
  "sales-manager": { label: "Sales Mgr", className: "border-brand-teal/30 bg-brand-teal/10 text-brand-teal" },
  "sales-lead": { label: "Lead", className: "border-amber-200 bg-amber-50 text-amber-700" },
  "sales-executive": { label: "Sales Exec", className: "border-slate-200 bg-slate-50 text-slate-700" },
}

function getInitialExpandedIds(seed: HierarchyNode[]): Set<string> {
  // Expand the full first path to make the hierarchy immediately usable.
  const next = new Set<string>()
  const walk = (nodes: HierarchyNode[]) => {
    for (const n of nodes) {
      if (n.children.length > 0) {
        next.add(n.id)
        walk(n.children)
        return
      }
    }
  }
  walk(seed)
  return next
}

function findNodeLabelById(nodes: HierarchyNode[], id: string): HierarchyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNodeLabelById(node.children, id)
    if (found) return found
  }
  return null
}

function flattenNodes(nodes: HierarchyNode[]): HierarchyNode[] {
  const out: HierarchyNode[] = []
  const walk = (list: HierarchyNode[]) => {
    for (const node of list) {
      out.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return out
}

function getAncestorIds(nodes: HierarchyNode[], targetId: string): string[] {
  const path: string[] = []
  const walk = (list: HierarchyNode[], ancestors: string[]): boolean => {
    for (const node of list) {
      if (node.id === targetId) {
        path.push(...ancestors)
        return true
      }
      if (walk(node.children, [...ancestors, node.id])) return true
    }
    return false
  }
  walk(nodes, [])
  return path
}

function filterTreeByName(nodes: HierarchyNode[], query: string): HierarchyNode[] {
  if (!query.trim()) return nodes
  const normalized = query.trim().toLowerCase()
  const filterNode = (node: HierarchyNode): HierarchyNode | null => {
    const children = node.children.map(filterNode).filter(Boolean) as HierarchyNode[]
    const isMatch = node.name.toLowerCase().includes(normalized)
    if (!isMatch && children.length === 0) return null
    return { ...node, children }
  }
  return nodes.map(filterNode).filter(Boolean) as HierarchyNode[]
}

function filterTreeByStatusAndLevel(
  nodes: HierarchyNode[],
  statusFilter: "all" | "allocated" | "partial" | "none",
  levelFilter: "all" | HierarchyLevel,
): HierarchyNode[] {
  const filterNode = (node: HierarchyNode): HierarchyNode | null => {
    const children = node.children.map(filterNode).filter(Boolean) as HierarchyNode[]
    const statusOk = statusFilter === "all" || node.allocationStatus === statusFilter
    const levelOk = levelFilter === "all" || node.role === levelFilter
    if (!statusOk || !levelOk) {
      if (children.length === 0) return null
      return { ...node, children }
    }
    return { ...node, children }
  }
  return nodes.map(filterNode).filter(Boolean) as HierarchyNode[]
}

function getSearchParts(name: string, query: string): { before: string; match: string; after: string } | null {
  if (!query.trim()) return null
  const lowerName = name.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerName.indexOf(lowerQuery)
  if (idx < 0) return null
  return {
    before: name.slice(0, idx),
    match: name.slice(idx, idx + query.length),
    after: name.slice(idx + query.length),
  }
}

type TreeNodeProps = {
  node: HierarchyNode
  depth: number
  selectedId: string | null
  onSelect: (node: HierarchyNode) => void
  expandedIds: Set<string>
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>
  searchQuery: string
  selectedNodeIds: Set<string>
  firstSelectedRole: HierarchyLevel | null
  onToggleChecked: (node: HierarchyNode, checked: boolean) => void
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  setExpandedIds,
  searchQuery,
  selectedNodeIds,
  firstSelectedRole,
  onToggleChecked,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = hasChildren && expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const role = roleBadgeByRole[node.role]
  const isChecked = selectedNodeIds.has(node.id)
  const isSameLevelOrEmpty = !firstSelectedRole || firstSelectedRole === node.role

  const allocationDotClassName = (() => {
    if (node.allocationStatus === "allocated") return "bg-emerald-500"
    if (node.allocationStatus === "partial") return "bg-amber-500"
    return "border-2 border-slate-300 bg-transparent"
  })()

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex items-center gap-2 pr-3 py-2 cursor-pointer rounded-sm select-none hover:bg-slate-100",
          isSelected ? "bg-orange-50 border-l-2 border-brand-blue" : "border-l-2 border-transparent",
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => {
          onSelect(node)
          if (!hasChildren) return
          setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(node.id)) next.delete(node.id)
            else next.add(node.id)
            return next
          })
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return
          e.preventDefault()
          onSelect(node)
          if (!hasChildren) return
          setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(node.id)) next.delete(node.id)
            else next.add(node.id)
            return next
          })
        }}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded ? "rotate-90" : "rotate-0",
            )}
          />
        ) : (
          <span className="h-4 w-4" aria-hidden="true" />
        )}
        <Checkbox
          checked={isChecked}
          disabled={!isSameLevelOrEmpty && !isChecked}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={(checked) => onToggleChecked(node, checked === true)}
          aria-label={`Select ${node.name}`}
        />

        <Badge variant="outline" className={cn("border-0", role.className)}>{role.label}</Badge>
        <span className="text-sm truncate">
          {(() => {
            const parts = getSearchParts(node.name, searchQuery)
            if (!parts) return node.name
            return (
              <>
                {parts.before}
                <mark className="bg-yellow-100">{parts.match}</mark>
                {parts.after}
              </>
            )
          })()}
        </span>

        <span className="ml-auto flex items-center justify-center">
          <span
            className={cn("h-3.5 w-3.5 rounded-full", allocationDotClassName)}
            aria-hidden="true"
          />
        </span>
      </div>

      {hasChildren && isExpanded ? (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
              searchQuery={searchQuery}
              selectedNodeIds={selectedNodeIds}
              firstSelectedRole={firstSelectedRole}
              onToggleChecked={onToggleChecked}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function HierarchyTree({
  nodes,
  selectedId,
  onSelect,
  selectedNodeIds,
  onSelectedNodeIdsChange,
  statusFilter,
  onStatusFilterChange,
  levelFilter,
  onRequestBulkSetTargets,
}: Props) {
  const expandedSeed = useMemo(() => getInitialExpandedIds(nodes), [nodes])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(expandedSeed)
  const [searchQuery, setSearchQuery] = useState("")
  const flatNodes = useMemo(() => flattenNodes(nodes), [nodes])
  const selectedNodes = useMemo(() => flatNodes.filter((n) => selectedNodeIds.has(n.id)), [flatNodes, selectedNodeIds])
  const firstSelectedRole = selectedNodes[0]?.role ?? null

  const summary = useMemo(() => {
    return flatNodes.reduce(
      (acc, node) => {
        acc.total += 1
        if (node.allocationStatus === "allocated") acc.allocated += 1
        else if (node.allocationStatus === "partial") acc.partial += 1
        else acc.none += 1
        return acc
      },
      { total: 0, allocated: 0, partial: 0, none: 0 },
    )
  }, [flatNodes])

  const filteredByStatusAndLevel = useMemo(
    () => filterTreeByStatusAndLevel(nodes, statusFilter, levelFilter),
    [nodes, statusFilter, levelFilter],
  )
  const filteredNodes = useMemo(
    () => filterTreeByName(filteredByStatusAndLevel, searchQuery),
    [filteredByStatusAndLevel, searchQuery],
  )

  const toggleChecked = (node: HierarchyNode, checked: boolean) => {
    onSelectedNodeIdsChange(
      (() => {
        const next = new Set(selectedNodeIds)
        if (checked) next.add(node.id)
        else next.delete(node.id)
        return next
      })(),
    )
  }

  // Keep selection visible: if user selects a node that is collapsed, expand its path.
  useEffect(() => {
    if (!selectedId) return
    const selectedNode = findNodeLabelById(nodes, selectedId)
    if (!selectedNode) return
    const idsToExpand = getAncestorIds(nodes, selectedId)
    if (idsToExpand.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds((prev) => {
      const next = new Set(prev)
      idsToExpand.forEach((id) => next.add(id))
      return next
    })
  }, [selectedId, nodes])

  useEffect(() => {
    if (!searchQuery.trim()) return
    const toExpand = new Set<string>()
    const walk = (list: HierarchyNode[], ancestors: string[]) => {
      for (const node of list) {
        if (node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          ancestors.forEach((a) => toExpand.add(a))
        }
        walk(node.children, [...ancestors, node.id])
      }
    }
    walk(filteredByStatusAndLevel, [])
    if (toExpand.size === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds((prev) => {
      const next = new Set(prev)
      toExpand.forEach((id) => next.add(id))
      return next
    })
  }, [searchQuery, filteredByStatusAndLevel])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">Organisation Hierarchy</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8"
            placeholder="Search people or teams"
          />
          {searchQuery ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {selectedNodeIds.size >= 2 ? (
          <Button type="button" size="sm" className="mt-2 w-full" onClick={onRequestBulkSetTargets}>
            Bulk Set Targets
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="space-y-0.5 px-2">
          {filteredNodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
              searchQuery={searchQuery}
              selectedNodeIds={selectedNodeIds}
              firstSelectedRole={firstSelectedRole}
              onToggleChecked={toggleChecked}
            />
          ))}
        </div>
      </div>

      <div className="border-t px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <button type="button" className="hover:underline" onClick={() => onStatusFilterChange("all")}>
            {summary.total} people total
          </button>
          <span>|</span>
          <button
            type="button"
            className={cn("hover:underline", statusFilter === "allocated" ? "font-semibold text-emerald-700" : "")}
            onClick={() => onStatusFilterChange(statusFilter === "allocated" ? "all" : "allocated")}
          >
            {summary.allocated} allocated
          </button>
          <span>|</span>
          <button
            type="button"
            className={cn("hover:underline", statusFilter === "partial" ? "font-semibold text-amber-700" : "")}
            onClick={() => onStatusFilterChange(statusFilter === "partial" ? "all" : "partial")}
          >
            {summary.partial} partial
          </button>
          <span>|</span>
          <button
            type="button"
            className={cn("hover:underline", statusFilter === "none" ? "font-semibold text-slate-700" : "")}
            onClick={() => onStatusFilterChange(statusFilter === "none" ? "all" : "none")}
          >
            {summary.none} not set
          </button>
        </div>
      </div>

      <div className="border-t px-4 py-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Allocated
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
          Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-slate-300" aria-hidden="true" />
          Not set
        </span>
      </div>
    </div>
  )
}
