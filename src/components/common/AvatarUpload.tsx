import React, { useRef, useState } from 'react';
import { Camera, Trash2, UploadCloud } from 'lucide-react';

interface AvatarUploadProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  onError: (message: string) => void;
}

const OUTPUT_SIZE = 256;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

// Recorta o centro da imagem em quadrado e reduz para 256x256 JPEG,
// para a foto caber no perfil salvo no Supabase sem pesar.
const toSquareDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas'));
        return;
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ value, onChange, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError('Escolha um arquivo de imagem (JPG, PNG ou WEBP).');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      onError('A imagem é muito grande. Use uma foto de até 15 MB.');
      return;
    }
    setIsProcessing(true);
    try {
      onChange(await toSquareDataUrl(file));
    } catch {
      onError('Não foi possível abrir essa imagem. Tente uma foto em JPG ou PNG.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-dashed transition-all group ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : value
              ? 'border-transparent'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
        title="Clique ou arraste uma foto"
      >
        {value ? (
          <>
            <img src={value} alt="Foto de perfil" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1">
              <Camera className="w-5 h-5" />
              Trocar foto
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1 px-2 text-center">
            <UploadCloud className="w-6 h-6" />
            <span className="text-[10px] font-bold leading-tight">
              {isProcessing ? 'Processando...' : 'Arraste ou clique'}
            </span>
          </div>
        )}
      </button>

      <div className="space-y-1.5 min-w-0">
        <p className="text-xs font-bold uppercase text-slate-700">Foto de Perfil</p>
        <p className="text-[11px] text-slate-500 leading-snug">
          Arraste uma imagem para o quadrado ou clique nele para escolher o arquivo. A foto é recortada em quadrado automaticamente.
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Remover foto
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
};
