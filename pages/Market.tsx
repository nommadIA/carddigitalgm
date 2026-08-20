
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ShoppingCart, Trash2, Mic, Check, DollarSign, Wallet, Loader2, X, Sparkles, Share2, History, Mail, Copy, Calendar, ChevronDown } from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { CURRENCY_FORMATTER } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { openWhatsapp } from '../services/whatsApp';
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

type CartItem = {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
};

type MarketHistory = {
  month: string;
  total: number;
  count: number;
  lists: { id: string; amount: number; created_at: string; note: string; items?: CartItem[] }[];
};

const SUPERMARKET_FOOD_SUGGESTIONS = [
  // Grãos, Farinhas e Matinais
  "Arroz 5kg", "Arroz Integral 1kg", "Arroz Parboilizado 1kg", "Feijão Carioca 1kg", "Feijão Preto 1kg",
  "Açúcar Refinado 1kg", "Açúcar Cristal 1kg", "Café Torrado e Moído 500g", "Café Solúvel 100g",
  "Óleo de Soja 900ml", "Azeite de Oliva Extra Virgem 500ml", "Sal Refinado 1kg", "Farinha de Trigo 1kg",
  "Farinha de Mandioca 1kg", "Fubá Mimoso 1kg", "Tapioca 500g", "Aveia em Flocos 170g",
  // Massas e Enlatados
  "Macarrão Espaguete 500g", "Macarrão Parafuso 500g", "Macarrão Penne 500g", "Massa de Lasanha 500g",
  "Molho de Tomate Sachê 340g", "Extrato de Tomate 130g", "Milho Verde em Lata", "Ervilha em Lata",
  "Sardinha em Lata", "Atum Ralado em Lata", "Maionese 500g", "Ketchup 400g", "Mostarda 200g",
  // Laticínios e Padaria
  "Leite Integral 1L", "Leite Desnatado 1L", "Leite Semidesnatado 1L", "Leite Condensado 395g",
  "Creme de Leite 200g", "Manteiga com Sal 200g", "Margarina 500g", "Requeijão Cremoso 200g",
  "Queijo Mussarela Fatiado", "Queijo Prato Fatiado", "Queijo Parmesão Ralado 50g", "Presunto Fatiado",
  "Peito de Peru Fatiado", "Iogurte Natural 170g", "Iogurte de Morango 1L", "Ovos Brancos Dúzia",
  "Pão de Forma 500g", "Pão Francês 1kg", "Torrada Tradicional 140g", "Biscoito Recheado",
  "Biscoito Cream Cracker 400g", "Biscoito Maizena 400g", "Achocolatado em Pó 400g",
  // Carnes, Aves e Frios
  "Carne Moída 1kg", "Peito de Frango 1kg", "Coxa e Sobrecoxa de Frango 1kg", "Bife de Alcatra 1kg",
  "Contra Filé 1kg", "Picanha 1kg", "Costela Suína 1kg", "Linguiça Toscana 1kg", "Linguiça Calabresa",
  "Salsicha 1kg", "Bacon Fatiado", "Bife de Coxão Mole 1kg",
  // Hortifruti
  "Banana Prata 1kg", "Maçã Fuji 1kg", "Mamão Formosa", "Melancia", "Laranja Pera 1kg",
  "Limão Taiti 1kg", "Tomate 1kg", "Cebola 1kg", "Alho 200g", "Batata Inglesa 1kg",
  "Cenoura 1kg", "Abobrinha", "Alface Crespa", "Cheiro Verde", "Bandeja de Morango",
  // Bebidas
  "Refrigerante Coca-Cola 2L", "Refrigerante Guaraná 2L", "Suco de Caixa 1L", "Água Mineral 5L",
  "Cerveja Latão 473ml", "Cerveja Long Neck", "Vinho Tinto 750ml",
  // Higiene e Limpeza
  "Sabão em Pó 1kg", "Sabão Líquido 3L", "Detergente Neutro 500ml", "Amaciante Concentrado 1.5L",
  "Desinfetante 1L", "Água Sanitária 2L", "Papel Higiênico 12 rolos", "Papel Toalha 2 rolos",
  "Saco de Lixo 50L", "Esponja de Louça 4un", "Sabonete 90g", "Shampoo 400ml", "Condicionador 400ml",
  "Creme Dental 90g", "Desodorante Aerosol"
];

