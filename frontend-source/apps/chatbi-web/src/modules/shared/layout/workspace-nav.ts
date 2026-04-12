import { resolveCanonicalPath } from '../routing/route-parity'

export type WorkspaceNavItem = {
  id: string
  href: string
  label: string
  description?: string
  icon?: string
  activeGroupId?: string
  scopes: string[]
}

export type WorkspaceNavGroup = {
  id: string
  title: string
  description?: string
  items: WorkspaceNavItem[]
}

export const workspaceNavGroups: WorkspaceNavGroup[] = [
  {
    id: 'ask',
    title: '问答',
    description: '智能问答与会话追踪',
    items: [{ id: 'ask-workspace', href: '/chat', label: '智能问答', scopes: ['allow:model:*'] }]
  },
  {
    id: 'xpert',
    title: 'Xpert',
    description: '探索与工作空间路由',
    items: [
      {
        id: 'xpert-explore',
        href: '/explore',
        label: 'Explore',
        description: '探索 xpert 入口与能力索引',
        scopes: ['allow:model:*']
      },
      {
        id: 'xpert-workspace',
        href: '/xpert/w',
        label: 'Workbench',
        description: '工作空间及子页面入口',
        scopes: ['allow:model:*']
      },
      {
        id: 'xpert-expert-detail',
        href: '/xpert/x',
        label: 'Expert Detail',
        description: '专家详情与运行 tabs',
        scopes: ['allow:model:*']
      }
    ]
  },
  {
    id: 'bi',
    title: 'BI',
    description: '仪表盘、模型、项目与组织',
    items: [
      {
        id: 'bi-dashboard',
        href: '/dashboard',
        label: 'Dashboard',
        description: '今日、目录与趋势总览',
        scopes: ['allow:model:*']
      },
      {
        id: 'bi-models',
        href: '/models',
        label: 'Models',
        description: '语义模型治理入口',
        scopes: ['allow:model:*']
      },
      {
        id: 'bi-project',
        href: '/project',
        label: 'Project',
        description: '故事与指标协作',
        scopes: ['allow:model:*']
      },
      {
        id: 'bi-indicator-app',
        href: '/indicator-app',
        label: 'Indicator App',
        description: '指标应用入口',
        scopes: ['allow:indicator:*']
      },
      {
        id: 'bi-indicator-market',
        href: '/indicator/market',
        label: 'Indicator Market',
        description: '指标契约与市场清单',
        scopes: ['allow:indicator:*']
      },
      {
        id: 'bi-data',
        href: '/data',
        label: 'Data',
        description: '数据源与数据工厂兼容入口',
        scopes: ['allow:model:*']
      },
      {
        id: 'bi-organization',
        href: '/organization',
        label: 'Organization',
        description: '组织治理入口',
        scopes: ['allow:model:*']
      }
    ]
  },
  {
    id: 'settings',
    title: '设置',
    description: '账号、组织与平台配置',
    items: [
      {
        id: 'settings-home',
        href: '/settings',
        label: '设置中心',
        description: '平台设置入口',
        scopes: ['allow:model:*']
      }
    ]
  },
  {
    id: 'governance',
    title: '治理',
    description: '语义/AI/指标/工具治理与审批',
    items: [
      {
        id: 'governance-overview',
        href: '/governance',
        label: '治理总览',
        description: '聚合视角与异常事件入口',
        scopes: ['allow:model:*']
      },
      {
        id: 'semantic-models',
        href: '/models',
        label: '语义治理',
        description: '模型审批与影响分析',
        activeGroupId: 'bi',
        scopes: ['allow:model:*']
      },
      {
        id: 'semantic-studio',
        href: '/semantic-studio',
        label: '语义建模工作台',
        description: '字段/关系编辑与发布',
        scopes: ['allow:model:*']
      },
      {
        id: 'indicator-contracts',
        href: '/indicator-contracts',
        label: '指标契约',
        description: '契约差异与兼容风险',
        scopes: ['allow:indicator:*']
      },
      {
        id: 'indicator-ops',
        href: '/indicator-app',
        label: '指标运营台',
        description: '导入/审批任务闭环',
        activeGroupId: 'bi',
        scopes: ['allow:indicator:*']
      },
      {
        id: 'indicator-consumers',
        href: '/indicator-consumers',
        label: '消费方注册',
        description: '注册关系与接入视图',
        scopes: ['allow:indicator:*']
      },
      {
        id: 'ai-providers',
        href: '/ai/providers',
        label: 'AI 注册与治理',
        description: 'Provider 与凭证状态',
        scopes: ['allow:write:model:*']
      },
      {
        id: 'toolset-actions',
        href: '/xpert/w',
        label: 'Xpert 工具工作台',
        description: '进入 xpert workbench 管理 builtin/custom/mcp 工具入口',
        activeGroupId: 'xpert',
        scopes: ['allow:write:model:*']
      },
      {
        id: 'toolset-learning',
        href: '/xpert/w',
        label: 'Xpert 工作流观察',
        description: '从 xpert workbench 进入执行学习与策略观察视图',
        activeGroupId: 'xpert',
        scopes: ['allow:model:*']
      }
    ]
  },
  {
    id: 'collaboration',
    title: '协作',
    description: '洞察、故事与动态运营',
    items: [
      { id: 'insights', href: '/dashboard', label: '洞察', description: '洞察状态与反馈闭环', activeGroupId: 'bi', scopes: ['allow:model:*'] },
      { id: 'collections', href: '/collections', label: '收藏集', description: 'Insight 收藏与复用', scopes: ['allow:model:*'] },
      { id: 'stories', href: '/project', label: '故事', description: '内容编排与发布', activeGroupId: 'bi', scopes: ['allow:model:*'] },
      { id: 'feed', href: '/feed', label: '动态流', description: '关键事件与已读跟踪', scopes: ['allow:model:*'] }
    ]
  },
  {
    id: 'ops',
    title: '运维',
    description: '告警、报表与追踪联动',
    items: [
      { id: 'ops-dashboard', href: '/ops', label: '运维总览', description: '指标与事件总览', scopes: ['allow:model:*'] },
      { id: 'ops-alerts', href: '/ops/alerts', label: '告警', description: '告警识别与批量处理', scopes: ['allow:model:*'] },
      { id: 'ops-reports', href: '/ops/reports', label: '报表', description: '消耗与健康报表', scopes: ['allow:model:*'] },
      { id: 'ops-traces', href: '/ops/traces', label: '追踪', description: '调用链与动作回放', scopes: ['allow:model:*'] }
    ]
  }
]

export function isNavItemActive(pathname: string, itemOrHref: WorkspaceNavItem | string) {
  const canonicalPathname = resolveCanonicalPath(pathname)
  const canonicalHref = resolveCanonicalPath(typeof itemOrHref === 'string' ? itemOrHref : itemOrHref.href)
  return canonicalPathname === canonicalHref || canonicalPathname.startsWith(`${canonicalHref}/`)
}

export function resolveActiveGroup(pathname: string, groups: WorkspaceNavGroup[] = workspaceNavGroups) {
  const matchingGroupIds = new Set<string>()

  for (const group of groups) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item)) {
        matchingGroupIds.add(item.activeGroupId ?? group.id)
      }
    }
  }

  for (const group of groups) {
    if (matchingGroupIds.has(group.id)) {
      return group
    }
  }

  return groups[0] ?? workspaceNavGroups[0]
}
