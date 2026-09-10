'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Upload, FileText, Trash2, Download, Info } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Doc {
  id: string
  nome: string
  tipo: string
  tamanho: string
  criadoEm: string
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('documentos');
      if (stored) setDocs(JSON.parse(stored));
    } catch {}
  }, []);

  const save = (list: Doc[]) => {
    setDocs(list);
    localStorage.setItem('documentos', JSON.stringify(list));
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const novos: Doc[] = Array.from(files).map((f) => ({
      id: `${Date.now()}-${f.name}`,
      nome: f.name,
      tipo: (f.type || 'arquivo').split('/').pop() || 'arquivo',
      tamanho: f.size > 0 ? `${(f.size / 1024).toFixed(1)} KB` : '—',
      criadoEm: new Date().toISOString(),
    }));
    save([...novos, ...docs]);
  };

  const remove = (id: string) => save(docs.filter((d) => d.id !== id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Centralize os documentos dos editais e da sua empresa"
        badge={
          docs.length > 0 ? (
            <Badge variant="accent">{docs.length} documento(s)</Badge>
          ) : undefined
        }
      />

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-700 hover:border-primary'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Enviar documentos</p>
          <p className="text-xs text-slate-400 mt-1">Arraste arquivos aqui ou clique para selecionar</p>
        </div>
        <input type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </label>

      {docs.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8" />}
          title="Nenhum documento"
          description="Os documentos adicionados ficam salvos neste dispositivo para consulta rápida durante a preparação das propostas."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-accent-soft dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.nome}</p>
                  <p className="text-xs text-slate-400">
                    {d.tipo.toUpperCase()} · {d.tamanho} · Adicionado em {formatDate(d.criadoEm)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Imprimir"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(d.id)}
                  className="p-2 text-danger hover:bg-danger-soft dark:hover:bg-danger/10 rounded-xl transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 flex items-start gap-3">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Os arquivos permanecem apenas neste navegador. Para uma central segura e sincronizada entre dispositivos,
          a persistência em nuvem (vinculada à sua conta) será disponibilizada futuramente.
        </p>
      </div>
    </div>
  );
}
