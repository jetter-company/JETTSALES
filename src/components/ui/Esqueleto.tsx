import { cx } from './cx'

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx('esqueleto', className)} aria-hidden />
}

export function EsqueletoCartao({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cx('vidro rounded-lg p-5 space-y-3', className)} aria-busy>
      <Esqueleto className="h-4 w-1/3" />
      {Array.from({ length: linhas }).map((_, i) => (
        <Esqueleto key={i} className={cx('h-3.5', i % 2 ? 'w-2/3' : 'w-5/6')} />
      ))}
    </div>
  )
}

export function EsqueletoLista({ itens = 4 }: { itens?: number }) {
  return (
    <div className="space-y-2" aria-busy>
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="vidro rounded-md p-4 flex items-center gap-3">
          <Esqueleto className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-3.5 w-1/2" />
            <Esqueleto className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