const Market = () => {
  const { tenantId, user } = useAuth();
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<MarketHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState<string | number>(1);
  const [addingItem, setAddingItem] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Voice Workflow States
  type VoiceStep = 'idle' | 'product' | 'price' | 'quantity' | 'confirm';
  const [voiceStep, setVoiceStep] = useState<VoiceStep>('idle');
  const [voiceFeedback, setVoiceFeedback] = useState<string>('');

  const productInputRef = React.useRef<HTMLInputElement>(null);
  const priceInputRef = React.useRef<HTMLInputElement>(null);
  const qtyInputRef = React.useRef<HTMLInputElement>(null);
  const addBtnRef = React.useRef<HTMLButtonElement>(null);
  const productContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productContainerRef.current && !productContainerRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsePriceStr = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^0-9.,]/g, '');
    val = val.replace('.', ',');
    const parts = val.split(',');
    if (parts.length > 2) {
      val = parts[0] + ',' + parts.slice(1).join('');
    }
    if (val.length > 1 && val.startsWith('0') && val[1] !== ',') {
      val = val.replace(/^0+/, '');
    }
    setNewItemPrice(val);
  };

  const handlePriceBlur = () => {
    const num = parsePriceStr(newItemPrice);
    if (isNaN(num) || num <= 0) {
      setNewItemPrice('');
    } else {
      setNewItemPrice(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  };

  const handlePriceFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (newItemPrice === '0,00' || newItemPrice === '0' || newItemPrice === '0.00') {
      setNewItemPrice('');
    }
  };

  const productSuggestions = useMemo(() => {
    const term = newItemName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!term) {
      return [];
    }
    return SUPERMARKET_FOOD_SUGGESTIONS.filter(item => {
      const itemClean = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return itemClean.includes(term);
    }).slice(0, 8);
  }, [newItemName]);

  const selectSuggestion = (name: string) => {
    setNewItemName(name);
    setShowProductSuggestions(false);
    setTimeout(() => {
      if (priceInputRef.current) {
        priceInputRef.current.focus();
        priceInputRef.current.select();
      }
    }, 50);
  };
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [toppingUp, setToppingUp] = useState(false);
  
  const [shareData, setShareData] = useState<{ title: string; message: string } | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState<string | null>(null);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingBalance, setResettingBalance] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = topUpModalOpen || showFinalizeConfirm || showResetConfirm || showDeleteHistoryConfirm || showDeleteListConfirm || !!shareData;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [topUpModalOpen, showFinalizeConfirm, showResetConfirm, showDeleteHistoryConfirm, showDeleteListConfirm, shareData]);

  const totalListValue = useMemo(() => cartItems.reduce((acc, i) => acc + (Number(i.unit_price) * Number(i.quantity)), 0), [cartItems]);
  const realAvailableBalance = useMemo(() => walletBalance - totalListValue, [walletBalance, totalListValue]);
  const availableBalanceDisplay = useMemo(() => Math.max(0, realAvailableBalance), [realAvailableBalance]);

  useEffect(() => {
    if (tenantId && user) {
        fetchWalletBalance();
        fetchCartItems();
        fetchHistory();
    }
  }, [tenantId, user]);

  const fetchWalletBalance = async () => {
    const { data } = await supabase
        .from("market_wallet")
        .select("balance")
        .eq("tenant_id", tenantId)
        .eq("user_id", user?.id)
        .maybeSingle();
    setWalletBalance(Number(data?.balance ?? 0));
    setLoading(false);
  };

  const fetchCartItems = async () => {
    const { data } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user?.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
    
    if (data) setCartItems(data);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
        const { data, error } = await supabase
            .from("market_transactions")
            .select("id, amount, created_at, note, items")
            .eq("tenant_id", tenantId)
            .eq("created_by", user?.id)
            .lt("amount", 0); // apenas gastos

        if (error) throw error;

        // Agrupar por mês
        const groups: Record<string, { total: number; count: number; lists: any[] }> = {};
        data.forEach(t => {
            const date = new Date(t.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = { total: 0, count: 0, lists: [] };
            groups[key].total += Math.abs(Number(t.amount));
            groups[key].count += 1;
            groups[key].lists.push(t);
        });

        const formatted = Object.entries(groups).map(([month, val]) => {
            // Sort lists by date descending
            val.lists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return {
                month,
                total: val.total,
                count: val.count,
                lists: val.lists
            };
        }).sort((a, b) => b.month.localeCompare(a.month));

        setHistory(formatted);
    } catch (e) {
        console.error(e);
    } finally {
        setHistoryLoading(false);
    }
  };

    const handleDeleteHistoryMonth = async (monthKey: string) => {
        setHistoryLoading(true);
        try {
            const [year, month] = monthKey.split("-");
            const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();

            const { error } = await supabase
                .from("market_transactions")
                .delete()
                .eq("tenant_id", tenantId)
                .eq("created_by", user?.id)
                .gte("created_at", startDate)
                .lte("created_at", endDate)
                .lt("amount", 0); // apenas gastos

            if (error) {
                console.error("Erro ao excluir histórico do mês:", error);
                throw error;
            }

            setHistory(prev => prev.filter(h => h.month !== monthKey));
            setShowDeleteHistoryConfirm(null);
        } catch (e: any) {
            console.error("Erro completo na exclusão do histórico:", e);
            alert("Erro ao excluir histórico: " + (e.message || "Erro desconhecido"));
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDeleteList = async (listId: string) => {
        setHistoryLoading(true);
        try {
            const { error } = await supabase
                .from("market_transactions")
                .delete()
                .eq("tenant_id", tenantId)
                .eq("id", listId);

            if (error) {
                console.error("Erro ao excluir lista:", error);
                throw error;
            }

            // Atualizar o histórico local
            setHistory(prev => {
                return prev.map(h => {
                    const newLists = h.lists.filter(l => l.id !== listId);
                    if (newLists.length === h.lists.length) return h; // Não mudou
                    
                    const newTotal = newLists.reduce((acc, l) => acc + Math.abs(l.amount), 0);
                    return {
                        ...h,
                        lists: newLists,
                        total: newTotal,
                        count: newLists.length
                    };
                }).filter(h => h.count > 0); // Remove o mês se ficar vazio
            });
            setShowDeleteListConfirm(null);
        } catch (e: any) {
            console.error("Erro ao excluir lista:", e);
            alert("Erro ao excluir lista: " + (e.message || "Erro desconhecido"));
        } finally {
            setHistoryLoading(false);
        }
    };

  const PT_NUMBERS_MAP: Record<string, number> = {
    'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3, 'quatro': 4,
    'cinco': 5, 'seis': 6, 'meia': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
    'onze': 11, 'doze': 12, 'duzia': 12, 'dúzia': 12, 'treze': 13, 'quatorze': 14,
    'catorze': 14, 'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18,
    'dezenove': 19, 'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
    'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90, 'cem': 100,
    'cento': 100, 'duzentos': 200, 'duzentas': 200, 'trezentos': 300, 'quatrocentos': 400,
    'quinhentos': 500, 'seiscentos': 600, 'setecentos': 700, 'oitocentos': 800, 'novecentos': 900
  };

  const parsePtBrWordsToNumber = (text: string): number | null => {
    const clean = text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
    
    if (!clean) return null;
    const words = clean.split(/\s+/).filter(w => w !== 'e' && w !== 'de');
    
    if (words.length === 1 && !isNaN(Number(words[0]))) {
      return Number(words[0]);
    }

    let total = 0;
    let current = 0;
    let hasMatch = false;

    for (const w of words) {
      if (!isNaN(Number(w))) {
        current += Number(w);
        hasMatch = true;
      } else if (PT_NUMBERS_MAP[w] !== undefined) {
        current += PT_NUMBERS_MAP[w];
        hasMatch = true;
      } else if (w === 'mil') {
        current = current === 0 ? 1000 : current * 1000;
        total += current;
        current = 0;
        hasMatch = true;
      }
    }

    return hasMatch ? total + current : null;
  };

  const parsePortuguesePrice = (transcript: string): number | null => {
    if (!transcript) return null;
    const raw = transcript.toLowerCase().trim();

    // Pattern 1: Direct number with comma/dot (e.g. "5,50", "12.90", "R$ 4,50", "3.00")
    const directMatch = raw.match(/(?:r\$)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (directMatch && (raw.includes(',') || raw.includes('.'))) {
      const num = parseFloat(directMatch[1].replace(',', '.'));
      if (!isNaN(num) && num > 0) return num;
    }

    // Pattern 2: "X reais e Y centavos" or "X e Y" or "X com Y"
    const reaisAndCentavosMatch = raw.match(/^(?:r\$\s*)?(.+?)\s*(?:reais|real)?\s*(?:e|com|vírgula|virgula|ponto|,|\.)\s*(.+?)(?:\s*centavos?)?$/i);
    if (reaisAndCentavosMatch) {
      const intPartStr = reaisAndCentavosMatch[1].trim();
      const decPartStr = reaisAndCentavosMatch[2].trim();
      
      const intPart = parsePtBrWordsToNumber(intPartStr);
      const decPart = parsePtBrWordsToNumber(decPartStr);

      if (intPart !== null && decPart !== null) {
        const decFormatted = decPart < 10 && decPartStr.length === 1 ? decPart * 10 : decPart;
        return intPart + decFormatted / 100;
      }
    }

    // Pattern 3: "X centavos"
    const centavosOnly = raw.match(/^(.+?)\s*centavos?$/i);
    if (centavosOnly) {
      const cent = parsePtBrWordsToNumber(centavosOnly[1]);
      if (cent !== null) return cent / 100;
    }

    // Pattern 4: "X reais" or single number
    const reaisOnly = raw.match(/^(.+?)(?:\s*(?:reais|real))?$/i);
    if (reaisOnly) {
      const val = parsePtBrWordsToNumber(reaisOnly[1]);
      if (val !== null) return val;
    }

    return null;
  };

  const parsePortugueseQuantity = (transcript: string): number => {
    if (!transcript) return 1;
    const raw = transcript.toLowerCase().trim();

    if (raw.includes("meia duzia") || raw.includes("meia dúzia")) return 6;
    if (raw.includes("duzia") || raw.includes("dúzia")) return 12;

    const numMatch = raw.match(/\d+/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10);
      if (!isNaN(n) && n > 0) return n;
    }

    const wordVal = parsePtBrWordsToNumber(raw);
    if (wordVal !== null && wordVal > 0) return wordVal;

    return 1;
  };

  const isAddCommand = (transcript: string): boolean => {
    const clean = transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /\b(adicionar|adicione|adiciona|adicionou|inserir|insere|salvar|salve|confirmar|confirma|ok|sim|pronto|colocar|bota)\b/i.test(clean);
  };

  const formatProductWithAI = async (rawTranscript: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Você é um assistente de supermercado brasileiro. Corrija a ortografia e formate o nome do produto para uma lista de compras em português brasileiro.
Regras:
1. Retorne APENAS o nome do produto formatado em português brasileiro correto.
2. Sem markdown, sem aspas, sem pontuação final.
3. Padronize unidades usuais (Ex: "Arroz cinco quilos" -> "Arroz 5kg", "feijao carioca" -> "Feijão Carioca 1kg", "leite integral" -> "Leite Integral 1L", "detergente neutro" -> "Detergente Neutro 500ml", "papel higienico" -> "Papel Higiênico", "ovos brancos" -> "Ovos Brancos Dúzia").
Texto falado: "${rawTranscript}"`,
        });
        const text = response.text?.trim();
        if (text) return text;
      } catch (err) {
        console.warn("Erro ao formatar com Gemini, usando fallback local:", err);
      }
    }

    let clean = rawTranscript.trim();
    clean = clean
      .replace(/\bquilos?\b/gi, 'kg')
      .replace(/\bquilo\b/gi, 'kg')
      .replace(/\blitros?\b/gi, 'L')
      .replace(/\bgramas?\b/gi, 'g')
      .replace(/\bml\b/gi, 'ml')
      .replace(/\bcaixas?\b/gi, 'cx');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const handleAddItem = async (
    overrideName?: string,
    overridePrice?: number,
    overrideQty?: number
  ) => {
    const nome = (overrideName ?? newItemName).trim();
    const preco = overridePrice !== undefined ? overridePrice : parsePriceStr(newItemPrice);
    const qtd = overrideQty !== undefined ? overrideQty : (Number(newItemQty) || 1);
    if (!nome) return false;
    
    setAddingItem(true);
    try {
        const { data, error } = await supabase.from("shopping_items").insert({
            tenant_id: tenantId,
            user_id: user?.id,
            name: nome,
            unit_price: preco,
            quantity: qtd
        }).select().single();

        if (error) throw error;

        setCartItems(prev => [data, ...prev]);
        setNewItemName(""); 
        setNewItemPrice(""); 
        setNewItemQty(1);
        setShowProductSuggestions(false);
        setVoiceStep('idle');
        setVoiceFeedback('Item adicionado à lista com sucesso!');
        setTimeout(() => setVoiceFeedback(''), 4000);
        
        try {
          await playSound('cash');
        } catch (e) {}

        return true;
    } catch (e: any) {
        alert("Erro ao adicionar item: " + e.message);
        return false;
    } finally {
        setAddingItem(false);
    }
  };

  const playSound = (type: 'beep' | 'cash'): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          resolve();
          return;
        }
        const ctx = new AudioContext();
        
        if (type === 'beep') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
          
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
          
          setTimeout(() => resolve(), 150);
        } else if (type === 'cash') {
          // Cha-ching sound simulation
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          
          osc1.type = 'square';
          osc1.frequency.setValueAtTime(300, ctx.currentTime);
          osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
          
          gain1.gain.setValueAtTime(0, ctx.currentTime);
          gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
          
          osc1.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 0.15);
          
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(2000, ctx.currentTime + 0.1);
          osc2.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.5);
          
          gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
          gain2.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.15);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          
          osc2.start(ctx.currentTime + 0.1);
          osc2.stop(ctx.currentTime + 0.6);
          
          setTimeout(() => resolve(), 600);
        }
      } catch (e) {
        console.error("Audio error:", e);
        resolve();
      }
    });
  };

  const listenVoice = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error("not-supported"));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let resolved = false;

      recognition.onresult = (event: any) => {
        resolved = true;
        resolve(event.results[0][0].transcript);
      };

      recognition.onerror = (event: any) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(event.error));
        }
      };

      recognition.onend = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error("no-speech"));
        }
      };

      recognition.start();
    });
  };

  const resetVoiceFlow = () => {
    setVoiceStep('idle');
    setVoiceFeedback('');
    setIsListening(false);
    setProcessingVoice(false);
  };

  const handleVoiceInput = async () => {
    let currentStep = voiceStep;
    if (currentStep === 'idle') {
      currentStep = 'product';
      setVoiceStep('product');
    }

    try {
      await playSound('beep');
      setIsListening(true);
      const rawTranscript = await listenVoice();
      setIsListening(false);

      if (!rawTranscript || !rawTranscript.trim()) {
        return;
      }

      setProcessingVoice(true);

      if (currentStep === 'product') {
        const productName = await formatProductWithAI(rawTranscript);
        setNewItemName(productName);
        setVoiceStep('price');
        setVoiceFeedback(`Produto "${productName}" registrado! Fale o preço (Ex: R$ 5,50) ou clique no microfone.`);
        setProcessingVoice(false);
        setTimeout(() => {
          if (priceInputRef.current) {
            priceInputRef.current.focus();
            priceInputRef.current.select();
          }
        }, 80);
      } else if (currentStep === 'price') {
        const parsedPrice = parsePortuguesePrice(rawTranscript);
        if (parsedPrice !== null && parsedPrice > 0) {
          const formatted = parsedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setNewItemPrice(formatted);
          setVoiceFeedback(`Preço definido: R$ ${formatted}. Fale a quantidade (Ex: 2 unidades) ou clique no microfone.`);
        } else {
          const num = parsePriceStr(rawTranscript);
          if (num > 0) {
            const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            setNewItemPrice(formatted);
            setVoiceFeedback(`Preço definido: R$ ${formatted}. Fale a quantidade (Ex: 2 unidades) ou clique no microfone.`);
          }
        }
        setVoiceStep('quantity');
        setProcessingVoice(false);
        setTimeout(() => {
          if (qtyInputRef.current) {
            qtyInputRef.current.focus();
            qtyInputRef.current.select();
          }
        }, 80);
      } else if (currentStep === 'quantity') {
        const parsedQty = parsePortugueseQuantity(rawTranscript);
        setNewItemQty(parsedQty > 0 ? parsedQty : 1);
        setVoiceStep('confirm');
        setVoiceFeedback(`Quantidade: ${parsedQty}. Diga "Adicionar" ou clique no botão para salvar.`);
        setProcessingVoice(false);
        setTimeout(() => {
          if (addBtnRef.current) {
            addBtnRef.current.focus();
          }
        }, 80);
      } else if (currentStep === 'confirm') {
        setProcessingVoice(false);
        if (isAddCommand(rawTranscript) || rawTranscript) {
          await handleAddItem();
        }
      }
    } catch (err: any) {
      if (err.message === "not-supported") {
        alert("Seu navegador não suporta reconhecimento de voz.");
      } else if (err.message === 'not-allowed') {
        alert("Permissão negada para usar o microfone. Por favor, permita o acesso ao microfone no seu navegador.");
      } else if (err.message !== "no-speech") {
        console.error("Erro no reconhecimento de voz:", err);
      }
      setIsListening(false);
      setProcessingVoice(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
        const { error } = await supabase.from("shopping_items").delete().eq("id", id);
        if (error) throw error;
        setCartItems(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
        alert("Erro ao remover item: " + e.message);
    }
  };

  const handleTopUp = async () => {
      const amt = Number(topUpAmount);
      if(amt <= 0) return;

      setToppingUp(true);
      try {
          const { error } = await supabase.rpc("market_wallet_topup", { 
              p_tenant_id: tenantId, 
              p_user_id: user?.id,
              p_amount: amt, 
              p_note: "Recarga" 
          });

          if (error) throw error;

          await fetchWalletBalance();
          setTopUpModalOpen(false);
          setTopUpAmount("");
          alert("Recarga realizada com sucesso!");
      } catch (e: any) {
          alert("Erro ao recarregar: " + e.message);
      } finally {
          setToppingUp(false);
      }
  };

  const handleResetBalance = async () => {
      setResettingBalance(true);
      try {
          const { error } = await supabase
              .from("market_wallet")
              .update({ balance: 0 })
              .eq("tenant_id", tenantId)
              .eq("user_id", user?.id);

          if (error) throw error;

          await fetchWalletBalance();
          setShowResetConfirm(false);
          alert("Saldo zerado com sucesso!");
      } catch (e: any) {
          alert("Erro ao zerar saldo: " + e.message);
      } finally {
          setResettingBalance(false);
      }
  };

  const handleFinalize = async () => {
    if (cartItems.length === 0) return;
    
    if (walletBalance < totalListValue) {
        alert(`Saldo insuficiente. Você tem ${CURRENCY_FORMATTER.format(walletBalance)}, mas a lista custa ${CURRENCY_FORMATTER.format(totalListValue)}.`);
        return;
    }

    setFinalizing(true);
    try {
        const note = `Compra Mercado: ${cartItems.length} itens`;
        
        // 1. Deduzir do saldo da carteira via RPC
        const { error: spendError } = await supabase.rpc("market_wallet_spend", { 
            p_tenant_id: tenantId, 
            p_amount: totalListValue, 
            p_note: note,
            p_items: cartItems
        });

        if (spendError) throw new Error("Erro ao deduzir saldo: " + spendError.message);

        // 2. Registrar como despesa geral para aparecer no financeiro
        const { error: expenseError } = await supabase.from("expenses").insert({
            tenant_id: tenantId,
            user_id: user?.id,
            description: `MERCADO - ${new Date().toLocaleDateString('pt-BR')}`,
            amount: totalListValue,
            due_date: new Date().toISOString().split('T')[0],
            paid: true
        });

        if (expenseError) {
            console.error("Erro ao registrar despesa financeira, mas o saldo foi deduzido:", expenseError);
            // Não travamos o processo aqui pois o saldo já foi deduzido
        }

        // 3. Limpa a lista no banco
        const { error: deleteError } = await supabase
            .from("shopping_items")
            .delete()
            .eq("tenant_id", tenantId)
            .eq("user_id", user?.id);

        if (deleteError) throw new Error("Erro ao limpar lista: " + deleteError.message);

        setCartItems([]);
        await fetchWalletBalance();
        await fetchHistory();
        setShowFinalizeConfirm(false);
        alert("Lista finalizada com sucesso!");
    } catch (e: any) {
        console.error("Erro completo na finalização:", e);
        alert(e.message || "Erro ao finalizar lista. Verifique sua conexão.");
    } finally {
        setFinalizing(false);
    }
  };

  const handleShare = () => {
    if (cartItems.length === 0) return;

    let msg = `*🛒 LISTA DE COMPRAS - MERCADO*\n`;
    msg += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    msg += `--------------------------------\n`;
    
    cartItems.forEach(item => {
        const sub = Number(item.unit_price) * Number(item.quantity);
        msg += `• ${item.quantity}x ${item.name} - ${CURRENCY_FORMATTER.format(sub)}\n`;
    });

    msg += `--------------------------------\n`;
    msg += `*TOTAL DA LISTA: ${CURRENCY_FORMATTER.format(totalListValue)}*\n`;
    msg += `\n_Gerado por CardDigital GM_`;

    setShareData({ title: "Lista de Compras", message: msg });
  };

  const handleShareList = (list: any) => {
    let msg = `*🛒 HISTÓRICO DE COMPRA - MERCADO*\n`;
    msg += `📅 Data: ${new Date(list.created_at).toLocaleDateString('pt-BR')}\n`;
    msg += `📝 Nota: ${list.note || 'Compra no mercado'}\n`;
    msg += `--------------------------------\n`;
    
    if (list.items && list.items.length > 0) {
        list.items.forEach((item: any) => {
            const sub = Number(item.unit_price) * Number(item.quantity);
            msg += `• ${item.quantity}x ${item.name} - ${CURRENCY_FORMATTER.format(sub)}\n`;
        });
        msg += `--------------------------------\n`;
    }
    
    msg += `*TOTAL DA COMPRA: ${CURRENCY_FORMATTER.format(Math.abs(list.amount))}*\n`;
    msg += `\n_Gerado por CardDigital GM_`;

    setShareData({ title: "Histórico de Compra", message: msg });
  };

  return (
    <Page 
        title="Mercado"
        actions={
            <div className="flex gap-2">
                <button 
                    className="gm-btn gm-btn-outline shadow-none border-white/10 hover:border-white/20" 
                    onClick={() => setShowHistory(!showHistory)}
                >
                    <History size={16} /> {showHistory ? "Ver Lista" : "Histórico"}
                </button>
                {!showHistory && cartItems.length > 0 && (
                    <button 
                        className="gm-btn gm-btn-accent shadow-none" 
                        onClick={handleShare}
                    >
                        <Share2 size={16} /> Compartilhar
                    </button>
                )}
            </div>
        }
    >
       
       <Grid cols={1} className="mb-6">
           <div className="gm-card fora rounded-2xl border border-white/10 p-0 overflow-hidden shadow-none">
              <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1 text-slate-400">Saldo Disponível</p>
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="text-4xl font-black tracking-tight text-[var(--gm-primary)]">
                            {CURRENCY_FORMATTER.format(availableBalanceDisplay)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setTopUpModalOpen(true)} className="gm-btn gm-btn-icon gm-btn-soft shadow-none border border-white/10" title="Adicionar Saldo">
                                <Plus size={22} />
                            </button>
                            {walletBalance > 0 && (
                                <button 
                                    onClick={() => setShowResetConfirm(true)} 
                                    className="h-10 w-10 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white transition-all flex items-center justify-center shrink-0 shadow-none border border-[var(--gm-primary)]/30 cursor-pointer"
                                    title="Zerar Saldo"
                                >
                                    <Trash2 size={18} className="text-white" />
                                </button>
                            )}
                        </div>
                     </div>
                 </div>
                 <div className="text-center md:text-right barra p-4 rounded-xl border border-white/10 min-w-[180px] shadow-none">
                     <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1 text-slate-400">Total da Lista</p>
                     <div className="text-2xl font-bold text-white">{CURRENCY_FORMATTER.format(totalListValue)}</div>
                 </div>
              </div>
           </div>
       </Grid>

       {showHistory ? (
           <Grid cols={1}>
               <div className="gm-card fora p-6 rounded-2xl border border-white/10 shadow-none">
                   <div className="text-lg font-bold text-white mb-5">Histórico de Gastos Mensais</div>
                   {historyLoading ? (
                       <div className="flex justify-center py-12">
                           <Loader2 size={32} className="animate-spin text-slate-500" />
                       </div>
                   ) : history.length === 0 ? (
                       <div className="text-center opacity-60 py-12 border border-dashed border-white/10 rounded-xl bg-black/20">
                           <History size={48} className="mb-4 opacity-50 mx-auto" />
                           <p>Nenhum histórico de gastos encontrado.</p>
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {history.map(h => {
                               const [year, month] = h.month.split("-");
                               const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
                               return (
                                   <div key={h.month} className="p-5 rounded-2xl gm-card fora border border-white/10 hover:border-[var(--gm-primary)]/40 transition-all flex flex-col relative shadow-none">
                                       <div className="flex justify-between items-start mb-2 pr-14">
                                           <div className="flex items-center gap-2 text-slate-400">
                                               <button
                                                   onClick={(e) => {
                                                       e.stopPropagation();
                                                       toggleMonth(h.month);
                                                   }}
                                                   className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[var(--gm-primary)]"
                                               >
                                                   <ChevronDown size={18} className={`transition-transform duration-300 ${expandedMonths.has(h.month) ? "rotate-180" : ""}`} />
                                               </button>
                                               <Calendar size={16} />
                                               <span className="text-sm font-bold uppercase tracking-widest text-slate-200">{monthName} {year}</span>
                                           </div>
                                           <div className="text-xs barra border border-white/10 px-2.5 py-1 rounded-lg font-bold text-slate-300 shadow-none">{h.count} compras</div>
                                       </div>
                                       <div className="text-3xl font-black text-white mb-4">
                                           {CURRENCY_FORMATTER.format(h.total)}
                                       </div>
                                       
                                       {/* Lista detalhada das compras do mês */}
                                       {expandedMonths.has(h.month) && (
                                           <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-white/10">
                                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Relação de Compras</h4>
                                           {h.lists.map(list => (
                                               <div key={list.id} className="flex flex-col bg-black/30 p-3.5 rounded-xl border border-white/5 relative group shadow-none">
                                                   <div className="flex justify-between items-center pr-20">
                                                       <div className="flex flex-col">
                                                           <span className="text-white/90 font-bold text-sm">{new Date(list.created_at).toLocaleDateString('pt-BR')}</span>
                                                           <span className="text-xs text-slate-400 mt-0.5">{list.note || 'Compra no mercado'}</span>
                                                       </div>
                                                       <span className="font-black text-[var(--gm-primary)] text-base">{CURRENCY_FORMATTER.format(Math.abs(list.amount))}</span>
                                                   </div>
                                                   
                                                   {list.items && list.items.length > 0 && (
                                                       <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
                                                           {list.items.map((item: any, idx: number) => (
                                                               <div key={idx} className="flex justify-between items-center text-xs text-slate-300">
                                                                   <span>{item.quantity}x {item.name}</span>
                                                                   <span className="font-medium text-slate-200">{CURRENCY_FORMATTER.format(Number(item.unit_price) * Number(item.quantity))}</span>
                                                               </div>
                                                           ))}
                                                       </div>
                                                   )}

                                                   <div className="absolute right-2 top-3 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                       <button 
                                                           onClick={(e) => {
                                                               e.stopPropagation();
                                                               handleShareList(list);
                                                           }}
                                                           className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)] hover:text-white transition-colors border border-[var(--gm-primary)]/20 shadow-none"
                                                           title="Compartilhar esta compra"
                                                       >
                                                           <Share2 size={14} />
                                                       </button>
                                                       <button 
                                                           onClick={(e) => {
                                                               e.stopPropagation();
                                                               setShowDeleteListConfirm(list.id);
                                                           }}
                                                           className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--gm-primary)] text-white hover:brightness-110 transition-colors shadow-none border border-[var(--gm-primary)]/30 cursor-pointer"
                                                           title="Excluir esta compra"
                                                       >
                                                           <Trash2 size={14} className="text-white" />
                                                       </button>
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                       )}

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteHistoryConfirm(h.month);
                                            }}
                                            className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--gm-primary)] text-white hover:brightness-110 transition-colors z-20 shadow-none border border-[var(--gm-primary)]/30 cursor-pointer"
                                            title="Excluir este mês"
                                        >
                                            <Trash2 size={18} className="text-white" />
                                        </button>
                                   </div>
                               );
                           })}
                       </div>
                   )}
               </div>
           </Grid>
       ) : (
           <Grid cols={1} className="gap-6">
                {/* Add Item Form */}
                <div className="gm-card fora p-6 rounded-2xl border border-white/10 !overflow-visible !contain-none relative z-30 shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-lg font-bold text-white">Adicionar Item</div>
                        {voiceStep !== 'idle' && (
                            <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-[var(--gm-primary)]"></span>
                                Comando por Voz Ativo
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="gm-label block">Comando por Voz Guiado</label>
                                {voiceStep !== 'idle' && (
                                    <button
                                        type="button"
                                        onClick={resetVoiceFlow}
                                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-lg hover:bg-white/10"
                                        title="Reiniciar comando por voz"
                                    >
                                        <X size={13} /> Cancelar voz
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                   type="button"
                                   className={`gm-btn w-full flex items-center justify-between px-4 h-12 rounded-xl shadow-none border transition-all cursor-pointer ${
                                     isListening 
                                       ? 'bg-red-500/25 text-red-200 border-red-500/60 shadow-lg shadow-red-500/20 animate-pulse' 
                                       : processingVoice 
                                         ? 'bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-lg shadow-amber-500/20' 
                                         : voiceStep !== 'idle'
                                           ? 'bg-[var(--gm-primary)]/20 text-white border-[var(--gm-primary)]/60 shadow-lg shadow-[var(--gm-primary)]/15'
                                           : 'barra text-white hover:bg-white/10 border-white/10'
                                   }`}
                                   onClick={handleVoiceInput}
                                   disabled={isListening || processingVoice}
                                >
                                   <div className="flex items-center gap-2.5">
                                      {isListening ? (
                                         <>
                                           <span className="relative flex h-3.5 w-3.5 mr-0.5">
                                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                             <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                                           </span>
                                           <span className="text-sm font-bold text-red-200">
                                             {voiceStep === 'product' || voiceStep === 'idle'
                                               ? 'Ouvindo nome do produto...'
                                               : voiceStep === 'price'
                                                 ? 'Ouvindo preço (ex: 5 e 50)...'
                                                 : voiceStep === 'quantity'
                                                   ? 'Ouvindo quantidade (ex: 2 unidades)...'
                                                   : 'Ouvindo: diga "Adicionar"...'}
                                           </span>
                                         </>
                                      ) : processingVoice ? (
                                         <>
                                           <Loader2 size={18} className="animate-spin text-amber-300" />
                                           <span className="text-sm font-bold text-amber-200">Processando áudio em português...</span>
                                         </>
                                      ) : (
                                         <>
                                           <Mic size={18} className={voiceStep !== 'idle' ? 'text-[var(--gm-primary)] animate-bounce' : 'text-[var(--gm-primary)]'} />
                                           <span className="text-sm font-bold">
                                             {voiceStep === 'idle' && 'Comando por Voz'}
                                             {voiceStep === 'product' && '1. Falar Produto (Ex: Arroz 5kg)'}
                                             {voiceStep === 'price' && '2. Falar Preço (Ex: R$ 5,50)'}
                                             {voiceStep === 'quantity' && '3. Falar Quantidade (Ex: 2)'}
                                             {voiceStep === 'confirm' && '4. Diga "Adicionar" (ou clique)'}
                                           </span>
                                         </>
                                      )}
                                   </div>

                                   {/* Badge do passo */}
                                   <div className="flex items-center gap-1.5">
                                     <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                       voiceStep === 'idle'
                                         ? 'bg-white/5 border-white/10 text-white/60'
                                         : 'bg-[var(--gm-primary)]/30 border-[var(--gm-primary)]/50 text-[var(--gm-primary)]'
                                     }`}>
                                       {voiceStep === 'idle' ? 'Toque para iniciar' : `Passo ${voiceStep === 'product' ? '1/4' : voiceStep === 'price' ? '2/4' : voiceStep === 'quantity' ? '3/4' : '4/4'}`}
                                     </span>
                                   </div>
                                </button>

                                {/* Feedback do fluxo de voz */}
                                {voiceFeedback && (
                                  <div className="text-xs text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 px-3.5 py-2 rounded-xl flex items-center justify-between transition-all">
                                    <span className="font-medium">{voiceFeedback}</span>
                                    <span className="text-[10px] text-white/40 font-mono">Comando por voz</span>
                                  </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full relative" ref={productContainerRef}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="gm-label block">Produto (Alimento / Item)</label>
                                        {voiceStep === 'product' && (
                                            <span className="text-[10px] text-[var(--gm-primary)] font-bold animate-pulse">1. Passo Atual</span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input 
                                            ref={productInputRef}
                                            type="text"
                                            className={`gm-input w-full h-12 pr-10 rounded-xl shadow-none bg-black/30 transition-all ${
                                              voiceStep === 'product'
                                                ? 'border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40 shadow-lg shadow-[var(--gm-primary)]/10'
                                                : 'border-white/10'
                                            }`} 
                                            value={newItemName} 
                                            onChange={e => {
                                                setNewItemName(e.target.value);
                                                setShowProductSuggestions(true);
                                            }}
                                            onFocus={() => {
                                                if (newItemName.trim()) {
                                                    setShowProductSuggestions(true);
                                                }
                                            }}
                                            placeholder="Ex: Arroz 5kg, Feijão, Leite..." 
                                            autoComplete="off"
                                        />
                                        {newItemName && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewItemName('');
                                                    setShowProductSuggestions(false);
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Modal de Sugestões flutuante fora do card com Glass Blur */}
                                    {showProductSuggestions && newItemName.trim().length > 0 && productSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-2 fora border border-white/15 rounded-xl z-[9999] p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar shadow-none">
                                            <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-[var(--gm-primary)] uppercase barra rounded-lg flex items-center justify-between mb-1 border border-white/10">
                                                <span>Sugestões de Alimentos</span>
                                                <span className="text-[9px] text-slate-400 font-normal">Toque para selecionar</span>
                                            </div>
                                            {productSuggestions.map((suggestion) => (
                                                 <button
                                                     key={suggestion}
                                                     type="button"
                                                     className="w-full text-left px-3.5 py-2.5 text-sm text-slate-100 hover:bg-white/10 hover:text-white transition-all rounded-lg flex items-center justify-between group cursor-pointer border border-transparent hover:border-white/10 shadow-none"
                                                     onClick={() => selectSuggestion(suggestion)}
                                                 >
                                                     <span className="font-medium group-hover:translate-x-1 transition-transform flex items-center gap-2">
                                                         <span className="text-[var(--gm-primary)]">🛒</span> {suggestion}
                                                     </span>
                                                     <span className="text-[10px] text-[var(--gm-primary)] font-bold bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-md border border-[var(--gm-primary)]/20">
                                                         Selecionar
                                                     </span>
                                                 </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-44">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="gm-label block">Preço (Un)</label>
                                        {voiceStep === 'price' && (
                                            <span className="text-[10px] text-[var(--gm-primary)] font-bold animate-pulse">2. Passo Atual</span>
                                        )}
                                    </div>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--gm-primary)] z-10 pointer-events-none select-none">R$</span>
                                        <input 
                                            ref={priceInputRef}
                                            type="text" 
                                            inputMode="decimal"
                                            className={`gm-input h-12 w-full !pl-11 pr-3 font-bold text-base md:text-lg text-white rounded-xl shadow-none bg-black/30 transition-all ${
                                              voiceStep === 'price'
                                                ? 'border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40 shadow-lg shadow-[var(--gm-primary)]/10'
                                                : 'border-white/10'
                                            }`} 
                                            value={newItemPrice} 
                                            onChange={handlePriceChange}
                                            onBlur={handlePriceBlur}
                                            onFocus={handlePriceFocus} 
                                            onClick={(e) => {
                                                (e.target as HTMLInputElement).select();
                                                if (newItemPrice === '0,00' || newItemPrice === '0') setNewItemPrice('');
                                            }}
                                            placeholder="0,00" 
                                        />
                                    </div>
                                </div>

                                <div className="w-full md:w-24">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="gm-label block">Qtd</label>
                                        {voiceStep === 'quantity' && (
                                            <span className="text-[10px] text-[var(--gm-primary)] font-bold animate-pulse">3. Passo</span>
                                        )}
                                    </div>
                                    <input 
                                        ref={qtyInputRef}
                                        className={`gm-input text-center h-12 w-full font-bold rounded-xl shadow-none bg-black/30 transition-all ${
                                          voiceStep === 'quantity'
                                            ? 'border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40 shadow-lg shadow-[var(--gm-primary)]/10'
                                            : 'border-white/10'
                                        }`} 
                                        type="text" 
                                        inputMode="numeric"
                                        value={newItemQty} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            const clean = val.replace(/^0+(?=\d)/, '');
                                            setNewItemQty(clean);
                                        }} 
                                        onBlur={() => {
                                            if (!newItemQty || Number(newItemQty) < 1) {
                                                setNewItemQty(1);
                                            }
                                        }}
                                        onFocus={(e) => {
                                            e.target.select();
                                            if (newItemQty === 0 || newItemQty === '0') setNewItemQty('');
                                        }}
                                        placeholder="1" 
                                    />
                                </div>

                                <button 
                                    ref={addBtnRef}
                                    className={`gm-btn h-12 w-full md:w-auto px-8 rounded-xl font-bold flex items-center justify-center gap-2 shadow-none transition-all cursor-pointer ${
                                      voiceStep === 'confirm'
                                        ? 'bg-[var(--gm-primary)] text-white ring-2 ring-[var(--gm-primary)] ring-offset-2 ring-offset-black scale-[1.02] animate-pulse'
                                        : ''
                                    }`} 
                                    onClick={() => handleAddItem()} 
                                    disabled={addingItem}
                                >
                                    {addingItem ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="gm-card fora rounded-2xl border border-white/10 overflow-hidden shadow-none mt-8 p-0">
                    <div className="barra p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-lg font-bold text-white">Itens na Lista ({cartItems.length})</div>
                        {cartItems.length > 0 && (
                            <button 
                                className="gm-btn gm-btn-accent font-black transition-all px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-none"
                                onClick={() => setShowFinalizeConfirm(true)}
                                disabled={finalizing}
                            >
                                {finalizing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                                FINALIZAR LISTA
                            </button>
                        )}
                    </div>
                    {cartItems.length === 0 ? (
                        <div className="text-center opacity-60 py-12 flex flex-col items-center border border-dashed border-white/10 rounded-xl bg-black/20 m-6">
                            <ShoppingCart size={48} className="mb-4 opacity-50 text-slate-400" />
                            <p className="text-slate-300">Sua lista de compras está vazia.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 px-6 hover:bg-white/[0.03] transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl barra border border-white/10 flex items-center justify-center font-bold text-slate-300 text-sm flex-shrink-0 shadow-none">
                                            {item.quantity}x
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-base text-white truncate">{item.name}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Unitário: {CURRENCY_FORMATTER.format(item.unit_price)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6">
                                        <span className="font-bold text-xl text-[var(--gm-primary)]">{CURRENCY_FORMATTER.format(Number(item.unit_price) * Number(item.quantity))}</span>
                                        <button 
                                            onClick={() => handleRemoveItem(item.id)} 
                                            className="h-10 w-10 rounded-xl bg-[var(--gm-primary)] text-white hover:brightness-110 transition-all flex items-center justify-center shrink-0 shadow-none border border-[var(--gm-primary)]/30 cursor-pointer"
                                            title="Remover item"
                                        >
                                            <Trash2 size={18} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
           </Grid>
       )}

       <AnimatePresence>
        {topUpModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden" onClick={() => setTopUpModalOpen(false)}>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-md" 
                />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="gm-modal fora border border-white/12 relative w-full max-w-sm rounded-2xl p-7 shadow-none overflow-hidden" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[var(--gm-primary)]"></div>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 flex items-center justify-center text-[var(--gm-primary)] mb-5 shadow-none">
                            <Wallet size={30} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-1.5">Adicionar Saldo</h3>
                        <p className="text-sm text-slate-400 mb-6">Insira o valor para recarregar sua carteira.</p>
                        
                        <div className="relative w-full mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[var(--gm-primary)]">R$</span>
                            <input 
                                type="number" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-14 pr-6 text-3xl font-black text-white focus:outline-none focus:border-[var(--gm-primary)] transition-all text-center shadow-none" 
                                value={topUpAmount} 
                                onChange={e => setTopUpAmount(e.target.value)} 
                                onFocus={(e) => e.target.select()}
                                placeholder="0.00" 
                                autoFocus 
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 w-full">
                            <button 
                                className="gm-btn w-full py-3.5 font-black text-base rounded-xl shadow-none" 
                                onClick={handleTopUp}
                                disabled={toppingUp}
                            >
                                {toppingUp ? <Loader2 size={22} className="animate-spin mx-auto" /> : "CONFIRMAR RECARGA"}
                            </button>
                            <button 
                                className="gm-btn gm-btn-soft w-full py-3 rounded-xl shadow-none border border-white/10" 
                                onClick={() => setTopUpModalOpen(false)}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
       </AnimatePresence>

                <AnimatePresence>
                    {showDeleteListConfirm && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setShowDeleteListConfirm(null)}>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="gm-card fora w-full max-w-sm rounded-2xl overflow-hidden border border-white/12 relative z-10 animate-fade-in shadow-none p-0"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-7 text-center">
                                    <div className="w-16 h-16 bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-none">
                                        <Trash2 size={28} className="text-[var(--gm-primary)]" />
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-white mb-2.5">Excluir Compra?</h3>
                                    <p className="text-slate-300 text-base mb-6 leading-relaxed">
                                        Tem certeza que deseja excluir esta compra específica do histórico? Esta ação não pode ser desfeita.
                                    </p>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            className="gm-btn gm-btn-outline flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none border-white/10 hover:border-white/20"
                                            onClick={() => setShowDeleteListConfirm(null)}
                                        >
                                            Voltar
                                        </button>
                                        <button 
                                            className="gm-btn flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none"
                                            onClick={() => handleDeleteList(showDeleteListConfirm)}
                                            disabled={historyLoading}
                                        >
                                            {historyLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Excluir"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Modal de Confirmação de Exclusão de Histórico */}
                <AnimatePresence>
                    {showDeleteHistoryConfirm && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setShowDeleteHistoryConfirm(null)}>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                                onClick={() => setShowDeleteHistoryConfirm(null)}
                            />
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="gm-card fora w-full max-w-sm rounded-2xl overflow-hidden border border-white/12 relative z-10 animate-fade-in shadow-none p-0"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-7 text-center">
                                    <div className="w-16 h-16 bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-none">
                                        <Trash2 size={28} className="text-[var(--gm-primary)]" />
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-white mb-2.5">Excluir Histórico?</h2>
                                    <p className="text-slate-300 text-base mb-6 leading-relaxed">
                                        Deseja excluir permanentemente todo o histórico de gastos deste mês? 
                                        <br />
                                        Esta ação não pode ser desfeita.
                                    </p>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            className="gm-btn gm-btn-outline flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none border-white/10 hover:border-white/20"
                                            onClick={() => setShowDeleteHistoryConfirm(null)}
                                        >
                                            Voltar
                                        </button>
                                        <button 
                                            className="gm-btn flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none"
                                            onClick={() => handleDeleteHistoryMonth(showDeleteHistoryConfirm)}
                                            disabled={historyLoading}
                                        >
                                            {historyLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Excluir"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

               {/* Finalize Confirmation Modal */}
        <AnimatePresence>
            {showFinalizeConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowFinalizeConfirm(false)}>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="gm-modal fora border border-white/12 relative w-full max-w-sm rounded-2xl p-7 shadow-none overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--gm-primary)]"></div>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 rounded-2xl flex items-center justify-center mb-5 text-[var(--gm-primary)] shadow-none">
                                <ShoppingCart size={30} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2.5">Finalizar Compra?</h3>
                            <p className="text-slate-300 mb-6 text-base leading-relaxed">
                                Deseja finalizar esta lista no valor de <span className="text-[var(--gm-primary)] font-bold">{CURRENCY_FORMATTER.format(totalListValue)}</span>?
                                O valor será deduzido do seu saldo de mercado.
                            </p>
                            
                            <div className="grid grid-cols-1 gap-3 w-full">
                                <button 
                                    onClick={handleFinalize}
                                    disabled={finalizing}
                                    className="gm-btn w-full py-3.5 font-black flex items-center justify-center gap-2 rounded-xl shadow-none"
                                >
                                    {finalizing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                    SIM, FINALIZAR AGORA
                                </button>
                                <button 
                                    onClick={() => setShowFinalizeConfirm(false)}
                                    className="gm-btn gm-btn-soft w-full py-3 rounded-xl shadow-none border border-white/10"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Reset Balance Confirmation Modal */}
        <AnimatePresence>
            {showResetConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowResetConfirm(false)}>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    />
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="gm-card fora w-full max-w-sm rounded-2xl overflow-hidden border border-white/12 relative z-10 animate-fade-in shadow-none p-0"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-7 text-center">
                            <div className="w-16 h-16 bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-none">
                                <Trash2 size={28} className="text-[var(--gm-primary)]" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-white mb-2.5">Zerar Saldo?</h3>
                            <p className="text-slate-300 text-base mb-6 leading-relaxed">
                                Tem certeza que deseja zerar o seu saldo disponível de <span className="text-[var(--gm-primary)] font-bold">{CURRENCY_FORMATTER.format(walletBalance)}</span>?
                                <br/>Esta ação não pode ser desfeita.
                            </p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowResetConfirm(false)}
                                    className="gm-btn gm-btn-outline flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none border-white/10 hover:border-white/20"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleResetBalance}
                                    disabled={resettingBalance}
                                    className="gm-btn flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none"
                                >
                                    {resettingBalance ? <Loader2 size={22} className="animate-spin mx-auto" /> : "Zerar"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Share Options Modal */}
        {shareData && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShareData(null)}>
            <div className="gm-modal fora border border-white/12 rounded-2xl w-full max-w-md overflow-hidden animate-slide-up shadow-none" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-white/10 flex justify-between items-center barra">
                <h3 className="text-xl font-extrabold text-white">Compartilhar {shareData.title}</h3>
                <button onClick={() => setShareData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 space-y-3">
                <button 
                  onClick={() => {
                    openWhatsapp("", shareData.message);
                    setShareData(null);
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-3 py-3.5 border-white/10 shadow-none hover:border-[var(--gm-primary)]/40 rounded-xl"
                >
                  <div className="shrink-0">
                    <WhatsAppIcon size={22} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">WhatsApp</p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Enviar diretamente para um contato</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    window.open(`mailto:?subject=${shareData.title}&body=${encodeURIComponent(shareData.message)}`, "_blank");
                    setShareData(null);
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-3 py-3.5 border-white/10 shadow-none hover:border-[var(--gm-primary)]/40 rounded-xl"
                >
                  <div className="shrink-0">
                    <Mail size={22} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">E-mail</p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Enviar por correio eletrônico</p>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareData.message);
                      alert("Texto copiado para a área de transferência!");
                      setShareData(null);
                    } catch (err) {
                      alert("Erro ao copiar texto.");
                    }
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-3 py-3.5 border-white/10 shadow-none hover:border-[var(--gm-primary)]/40 rounded-xl"
                >
                  <div className="shrink-0">
                    <Copy size={22} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">Copiar Texto</p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Copiar para colar em outro lugar</p>
                  </div>
                </button>

                {navigator.share && (
                  <button 
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: shareData.title,
                          text: shareData.message,
                        });
                        setShareData(null);
                      } catch (err) {
                        if ((err as Error).name !== 'AbortError') {
                          alert("Erro ao compartilhar.");
                        }
                      }
                    }}
                    className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-3 py-3.5 border-white/10 shadow-none hover:border-[var(--gm-primary)]/40 rounded-xl"
                  >
                    <div className="shrink-0">
                      <Share2 size={22} className="text-[var(--gm-primary)]" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[var(--gm-primary)] leading-tight">Mais Opções</p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Menu de compartilhamento do sistema</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </Page>
  );
};

export default Market;
