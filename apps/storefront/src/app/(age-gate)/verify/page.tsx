'use client'; // Эта директива нужна, т.к. мы будем работать с onClick и документом

import { useRouter } from 'next/navigation';

export default function AgeVerificationPage() {
  const router = useRouter();

  const handleVerify = () => {
    // Ставим куку на 30 дней
    document.cookie = "age_verified=true; path=/; max-age=" + 60 * 60 * 24 * 30;
    // Возвращаем на главную
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">Внимание: 18+</h1>
        <p className="text-gray-400 mb-8">
          Этот сайт содержит материалы для взрослых. Пожалуйста, подтвердите, что вам исполнилось 18 лет.
        </p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={handleVerify}
            className="w-full bg-primary hover:bg-rose-700 text-white font-bold py-3 px-4 rounded transition-colors"
          >
            Мне есть 18 лет
          </button>
          
          <a 
            href="https://google.com" 
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded transition-colors"
          >
            Мне нет 18 лет (Уйти)
          </a>
        </div>
      </div>
    </div>
  );
}