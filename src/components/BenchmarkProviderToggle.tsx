import { PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { ProviderResult } from "./benchmarkConstants"

interface BenchmarkProviderToggleProps {
  activeResults: ProviderResult[]
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
}

export function BenchmarkProviderToggle({
  activeResults,
  providerLogos,
  providerLogosDark,
}: BenchmarkProviderToggleProps) {
  // Sorted by median TTI for ranking
  const ranked = [...activeResults].sort((a, b) => a.summary.ttiMs.median - b.summary.ttiMs.median)

  return (
    <div className="not-content overflow-x-auto">
      <div className="flex gap-2 px-4 md:px-6 min-w-0">
        {ranked.map((result, index) => {
          const logoLight = providerLogos[result.provider]
          const logoDark = providerLogosDark[result.provider]
          const medianSecs = (result.summary.ttiMs.median / 1000).toFixed(2)

          return (
            <div
              key={result.provider}
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg border shrink-0 whitespace-nowrap min-w-[120px] bg-white dark:bg-gray-800 border-gray-200/50 dark:border-gray-700/50 shadow-sm"
            >
              <div className="text-sm text-gray-700 dark:text-gray-400 font-mono font-medium shrink-0">
                {index + 1}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start">
                  {logoLight ? (
                    <div className="shrink-0 w-24 flex items-center justify-center">
                      <img src={logoLight} alt="{result.provider} logo" className="w-full h-full object-contain dark:hidden" />
                      <img src={logoDark || logoLight} alt="" className="w-full h-full object-contain hidden dark:block" />
                    </div>
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PROVIDER_COLORS[result.provider] || "#6b7280" }}
                    />
                  )}
                  {/* <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {capitalize(result.provider)}
                  </p> */}
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {medianSecs}s median
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}