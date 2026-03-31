export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20 text-accent-light text-xl font-bold mb-3">ГШ</div>
          <h1 className="text-xl font-bold">ГШХ Систем</h1>
          <p className="text-xs text-tx3 mt-1">Газрын Шуурхай Хурлын Удирдлага</p>
        </div>
        {children}
      </div>
    </div>
  )
}
