// src/components/EmpresaSelector.jsx
import { Building2, CheckCircle2, Loader2, X } from 'lucide-react'

export function EmpresaSelector({
  abierto,
  obligatorio = false,
  empresas = [],
  empresaActiva,
  loading = false,
  error = '',
  onSeleccionar,
  onCerrar
}) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden">
        
        <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-4 bg-stone-50">
          <div className="flex items-start gap-3">
            <div className="bg-teal-50 text-teal-700 rounded-2xl p-3 border border-teal-100">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-light text-stone-800">
                Seleccionar empresa activa
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Todo lo que cargues desde ahora se vinculará a la empresa seleccionada.
              </p>
            </div>
          </div>

          {!obligatorio && (
            <button
              type="button"
              onClick={onCerrar}
              className="p-2 rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <p className="text-sm">
                Cargando empresas vinculadas...
              </p>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          ) : empresas.length === 0 ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
              <h3 className="font-bold mb-2">
                No tenés empresas vinculadas
              </h3>

              <p className="text-sm">
                Para usar la app con la nueva lógica financiera, este usuario debe estar vinculado a una empresa desde empresa_profesional.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {empresas.map((item) => {
                const empresa = item.empresa
                const activa = empresaActiva?.id === empresa.id

                return (
                  <button
                    key={empresa.id}
                    type="button"
                    onClick={() => onSeleccionar(item)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      activa
                        ? 'border-teal-300 bg-teal-50 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-teal-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                        {empresa.url_logo ? (
                          <img
                            src={empresa.url_logo}
                            alt={empresa.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-7 h-7 text-teal-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-black text-stone-800 truncate" title={empresa.nombre}>
                          {empresa.nombre}
                        </p>

                        <p className="text-xs text-stone-500 mt-0.5">
                          Rol: {item.rol || 'Profesional'} · Plan: {empresa.plan || 'Free'}
                        </p>

                        <p className="text-[11px] text-stone-400 mt-0.5 truncate">
                          CUIT: {empresa.cuit || 'Sin CUIT'}
                        </p>
                      </div>
                    </div>

                    {activa && (
                      <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {obligatorio && empresas.length > 1 && (
          <div className="px-5 pb-5">
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 text-xs text-stone-500">
              Tenés más de una empresa vinculada. Elegí una para continuar.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}