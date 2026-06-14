import { useEffect, useState, useCallback } from 'react'
import { useUserStore, type UserItem, type OperationLog } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import {
  Search, Plus, RefreshCw, Users, Shield, UserCheck, UserX,
  KeyRound, Trash2, Edit3, Eye, ChevronLeft, ChevronRight,
  FileText, X, Check, AlertTriangle, Lock,
} from 'lucide-react'

type TabType = 'users' | 'logs'
type LogTabType = 'operation' | 'login'

export default function UsersPage() {
  const {
    users, total, page, pageSize, loading, error,
    logs, logTotal, logPage, logPageSize, logLoading,
    loginLogs, loginLogTotal, loginLogPage, loginLogPageSize, loginLogLoading,
    fetchUsers, createUser, updateUser, resetPassword,
    deleteUsers, batchSetStatus, batchSetRole, fetchLogs, fetchLoginLogs, clearError,
  } = useUserStore()

  const currentUser = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [activeLogTab, setActiveLogTab] = useState<LogTabType>('operation')
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [resetPwdUser, setResetPwdUser] = useState<UserItem | null>(null)
  const [showBatchMenu, setShowBatchMenu] = useState(false)
  const [loginLogKeyword, setLoginLogKeyword] = useState('')
  const [loginSuccessFilter, setLoginSuccessFilter] = useState('')

  const loadUsers = useCallback(() => {
    fetchUsers({ page, pageSize, keyword: keyword || undefined, role: roleFilter || undefined, status: statusFilter || undefined })
  }, [fetchUsers, page, pageSize, keyword, roleFilter, statusFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs({ page: logPage, pageSize: logPageSize })
    }
  }, [activeTab, logPage, logPageSize, fetchLogs])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const allSelected = users.length > 0 && users.every((u) => selectedIds.includes(u.id))
  const someSelected = selectedIds.length > 0 && !allSelected

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(users.map((u) => u.id))
    }
  }

  const handleBatchStatus = async (status: string) => {
    if (selectedIds.length === 0) return
    try {
      await batchSetStatus(selectedIds, status)
      setSelectedIds([])
      setShowBatchMenu(false)
      loadUsers()
    } catch { /* handled in store */ }
  }

  const handleBatchRole = async (role: string) => {
    if (selectedIds.length === 0) return
    try {
      await batchSetRole(selectedIds, role)
      setSelectedIds([])
      setShowBatchMenu(false)
      loadUsers()
    } catch { /* handled in store */ }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个用户吗？此操作不可撤销。`)) return
    try {
      await deleteUsers(selectedIds)
      setSelectedIds([])
      loadUsers()
    } catch { /* handled in store */ }
  }

  const totalPages = Math.ceil(total / pageSize)
  const logTotalPages = Math.ceil(logTotal / logPageSize)

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">用户管理</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { loadUsers(); fetchLogs({ page: logPage, pageSize: logPageSize }) }}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增用户
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={clearError} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'users' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          用户列表
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'logs' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <FileText className="w-4 h-4 inline mr-1.5" />
          操作日志
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="搜索用户名、显示名、邮箱、手机号..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="input-field pl-9"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-field w-auto min-w-[120px]"
              >
                <option value="">全部角色</option>
                <option value="admin">管理员</option>
                <option value="user">普通用户</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field w-auto min-w-[120px]"
              >
                <option value="">全部状态</option>
                <option value="active">已启用</option>
                <option value="disabled">已禁用</option>
              </select>

              {selectedIds.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBatchMenu(!showBatchMenu)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    批量操作 ({selectedIds.length})
                  </button>
                  {showBatchMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-bg-secondary border border-border-primary rounded-xl shadow-2xl overflow-hidden min-w-[180px] z-50">
                      <button
                        type="button"
                        onClick={() => handleBatchStatus('active')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-accent-secondary" />
                        批量启用
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchStatus('disabled')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <UserX className="w-4 h-4 text-accent-warning" />
                        批量禁用
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchRole('admin')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <Shield className="w-4 h-4 text-accent-primary" />
                        设为管理员
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchRole('user')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <Users className="w-4 h-4 text-text-secondary" />
                        设为普通用户
                      </button>
                      <div className="border-t border-border-primary" />
                      <button
                        type="button"
                        onClick={handleBatchDelete}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        批量删除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary bg-bg-tertiary/30">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected }}
                        onChange={toggleSelectAll}
                        className="rounded border-border-primary bg-bg-tertiary"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">用户名</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">显示名</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">邮箱</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">手机号</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">角色</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">状态</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">最后登录</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                        加载中...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        暂无用户数据
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className={cn(
                        'border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors',
                        selectedIds.includes(user.id) && 'bg-accent-primary/5'
                      )}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            disabled={user.id === currentUser?.id}
                            className="rounded border-border-primary bg-bg-tertiary"
                          />
                        </td>
                        <td className="px-4 py-3 text-text-primary font-medium">{user.username}</td>
                        <td className="px-4 py-3 text-text-secondary">{user.displayName}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{user.email || '-'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{user.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            user.role === 'admin'
                              ? 'bg-accent-primary/15 text-accent-primary'
                              : 'bg-bg-tertiary text-text-secondary'
                          )}>
                            {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            user.status === 'active'
                              ? 'bg-accent-secondary/15 text-accent-secondary'
                              : 'bg-accent-danger/15 text-accent-danger'
                          )}>
                            {user.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {user.status === 'active' ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '从未登录'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingUser(user)}
                              title="编辑"
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetPwdUser(user)}
                              title="重置密码"
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-warning hover:bg-accent-warning/10 transition-all"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const newStatus = user.status === 'active' ? 'disabled' : 'active'
                                try {
                                  await updateUser(user.id, { status: newStatus })
                                  loadUsers()
                                } catch { /* handled in store */ }
                              }}
                              title={user.status === 'active' ? '禁用' : '启用'}
                              disabled={user.id === currentUser?.id}
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-secondary hover:bg-accent-secondary/10 transition-all disabled:opacity-30"
                            >
                              {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`确定要删除用户 "${user.displayName}" 吗？`)) return
                                try {
                                  await deleteUsers([user.id])
                                  loadUsers()
                                } catch { /* handled in store */ }
                              }}
                              title="删除"
                              disabled={user.id === currentUser?.id}
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-all disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
                <span className="text-xs text-text-muted">共 {total} 条记录</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => fetchUsers({ page: page - 1, pageSize, keyword: keyword || undefined, role: roleFilter || undefined, status: statusFilter || undefined })}
                    className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-text-secondary">{page} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => fetchUsers({ page: page + 1, pageSize, keyword: keyword || undefined, role: roleFilter || undefined, status: statusFilter || undefined })}
                    className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveLogTab('operation')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeLogTab === 'operation'
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
            >
              <FileText className="w-4 h-4 inline mr-1.5" />
              操作日志
            </button>
            <button
              type="button"
              onClick={() => setActiveLogTab('login')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeLogTab === 'login'
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
            >
              <Lock className="w-4 h-4 inline mr-1.5" />
              登录日志
            </button>
          </div>

          {activeLogTab === 'operation' && (
            <div className="glass-card overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-bg-tertiary/30">
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">时间</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">操作人</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">操作类型</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">详情</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">IP地址</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logLoading && logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                          加载中...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          暂无操作日志
                        </td>
                      </tr>
                    ) : (
                      logs.map((log: OperationLog) => (
                        <tr key={log.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                          <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-text-primary font-medium">{log.username}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              log.action.includes('DELETE') ? 'bg-accent-danger/15 text-accent-danger' :
                              log.action.includes('CREATE') ? 'bg-accent-secondary/15 text-accent-secondary' :
                              log.action.includes('PASSWORD') ? 'bg-accent-warning/15 text-accent-warning' :
                              'bg-accent-primary/15 text-accent-primary'
                            )}>
                              {actionLabel(log.action)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-xs max-w-[300px] truncate">{log.detail || '-'}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{log.ip || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {logTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
                  <span className="text-xs text-text-muted">共 {logTotal} 条记录</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={logPage <= 1}
                      onClick={() => fetchLogs({ page: logPage - 1, pageSize: logPageSize })}
                      className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-text-secondary">{logPage} / {logTotalPages}</span>
                    <button
                      type="button"
                      disabled={logPage >= logTotalPages}
                      onClick={() => fetchLogs({ page: logPage + 1, pageSize: logPageSize })}
                      className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeLogTab === 'login' && (
            <div className="glass-card p-4 mb-0">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="搜索用户名..."
                    value={loginLogKeyword}
                    onChange={(e) => setLoginLogKeyword(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
                <select
                  value={loginSuccessFilter}
                  onChange={(e) => setLoginSuccessFilter(e.target.value)}
                  className="input-field w-auto min-w-[120px]"
                >
                  <option value="">全部状态</option>
                  <option value="true">成功</option>
                  <option value="false">失败</option>
                </select>
                <button
                  type="button"
                  onClick={() => fetchLoginLogs({
                    page: 1,
                    pageSize: loginLogPageSize,
                    username: loginLogKeyword || undefined,
                    success: loginSuccessFilter ? loginSuccessFilter === 'true' : undefined,
                  })}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className={cn('w-4 h-4', loginLogLoading && 'animate-spin')} />
                  查询
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-bg-tertiary/30">
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">时间</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">用户名</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">状态</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">IP地址</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogLoading && loginLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                          加载中...
                        </td>
                      </tr>
                    ) : loginLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                          <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          暂无登录日志
                        </td>
                      </tr>
                    ) : (
                      loginLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                          <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-text-primary font-medium">{log.username}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              log.success
                                ? 'bg-accent-secondary/15 text-accent-secondary'
                                : 'bg-accent-danger/15 text-accent-danger'
                            )}>
                              {log.success ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              {log.success ? '成功' : '失败'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted text-xs">{log.ip || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {Math.ceil(loginLogTotal / loginLogPageSize) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary mt-4 -mx-4 -mb-4">
                  <span className="text-xs text-text-muted">共 {loginLogTotal} 条记录</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loginLogPage <= 1}
                      onClick={() => fetchLoginLogs({
                        page: loginLogPage - 1,
                        pageSize: loginLogPageSize,
                        username: loginLogKeyword || undefined,
                        success: loginSuccessFilter ? loginSuccessFilter === 'true' : undefined,
                      })}
                      className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-text-secondary">
                      {loginLogPage} / {Math.ceil(loginLogTotal / loginLogPageSize)}
                    </span>
                    <button
                      type="button"
                      disabled={loginLogPage >= Math.ceil(loginLogTotal / loginLogPageSize)}
                      onClick={() => fetchLoginLogs({
                        page: loginLogPage + 1,
                        pageSize: loginLogPageSize,
                        username: loginLogKeyword || undefined,
                        success: loginSuccessFilter ? loginSuccessFilter === 'true' : undefined,
                      })}
                      className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadUsers() }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers() }}
        />
      )}

      {resetPwdUser && (
        <ResetPasswordModal
          user={resetPwdUser}
          onClose={() => setResetPwdUser(null)}
          onReset={() => { setResetPwdUser(null); loadUsers() }}
        />
      )}
    </div>
  )
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    CREATE_USER: '创建用户',
    UPDATE_USER: '更新用户',
    DELETE_USERS: '删除用户',
    RESET_PASSWORD: '重置密码',
    CHANGE_PASSWORD: '修改密码',
    UPDATE_PROFILE: '更新资料',
    BATCH_UPDATE_STATUS: '批量状态',
    BATCH_UPDATE_ROLE: '批量角色',
  }
  return map[action] || action
}

function ModalOverlay({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-bg-secondary border border-border-primary rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createUserFn = useUserStore((s) => s.createUser)
  const [form, setForm] = useState({ username: '', password: '', displayName: '', email: '', phone: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.username.trim()) { setLocalError('用户名不能为空'); return }
    if (form.username.length < 3) { setLocalError('用户名至少3个字符'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) { setLocalError('用户名只能包含字母、数字和下划线'); return }
    if (!form.password) { setLocalError('密码不能为空'); return }
    if (form.password.length < 6) { setLocalError('密码至少6个字符'); return }
    if (!form.displayName.trim()) { setLocalError('显示名称不能为空'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setLocalError('邮箱格式不正确'); return }
    if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) { setLocalError('手机号格式不正确'); return }

    setSaving(true)
    try {
      await createUserFn({
        username: form.username.trim(),
        password: form.password,
        displayName: form.displayName.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role,
      })
      onCreated()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="新增用户">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">用户名 *</label>
          <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" placeholder="3-20位字母、数字、下划线" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">密码 *</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="6-32位字符" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">显示名称 *</label>
          <input type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input-field" placeholder="用户显示名称" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">邮箱</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">手机号</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="13800000000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">角色</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            创建
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function EditUserModal({ user, onClose, onSaved }: { user: UserItem; onClose: () => void; onSaved: () => void }) {
  const updateUserFn = useUserStore((s) => s.updateUser)
  const [form, setForm] = useState({
    displayName: user.displayName,
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    status: user.status,
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.displayName.trim()) { setLocalError('显示名称不能为空'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setLocalError('邮箱格式不正确'); return }
    if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) { setLocalError('手机号格式不正确'); return }

    setSaving(true)
    try {
      await updateUserFn(user.id, {
        displayName: form.displayName.trim(),
        email: form.email || null,
        phone: form.phone || null,
        role: form.role,
        status: form.status,
      })
      onSaved()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="编辑用户">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">用户名</label>
          <input type="text" value={user.username} disabled className="input-field opacity-50 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">显示名称 *</label>
          <input type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">邮箱</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">手机号</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">角色</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function ResetPasswordModal({ user, onClose, onReset }: { user: UserItem; onClose: () => void; onReset: () => void }) {
  const resetPwdFn = useUserStore((s) => s.resetPassword)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!newPassword) { setLocalError('新密码不能为空'); return }
    if (newPassword.length < 6) { setLocalError('密码至少6个字符'); return }
    if (newPassword !== confirmPassword) { setLocalError('两次输入的密码不一致'); return }

    setSaving(true)
    try {
      await resetPwdFn(user.id, newPassword)
      onReset()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '重置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="重置密码">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-tertiary/50 border border-border-primary">
          <Lock className="w-5 h-5 text-accent-warning" />
          <div>
            <p className="text-sm text-text-primary font-medium">{user.displayName}</p>
            <p className="text-xs text-text-muted">@{user.username}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">新密码 *</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="6-32位字符" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">确认密码 *</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="再次输入新密码" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            确认重置
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}
