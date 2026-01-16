---
name: dashboard-design
description: |
  データ可視化に優れたダッシュボード設計スキル。
  レイアウト、チャート選択、KPIカード、フィルター、
  リアルタイム更新、エクスポート機能。
  管理画面、分析ダッシュボード、レポート画面構築時に使用。
  トリガー: ダッシュボード、管理画面、分析、チャート、KPI、グラフ
---

# Dashboard Design Skill

## Layout Patterns

### Sidebar + Main Content
```tsx
<div className="flex h-screen">
  {/* Sidebar */}
  <aside className="w-64 border-r bg-card flex-shrink-0 hidden lg:block">
    <div className="p-4">
      <Logo />
    </div>
    <nav className="mt-4">
      <NavItems />
    </nav>
  </aside>

  {/* Main */}
  <main className="flex-1 overflow-auto">
    {/* Header */}
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <Breadcrumb />
        <div className="flex items-center gap-4">
          <SearchCommand />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>

    {/* Content */}
    <div className="p-6">
      {children}
    </div>
  </main>
</div>
```

### KPI Cards Row
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        総売上
      </CardTitle>
      <DollarSign className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">¥12,543,000</div>
      <p className="text-xs text-muted-foreground">
        <span className="text-green-500">+12.5%</span> 前月比
      </p>
    </CardContent>
  </Card>
  {/* More cards... */}
</div>
```

## Chart Selection Guide

| データタイプ | 推奨チャート |
|------------|------------|
| 時系列推移 | Line Chart, Area Chart |
| カテゴリ比較 | Bar Chart |
| 構成比 | Pie Chart, Donut Chart |
| 分布 | Histogram, Scatter |
| KPI | Number Card + Sparkline |

### Recharts Implementation
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>売上推移</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Data Table

```tsx
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'id',
    header: '注文ID',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue('id')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'ステータス',
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.getValue('status')]}>
        {row.getValue('status')}
      </Badge>
    ),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">金額</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        ¥{row.getValue<number>('amount').toLocaleString()}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>詳細を見る</DropdownMenuItem>
          <DropdownMenuItem>編集</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

// Usage
<DataTable
  columns={columns}
  data={orders}
  searchKey="id"
  searchPlaceholder="注文IDで検索..."
/>
```

## Filters & Controls

```tsx
<div className="flex flex-wrap items-center gap-4 mb-6">
  {/* Date Range */}
  <DatePickerWithRange
    date={dateRange}
    onDateChange={setDateRange}
  />

  {/* Category Filter */}
  <Select value={category} onValueChange={setCategory}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="カテゴリ" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">すべて</SelectItem>
      <SelectItem value="sales">売上</SelectItem>
      <SelectItem value="orders">注文</SelectItem>
    </SelectContent>
  </Select>

  {/* Search */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="検索..."
      className="pl-9 w-[200px]"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  {/* Export */}
  <Button variant="outline" className="ml-auto">
    <Download className="mr-2 h-4 w-4" />
    エクスポート
  </Button>
</div>
```

## Real-time Updates

```tsx
// Supabase Realtime
function useRealtimeData<T>(table: string, initialData: T[]) {
  const [data, setData] = useState(initialData)
  
  useEffect(() => {
    const supabase = createBrowserClient()
    
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setData(prev => [payload.new as T, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => prev.map(item => 
            (item as any).id === payload.new.id ? payload.new as T : item
          ))
        } else if (payload.eventType === 'DELETE') {
          setData(prev => prev.filter(item => 
            (item as any).id !== payload.old.id
          ))
        }
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [table])
  
  return data
}
```

## Checklist

- [ ] レスポンシブレイアウト
- [ ] KPIカード配置
- [ ] 適切なチャート選択
- [ ] フィルター機能
- [ ] データテーブル（ソート・検索・ページネーション）
- [ ] エクスポート機能
- [ ] ローディング状態
- [ ] 空状態
