/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Plus, Check, Trash2, Upload, MessageSquare, Library, Crown, UserPlus, ArrowRightLeft, Eraser, GripVertical, Download, FileJson, Bell } from 'lucide-react';

/**
 * Habit-Pet Widget v5.3 (Update Notification)
 * [추가 기능]
 * 1. 업데이트 공지 모달 추가
 * 2. 버전 체크 로직 (LocalStorage를 사용하여 버전당 1회만 노출)
 * 3. 외부 링크(포스타입) 이동 기능
 */

// --- 상수 및 설정 ---
const MAX_LEVEL = 10;
const CURRENT_APP_VERSION = "1.0.0"; // 현재 앱 버전 (배포할 때마다 올려주세요)
const POSTYPE_URL = "https://posty.pe/b0nmjv"; // 님의 포스타입 주소로 바꾸세요

const PASTEL_THEMES = [
  { id: 'cream', name: 'Cream', code: '#fdfbf7', border: '#e7e5e4' },
  { id: 'sky', name: 'Sky', code: '#e0f2fe', border: '#bae6fd' },
  { id: 'lavender', name: 'Lavender', code: '#f3e8ff', border: '#d8b4fe' },
  { id: 'mint', name: 'Mint', code: '#dcfce7', border: '#86efac' },
  { id: 'pink', name: 'Pink', code: '#fdf2f8', border: '#fbcfe8' },
];

const DEFAULT_DIALOGUES = {
  normal: ["오늘도 힘내자!", "심심해 놀아줘~", "화면 너머 너를 응원해!", "나는야 성장 중!"],
  happy: ["해냈구나! 멋져!", "역시 최고야!", "쓰담쓰담 해줘!", "기분 최고!"],
  sad: ["으앙 다시 해야해?", "실수였지?", "시무룩...", "다시 채워줄거지?"],
  levelup: ["나 진화했다!", "더 강해진 기분이야!", "너 덕분이야 고마워!", "만렙까지 가보자고!"]
};

// 타입 정의
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface Pet {
  id: string;
  name: string;
  images: Record<number, string | null>;
  themeId: string;
  level: number;
  currentXP: number;
  dialogues: any;
}

const initialImages = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).reduce((acc, level) => {
  acc[level] = null;
  return acc;
}, {} as Record<number, string | null>);

const createNewPet = (index: number): Pet => ({
  id: Date.now().toString(),
  name: `새 친구 ${index + 1}`,
  images: { ...initialImages },
  themeId: 'cream',
  level: 1,
  currentXP: 0,
  dialogues: { ...DEFAULT_DIALOGUES }
});

const INITIAL_PETS: Pet[] = [
  {
    id: '1',
    name: '말랑이',
    images: { ...initialImages },
    themeId: 'cream',
    level: 1,
    currentXP: 0,
    dialogues: { ...DEFAULT_DIALOGUES }
  }
];

