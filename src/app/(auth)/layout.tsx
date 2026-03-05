export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">July</h1>
          <p className="mt-1 text-sm text-slate-500">Gerenciador Financeiro Pessoal</p>
        </div>
        {children}
      </div>
    </div>
  )
}
