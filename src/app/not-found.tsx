import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/20">
        404
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
          Página não encontrada
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          O conteúdo que você procura não existe ou foi movido.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Voltar ao início
        </Link>
        <Link
          href="/busca"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Ir para busca
        </Link>
      </div>
    </div>
  );
}