export default function App() {
  // --- Global State ---
  const [pets, setPets] = useState<Pet[]>(() => {
    try {
      const saved = localStorage.getItem('habit_pets');
      if (!saved) return INITIAL_PETS;
      const parsed = JSON.parse(saved);
      return parsed.map((p: any) => {
        if (!p.images) {
          const newImages = { ...initialImages };
          if (p.image) newImages[1] = p.image;
          return { ...p, images: newImages };
        }
        return p;
      });
    } catch (e) {
      console.error("Data Load Error:", e);
      return INITIAL_PETS; 
    }
  });
  
  const [activePetId, setActivePetId] = useState<string>(() => {
    return localStorage.getItem('habit_active_id') || '1';
  });
  
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('habit_todos');
    return saved ? JSON.parse(saved) : [{ id: 1, text: "물 마시기", completed: false }];
  });
  
  // --- UI State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('basic');
  const [speechBubble, setSpeechBubble] = useState("");
  const [showSpeech, setShowSpeech] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null); 
  
  // [NEW] 업데이트 알림 모달 상태
  const [updateInfo, setUpdateInfo] = useState<{ version: string, message: string } | null>(null);

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const importInputRef = useRef<HTMLInputElement>(null);

  const activePet = pets.find(p => p.id === activePetId) || pets[0];
  const currentTheme = PASTEL_THEMES.find(t => t.id === (activePet?.themeId || 'cream')) || PASTEL_THEMES[0];

  // --- Effects ---
  useEffect(() => { localStorage.setItem('habit_pets', JSON.stringify(pets)); }, [pets]);
  useEffect(() => { localStorage.setItem('habit_active_id', activePetId); }, [activePetId]);
  useEffect(() => { localStorage.setItem('habit_todos', JSON.stringify(todos)); }, [todos]);

  // [NEW] 버전 체크 로직 (앱 시작 시 실행)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 1. 깃허브 등에 올려둔 version.json 파일을 읽어옵니다.
        // (지금은 테스트를 위해 주석 처리하고, 가짜 데이터를 씁니다.)
        // const response = await fetch('https://raw.githubusercontent.com/YOUR_ID/habit-pet/main/version.json');
        // const data = await response.json();
        
        // [테스트용 가짜 데이터] 나중에 실제 URL로 교체하세요!
        const data = { 
          latestVersion: "1.0.0", // 여기를 1.0.1로 바꾸면 알림이 뜹니다.
          message: "새로운 기능이 추가되었어요!" 
        };

        const lastSeenVersion = localStorage.getItem('last_seen_update_version');

        // 로직: 최신 버전이 내 버전보다 높고 && 내가 이 버전에 대해 '확인'을 안 눌렀다면?
        if (data.latestVersion > CURRENT_APP_VERSION && lastSeenVersion !== data.latestVersion) {
          setUpdateInfo({ version: data.latestVersion, message: data.message });
        }
      } catch (error) {
        console.error("Update check failed", error);
      }
    };

    checkForUpdates();
  }, []);

  // --- Helpers ---
  const updateActivePet = (updates: Partial<Pet>) => {
    setPets(prev => prev.map(p => p.id === activePetId ? { ...p, ...updates } : p));
  };

  const getMaxXP = (level: number) => level * 100;

  const getPetImage = (pet: Pet, level: number): string | null => {
    if (!pet || !pet.images) return null; 
    for (let l = level; l >= 1; l--) {
      if (pet.images[l]) return pet.images[l];
    }
    return null;
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, level: number) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await convertToBase64(file);
        updateActivePet({ images: { ...activePet.images, [level]: base64 } });
      } catch (err) {
        console.error("이미지 변환 실패", err);
      }
    }
  };

  const handleExportPet = (pet: Pet) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pet));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${pet.name}_data.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportPet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedPet = JSON.parse(event.target?.result as string);
        if (!importedPet.name || !importedPet.dialogues) { alert("올바른 펫 데이터 파일이 아닙니다."); return; }
        const newPet = { ...importedPet, id: Date.now().toString(), currentXP: 0, level: 1 };
        setPets(prev => [...prev, newPet]);
        setActivePetId(newPet.id);
        alert(`${newPet.name} 친구를 데려왔어요!`);
      } catch (err) { console.error(err); alert("파일을 읽는데 실패했습니다."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Logic ---
  const handleCloseApp = () => { window.close(); };
  const triggerSpeech = (text: string, duration = 3000) => { setSpeechBubble(text); setShowSpeech(true); setTimeout(() => setShowSpeech(false), duration); };
  const triggerBounce = () => { setIsBouncing(true); setTimeout(() => setIsBouncing(false), 600); };
  const playDialogue = (type: string) => { const list = activePet.dialogues[type] || activePet.dialogues.normal; if (list.length > 0) { triggerSpeech(list[Math.floor(Math.random() * list.length)]); } };

  const addPoints = (amount: number) => {
    if (activePet.level >= MAX_LEVEL && amount > 0) { triggerBounce(); playDialogue('happy'); return; }
    let newXP = activePet.currentXP + amount;
    let newLevel = activePet.level;
    if (amount < 0) { if (newXP < 0) newXP = 0; updateActivePet({ currentXP: newXP }); playDialogue('sad'); return; }
    let maxXP = getMaxXP(newLevel);
    if (newXP >= maxXP && newLevel < MAX_LEVEL) { newXP = newXP - maxXP; newLevel += 1; setLevelUpModal(newLevel); } else if (newLevel >= MAX_LEVEL) { newXP = getMaxXP(MAX_LEVEL); } else { playDialogue('happy'); }
    updateActivePet({ level: newLevel, currentXP: newXP });
  };

  const handleToggleTodo = (id: number) => {
    const targetTodo = todos.find(t => t.id === id);
    if (!targetTodo) return;
    const isCompleting = !targetTodo.completed;
    const xpChange = isCompleting ? 20 : -20;
    addPoints(xpChange);
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: isCompleting } : t));
  };

  const handleClearCompleted = () => {
    if (todos.filter(t => t.completed).length === 0) return;
    if (confirm("완료된 미션을 모두 정리할까요? (경험치는 유지됩니다)")) { setTodos(prev => prev.filter(t => !t.completed)); }
  };

  const handleCreatePet = () => { const newPet = createNewPet(pets.length); setPets([...pets, newPet]); setActivePetId(newPet.id); triggerSpeech("안녕! 잘 부탁해!"); };
  const handleDeletePet = (petId: string) => { if (pets.length === 1) { alert("최소 한 마리의 펫은 있어야 해요!"); return; } if (window.confirm("정말 이 펫을 떠나보내시겠어요? (복구 불가)")) { const newPets = pets.filter(p => p.id !== petId); setPets(newPets); if (activePetId === petId) setActivePetId(newPets[0].id); } };

  const onDragStart = (index: number) => { setDraggedItemIndex(index); };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); }; 
  const onDrop = (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    const newTodos = [...todos];
    const [draggedItem] = newTodos.splice(draggedItemIndex, 1);
    newTodos.splice(dropIndex, 0, draggedItem);
    setTodos(newTodos);
    setDraggedItemIndex(null);
  };

  // [NEW] 업데이트 확인 버튼 클릭 시 (무시하기)
  const handleCloseUpdate = () => {
    if (updateInfo) {
      // 이 버전을 봤다고 저장함 -> 다음부터 이 버전 알림 안 뜸
      localStorage.setItem('last_seen_update_version', updateInfo.version);
      setUpdateInfo(null);
    }
  };

  // [NEW] 업데이트 하러 가기 (브라우저 열기)
  const handleGoToUpdate = () => {
    // 일렉트론에서 외부 링크 열기 (보안상 window.open 보다 shell.openExternal이 좋지만, 여기선 렌더러라 window.open 사용)
    window.open(POSTYPE_URL, '_blank');
    handleCloseUpdate(); // 열면서 알림도 닫음
  };

  // --- Styles ---
  const styles = `
    @keyframes boing { 0% { transform: scale(1, 1); } 30% { transform: scale(1.25, 0.75); } 40% { transform: scale(0.75, 1.25); } 50% { transform: scale(1.15, 0.85); } 65% { transform: scale(0.95, 1.05); } 75% { transform: scale(1.05, 0.95); } 100% { transform: scale(1, 1); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 70% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
    .animate-boing { animation: boing 0.6s ease-in-out; }
    .animate-popIn { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
    .dragging { opacity: 0.5; background-color: #f3f4f6; border: 2px dashed #d1d5db; }
  `;

  const currentPetImage = getPetImage(activePet, activePet?.level || 1);

  return (
    <>
      <style>{styles}</style>
      <div className="w-screen h-screen flex items-center justify-center font-sans select-none overflow-hidden">
        {/* === 메인 위젯 === */}
        <div className="relative flex flex-col shadow-2xl overflow-hidden transition-all duration-300" style={{ width: '300px', height: '480px', backgroundColor: currentTheme.code, borderRadius: '32px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Header */}
          <div className="h-12 w-full cursor-move flex items-center justify-between px-5 pt-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{activePet?.name || 'Pet'}</span>
              {activePet.level >= MAX_LEVEL ? ( <span className="bg-yellow-100 text-yellow-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-yellow-200 flex items-center"><Crown size={10} className="mr-0.5 fill-yellow-400"/> MAX</span> ) : ( <span className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">Lv.{activePet.level}</span> )}
            </div>
            <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-black/5 rounded-full transition-colors" title="설정"><Settings size={18} /></button>
              <button onClick={handleCloseApp} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="앱 종료"><X size={20} /></button>
            </div>
          </div>

          {/* Character Area */}
          <div className="flex-1 relative flex flex-col items-center justify-end pb-4 w-full">
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 z-20 ${showSpeech ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}><div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 relative max-w-[200px]"><p className="text-xs text-gray-600 font-medium text-center break-keep">{speechBubble}</p><div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white transform rotate-45"></div></div></div>
            <div className={`relative z-10 cursor-pointer transition-transform duration-100 ${isBouncing ? 'animate-boing' : 'hover:scale-105'}`} onClick={() => { triggerBounce(); playDialogue('normal'); }}>
              {currentPetImage ? (
                <img src={currentPetImage} alt="Character" className="h-40 w-auto object-contain drop-shadow-xl" style={{ maxHeight: '180px' }} />
              ) : (
                <div className={`text-gray-700 drop-shadow-md transition-all duration-500`} style={{ transform: `scale(${1 + activePet.level * 0.07})` }}>
                   <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                     <path d="M50 15C30 15 15 35 15 55C15 85 30 90 50 90C70 90 85 85 85 55C85 35 70 15 50 15Z" fill="white"/>
                     <circle cx="35" cy="50" r="5" fill="#374151"/>
                     <circle cx="65" cy="50" r="5" fill="#374151"/>
                     <path d="M45 60Q50 65 55 60" stroke="#374151" strokeWidth="3" strokeLinecap="round"/>
                     <circle cx="25" cy="58" r="4" fill="#FCA5A5" opacity="0.6"/>
                     <circle cx="75" cy="58" r="4" fill="#FCA5A5" opacity="0.6"/>
                     {activePet.level >= MAX_LEVEL && <path d="M30 25 L40 10 L50 25 L60 10 L70 25" stroke="#FBBF24" strokeWidth="3" fill="none" className="animate-pulse"/>}
                   </svg>
                </div>
              )}
              {activePet.level >= MAX_LEVEL && <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-float"><Crown size={24} className="text-yellow-400 fill-yellow-200 drop-shadow-sm" /></div>}
            </div>
            <div className="w-3/4 mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-gray-500 font-bold px-1"><span>{activePet.level >= MAX_LEVEL ? 'MAX LEVEL' : 'EXP'}</span><span>{activePet.level >= MAX_LEVEL ? '100%' : `${Math.floor((activePet.currentXP / getMaxXP(activePet.level)) * 100)}%`}</span></div>
              <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-700 ease-out ${activePet.level >= MAX_LEVEL ? 'bg-gradient-to-r from-yellow-300 to-orange-300 w-full' : 'bg-gradient-to-r from-blue-300 to-purple-300'}`} style={{ width: activePet.level >= MAX_LEVEL ? '100%' : `${(activePet.currentXP / getMaxXP(activePet.level)) * 100}%` }} /></div>
            </div>
          </div>

          {/* Todo List */}
          <div className="bg-white/80 backdrop-blur-sm h-48 rounded-t-[32px] p-5 flex flex-col shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-500 flex items-center">MISSIONS <span className="ml-2 bg-gray-100 text-gray-400 text-[10px] px-1.5 rounded-md">{todos.filter(t => t.completed).length}/{todos.length}</span></h3>
              {todos.some(t => t.completed) && ( <button onClick={handleClearCompleted} className="text-[10px] flex items-center text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors" title="완료된 항목 삭제"><Eraser size={12} className="mr-1" />청소</button> )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {todos.map((todo, index) => (
                <div 
                  key={todo.id} 
                  draggable 
                  onDragStart={() => onDragStart(index)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(index)}
                  className={`flex items-center group p-1 rounded-lg transition-all ${draggedItemIndex === index ? 'dragging' : ''}`}
                >
                  <GripVertical size={14} className="text-gray-300 mr-1 cursor-move opacity-50 group-hover:opacity-100" />
                  <button onClick={() => handleToggleTodo(todo.id)} className={`flex-shrink-0 w-5 h-5 rounded-full mr-2 flex items-center justify-center border transition-all duration-200 ${todo.completed ? 'bg-green-400 border-green-400' : 'bg-white border-gray-300 hover:border-green-400'}`}>{todo.completed && <Check size={12} className="text-white" />}</button>
                  <span className={`text-sm flex-1 truncate transition-colors ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{todo.text}</span>
                  <button onClick={() => setTodos(prev => prev.filter(t => t.id !== todo.id))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('t') as HTMLInputElement; if(input.value.trim()) { setTodos([...todos, {id:Date.now(), text:input.value, completed:false}]); input.value=''; } }} className="mt-3 relative flex items-center">
              <input name="t" type="text" placeholder="할 일 추가..." className="w-full bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <button type="submit" className="absolute right-2 text-gray-400 hover:text-blue-500"><Plus size={16} /></button>
            </form>
          </div>
        </div>

        {/* [NEW] Update Notification Modal */}
        {updateInfo && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="bg-white rounded-3xl p-6 text-center shadow-2xl animate-popIn max-w-[280px]">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-bounce">
                  <Bell size={32} className="text-blue-500 fill-blue-200"/>
                </div>
              </div>
              <h2 className="text-xl font-black text-gray-800 mb-1">업데이트가 있어요!</h2>
              <p className="text-xs text-gray-500 mb-1">v{updateInfo.version}</p>
              <p className="text-sm text-gray-600 mb-5 word-keep">{updateInfo.message || "포스타입에서 새로 받아주세요!"}</p>
              
              <div className="flex flex-col gap-2">
                <button onClick={handleGoToUpdate} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-md transition-colors">
                  다운로드 하러 가기
                </button>
                <button onClick={handleCloseUpdate} className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-xs font-medium hover:bg-gray-100 rounded-xl transition-colors">
                  나중에 할게요 (닫기)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Level Up Modal */}
        {levelUpModal && ( <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><div className="bg-white rounded-3xl p-6 text-center shadow-2xl animate-popIn max-w-[280px]"><div className="flex justify-center mb-4"><div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce"><Crown size={40} className="text-yellow-500 fill-yellow-200"/></div></div><h2 className="text-2xl font-black text-gray-800 mb-1">LEVEL UP!</h2><p className="text-gray-500 text-sm mb-4">{levelUpModal === MAX_LEVEL ? "최고 레벨 달성! 축하해!" : `레벨 ${levelUpModal}로 성장했어!`}</p><button onClick={() => setLevelUpModal(null)} className="w-full py-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-xl font-bold shadow-md hover:shadow-lg transform active:scale-95 transition-all">멋져!</button></div></div> )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-0 overflow-hidden flex flex-col h-[500px] animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-4 border-b"><h3 className="font-bold text-gray-800">설정</h3><button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-gray-400" /></button></div>
              <div className="flex border-b">{[{ id: 'basic', label: '기본', icon: Settings }, { id: 'dialogue', label: '대사', icon: MessageSquare }, { id: 'library', label: '도감', icon: Library }].map(tab => (<button key={tab.id} onClick={() => setSettingsTab(tab.id)} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center space-x-1 ${settingsTab === tab.id ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}><tab.icon size={14} /><span>{tab.label}</span></button>))}</div>
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50">
                {settingsTab === 'basic' && (
                  <div className="space-y-5">
                    <div><label className="block text-xs font-bold text-gray-400 mb-2">테마 컬러</label><div className="flex space-x-2">{PASTEL_THEMES.map(theme => (<button key={theme.id} onClick={() => updateActivePet({ themeId: theme.id })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${activePet.themeId === theme.id ? 'ring-2 ring-offset-2 ring-gray-300 scale-110' : ''}`} style={{ backgroundColor: theme.code, borderColor: theme.border }} />))}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">이름</label><input type="text" value={activePet.name} onChange={(e) => updateActivePet({ name: e.target.value })} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none bg-white" /></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2">레벨별 모습 (Lv.1 필수)</label>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(level => (
                          <div key={level} onClick={() => fileInputRefs.current[level]?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-white hover:border-blue-300 transition-colors bg-white relative ${!activePet.images[level] && level > 1 && !activePet.images[1] ? 'opacity-50 pointer-events-none' : ''}`}>
                            {activePet.images[level] ? <img src={activePet.images[level]} className="h-full w-full object-contain rounded-xl" alt={`Lv.${level}`} /> : <><Upload size={14} className="mb-0.5"/><span className="text-[8px]">Lv.{level}</span></>}
                            {level === 1 && !activePet.images[1] && <div className="absolute inset-0 border-2 border-red-300 rounded-xl animate-pulse"></div>}
                            <input type="file" ref={ref => fileInputRefs.current[level] = ref} hidden accept="image/*" onChange={(e) => handleImageUpload(e, level)} />
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1 ml-1">* 이미지가 없으면 이전 단계 모습을 유지합니다.</p>
                    </div>
                  </div>
                )}
                {settingsTab === 'dialogue' && ( <div className="space-y-6"><p className="text-[10px] text-gray-400 bg-blue-50 p-2 rounded-lg">💡 줄바꿈으로 문장을 구분해주세요.</p>{[{ key: 'normal', label: '평상시', color: 'text-gray-600' }, { key: 'happy', label: '성공', color: 'text-green-600' }, { key: 'sad', label: '취소', color: 'text-blue-600' }].map(section => (<div key={section.key}><label className={`text-xs font-bold mb-1 flex items-center ${section.color}`}>{section.label}</label><textarea value={activePet.dialogues[section.key]?.join('\n') || ''} onChange={(e) => { const newDialogues = { ...activePet.dialogues, [section.key]: e.target.value.split('\n') }; updateActivePet({ dialogues: newDialogues }); }} className="w-full h-20 border rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-100 outline-none bg-white resize-none" placeholder="대사를 입력하세요..." /></div>))}</div> )}
                {settingsTab === 'library' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end mb-2"><h4 className="text-sm font-bold text-gray-700">나의 펫 리스트</h4><span className="text-[10px] text-gray-400">{pets.length}마리</span></div>
                    <div className="space-y-2">{pets.map(pet => {
                      const thumbImage = getPetImage(pet, pet.level);
                      return (
                      <div key={pet.id} className={`flex items-center p-2 rounded-xl border transition-all ${activePetId === pet.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 mr-3">{thumbImage ? <img src={thumbImage} className="w-full h-full object-cover"/> : <span className="text-xs">?</span>}</div>
                        <div className="flex-1"><div className="flex items-center"><span className="text-sm font-bold text-gray-700 mr-2">{pet.name}</span>{pet.level >= MAX_LEVEL && <Crown size={10} className="text-yellow-500 fill-yellow-500"/>}</div><span className="text-[10px] text-gray-400">Lv.{pet.level} {pet.level >= MAX_LEVEL ? '(Max)' : ''}</span></div>
                        {activePetId !== pet.id ? (
                          <div className="flex space-x-1">
                            <button onClick={() => { setActivePetId(pet.id); triggerSpeech("나 왔다!"); }} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg"><ArrowRightLeft size={14} /></button>
                            {/* Export Button */}
                            <button onClick={() => handleExportPet(pet)} className="p-1.5 text-green-500 hover:bg-green-100 rounded-lg" title="내보내기"><Download size={14} /></button>
                            <button onClick={() => handleDeletePet(pet.id)} className="p-1.5 text-red-400 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                             <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-md">키우는 중</span>
                             <button onClick={() => handleExportPet(pet)} className="p-1.5 text-green-500 hover:bg-green-100 rounded-lg" title="내보내기"><Download size={14} /></button>
                          </div>
                        )}
                      </div>
                    )})}</div>
                    
                    {/* Import & Create Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button onClick={() => importInputRef.current?.click()} className="py-3 border-2 border-dashed border-green-300 rounded-xl flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors gap-1">
                        <FileJson size={16} />
                        <span className="text-xs font-bold">가져오기</span>
                      </button>
                      <input type="file" ref={importInputRef} hidden accept=".json" onChange={handleImportPet} />

                      <button onClick={handleCreatePet} className="py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors gap-1">
                        <UserPlus size={16} />
                        <span className="text-xs font-bold">새 친구</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}