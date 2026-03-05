'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  title: string
  onMenuClick: () => void
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </header>
  )
}
