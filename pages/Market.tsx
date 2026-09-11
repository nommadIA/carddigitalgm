
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ShoppingCart, Trash2, Mic, Check, DollarSign, Wallet, Loader2, X, Sparkles, Share2, History, Mail, Copy, Calendar, ChevronDown } from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { CURRENCY_FORMATTER } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { broadcastAppNotification } from '../lib/syncHub';
import { openWhatsapp } from '../services/whatsApp';
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
import { SectionDivider } from "../components/ui/SectionDivider";
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

  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const priceInputRef = React.useRef<HTMLInputElement>(null);
  const qtyInputRef = React.useRef<HTMLInputElement>(null);
  const productContainerRef = React.useRef<HTMLDivElement>(null);

  // Estados para os 4 comandos de voz e fluxo guiado
  const [voiceStep, setVoiceStep] = useState<'idle' | 'product' | 'price' | 'value' | 'quantity' | 'ready'>('idle');
  const [activeVoiceCommand, setActiveVoiceCommand] = useState<null | 'product' | 'price' | 'value' | 'quantity' | 'sequential'>(null);
  const [voiceStatusText, setVoiceStatusText] = useState<string>('');

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

  const handleProductNameChange = (val: string) => {
    setNewItemName(val);
    setShowProductSuggestions(val.trim().length > 0);
    // Se o usuário apagar manualmente o produto, a ação não conclui e volta para a etapa 1 (Produto)
    if (val.trim() === '') {
      setVoiceStep('product');
    }
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
    // Se o usuário apagar manualmente o preço/valor, a ação não conclui e volta para a etapa 2/3 (Preço/Valor)
    if (val.trim() === '' || val === '0,00' || val === '0') {
      setVoiceStep('price');
    }
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    const clean = val.replace(/^0+(?=\d)/, '');
    setNewItemQty(clean);
    // Se o usuário apagar manualmente a quantidade, a ação não conclui e volta para a etapa 4 (Quantidade)
    if (clean === '' || clean === '0') {
      setVoiceStep('quantity');
    }
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
    setVoiceStep('price');
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

  const handleAddItem = async () => {
    const nome = newItemName.trim();
    const preco = parsePriceStr(newItemPrice);
    if (!nome) return;
    
    setAddingItem(true);
    try {
        const { data, error } = await supabase.from("shopping_items").insert({
            tenant_id: tenantId,
            user_id: user?.id,
            name: nome,
            unit_price: preco,
            quantity: Number(newItemQty) || 1
        }).select().single();

        if (error) throw error;

        setCartItems(prev => [data, ...prev]);
        setNewItemName(""); 
        setNewItemPrice(""); 
        setNewItemQty(1);
        setShowProductSuggestions(false);
    } catch (e: any) {
        alert("Erro ao adicionar item: " + e.message);
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
          // 1. The "Cha" (noise/slide)
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
          
          // 2. The "Ching" (high bell)
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

  // Helper para converter palavras em números (português)
  const parsePortugueseWordsToNumber = (text: string): number | null => {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Se já tiver dígitos
    const directMatch = lower.match(/\d+([.,]\d+)?/);
    if (directMatch) {
      const num = parseFloat(directMatch[0].replace(',', '.'));
      if (!isNaN(num)) return num;
    }

    const wordMap: Record<string, number> = {
      "zero": 0, "um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3, "tres": 3,
      "quatro": 4, "cinco": 5, "seis": 6, "meia": 6, "sete": 7, "oito": 8, "nove": 9,
      "dez": 10, "onze": 11, "doze": 12, "treze": 13, "quatorze": 14, "catorze": 14,
      "quinze": 15, "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19,
      "vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50, "sessenta": 60,
      "setenta": 70, "oitenta": 80, "noventa": 90, "cem": 100, "cento": 100,
      "duzentos": 200, "trezentos": 300, "quatrocentos": 400, "quinhentos": 500
    };

    if (wordMap[lower] !== undefined) return wordMap[lower];

    let total = 0;
    const tokens = lower.split(/\s+/).filter(t => t !== "e" && t !== "com" && t !== "de" && t !== "unidades" && t !== "unidade");
    let matched = false;
    for (const token of tokens) {
      if (wordMap[token] !== undefined) {
        total += wordMap[token];
        matched = true;
      }
    }
    return matched ? total : null;
  };

  // Helper para converter áudio de preço ou valor falado em número
  const parsePriceFromVoiceText = (transcript: string): number | null => {
    if (!transcript) return null;
    const text = transcript.toLowerCase()
      .replace(/r\$/gi, '')
      .replace(/reais/gi, 'reais')
      .replace(/real/gi, 'real')
      .trim();

    // Se tiver dígitos: "10,50", "10.50", "10 e 50", "10 reais e 50 centavos"
    const digitRegex = /(\d+)(?:[.,](\d{1,2})|\s+(?:reais|real)?\s*(?:e|com)?\s*(\d{1,2})\s*(?:centavos|centavo)?)?/i;
    const match = text.match(digitRegex);
    if (match) {
      const whole = match[1];
      let decimal = match[2] || match[3] || '00';
      if (decimal.length === 1) decimal += '0';
      return parseFloat(`${whole}.${decimal}`);
    }

    // Se for apenas palavras: "dez reais e cinquenta centavos", "cinco reais"
    const reaisPart = text.split(/reais|real/)[0]?.trim();
    const centavosPart = (text.includes('reais') || text.includes('real')) ? text.split(/reais|real/)[1]?.replace(/centavos|centavo/g, '').trim() : '';

    if (reaisPart) {
      const wholeNum = parsePortugueseWordsToNumber(reaisPart);
      if (wholeNum !== null) {
        let decNum = 0;
        if (centavosPart) {
          const parsedDec = parsePortugueseWordsToNumber(centavosPart);
          if (parsedDec !== null) decNum = parsedDec;
        }
        return wholeNum + (decNum / 100);
      }
    }

    return parsePortugueseWordsToNumber(text);
  };

  // Helper para converter áudio de quantidade falada em número
  const parseQtyFromVoiceText = (transcript: string): number => {
    if (!transcript) return 1;
    const num = parsePortugueseWordsToNumber(transcript);
    if (num && num > 0) return Math.round(num);
    return 1;
  };

  // Helper para limpar e formatar nome de produto
  const cleanProductName = (transcript: string): string => {
    if (!transcript) return '';
    let cleaned = transcript
      .replace(/^(produto|o produto é|cadastrar|adicionar|item|o item é|quero|coloca|coloque|anote)\s*:?/i, '')
      .replace(/["'“”]/g, '')
      .trim();
    if (!cleaned) cleaned = transcript.trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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

  const formatProductNameWithAI = async (rawText: string): Promise<string> => {
    let productName = cleanProductName(rawText);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Formate o nome deste produto para uma lista de compras de supermercado. Texto: "${rawText}". Retorne APENAS o nome formatado, sem aspas, sem markdown. Exemplo: "Arroz 5 quilos" -> "Arroz 5kg", "leite desnatado 1 litro" -> "Leite Desnatado 1L".`,
        });
        const text = response.text?.trim();
        if (text) productName = text;
      } catch (err) {
        console.error("Erro ao formatar produto com Gemini:", err);
      }
    }
    return productName.charAt(0).toUpperCase() + productName.slice(1);
  };

  const handleVoiceError = (err: any) => {
    if (err.message === "not-supported") {
      alert("Seu navegador não suporta reconhecimento de voz.");
    } else if (err.message === 'not-allowed') {
      alert("Permissão negada para usar o microfone. Por favor, permita o acesso ao microfone no seu navegador para usar esta função.");
    } else if (err.message !== "no-speech") {
      console.error("Erro no reconhecimento de voz:", err);
    }
    setVoiceStatusText('');
  };

  // 1. Comando de Voz: PRODUTO
  const handleVoiceCommand1Product = async () => {
    try {
      setActiveVoiceCommand('product');
      setVoiceStep('product');
      setVoiceStatusText('1. Fale o nome do Produto...');
      await playSound('beep');
      setIsListening(true);
      const productTranscript = await listenVoice();
      setIsListening(false);
      
      setProcessingVoice(true);
      setVoiceStatusText('Formatando produto...');
      const formatted = await formatProductNameWithAI(productTranscript);
      setNewItemName(formatted);
      setProcessingVoice(false);
      setVoiceStatusText(`Produto: ${formatted}`);
      
      // Avança para a etapa de Preço e foca no campo
      setVoiceStep('price');
      setTimeout(() => {
        if (priceInputRef.current) {
          priceInputRef.current.focus();
          priceInputRef.current.select();
        }
      }, 100);
    } catch (err: any) {
      handleVoiceError(err);
    } finally {
      setIsListening(false);
      setProcessingVoice(false);
      setActiveVoiceCommand(null);
    }
  };

  // 2. Comando de Voz: PREÇO
  const handleVoiceCommand2Price = async () => {
    try {
      setActiveVoiceCommand('price');
      setVoiceStep('price');
      setVoiceStatusText('2. Fale o Preço (ex: dez reais e cinquenta)...');
      await playSound('beep');
      setIsListening(true);
      const priceTranscript = await listenVoice();
      setIsListening(false);
      
      setProcessingVoice(true);
      setVoiceStatusText('Processando preço...');
      const priceNum = parsePriceFromVoiceText(priceTranscript);
      if (priceNum !== null && !isNaN(priceNum) && priceNum > 0) {
        setNewItemPrice(priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setVoiceStatusText(`Preço: R$ ${priceNum.toFixed(2).replace('.', ',')}`);
      } else {
        const clean = priceTranscript.replace(/[^0-9.,]/g, '').replace('.', ',');
        setNewItemPrice(clean || '0,00');
      }
      setProcessingVoice(false);
      
      // Avança para a etapa de Quantidade e foca
      setVoiceStep('quantity');
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 100);
    } catch (err: any) {
      handleVoiceError(err);
    } finally {
      setIsListening(false);
      setProcessingVoice(false);
      setActiveVoiceCommand(null);
    }
  };

  // 3. Comando de Voz: VALOR
  const handleVoiceCommand3Value = async () => {
    try {
      setActiveVoiceCommand('value');
      setVoiceStep('value');
      setVoiceStatusText('3. Fale o Valor (ex: quinze reais)...');
      await playSound('beep');
      setIsListening(true);
      const valTranscript = await listenVoice();
      setIsListening(false);
      
      setProcessingVoice(true);
      setVoiceStatusText('Processando valor...');
      const priceNum = parsePriceFromVoiceText(valTranscript);
      if (priceNum !== null && !isNaN(priceNum) && priceNum > 0) {
        setNewItemPrice(priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setVoiceStatusText(`Valor: R$ ${priceNum.toFixed(2).replace('.', ',')}`);
      } else {
        const clean = valTranscript.replace(/[^0-9.,]/g, '').replace('.', ',');
        setNewItemPrice(clean || '0,00');
      }
      setProcessingVoice(false);
      
      // Avança para a etapa de Quantidade e foca
      setVoiceStep('quantity');
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 100);
    } catch (err: any) {
      handleVoiceError(err);
    } finally {
      setIsListening(false);
      setProcessingVoice(false);
      setActiveVoiceCommand(null);
    }
  };

  // 4. Comando de Voz: QUANTIDADE
  const handleVoiceCommand4Quantity = async () => {
    try {
      setActiveVoiceCommand('quantity');
      setVoiceStep('quantity');
      setVoiceStatusText('4. Fale a Quantidade (ex: 2 unidades, 3)...');
      await playSound('beep');
      setIsListening(true);
      const qtyTranscript = await listenVoice();
      setIsListening(false);
      
      setProcessingVoice(true);
      setVoiceStatusText('Processando quantidade...');
      const qtyNum = parseQtyFromVoiceText(qtyTranscript);
      setNewItemQty(qtyNum || 1);
      setProcessingVoice(false);
      setVoiceStatusText(`Quantidade: ${qtyNum || 1}`);
      setVoiceStep('ready');
      await playSound('cash');
    } catch (err: any) {
      handleVoiceError(err);
    } finally {
      setIsListening(false);
      setProcessingVoice(false);
      setActiveVoiceCommand(null);
    }
  };

  // Gravação Sequencial Completa (1 ➔ 2 ➔ 4)
  const handleVoiceSequential = async () => {
    try {
      setActiveVoiceCommand('sequential');
      
      // 1. PRODUTO
      setVoiceStep('product');
      setVoiceStatusText('1/3. Diga o nome do Produto...');
      await playSound('beep');
      setIsListening(true);
      const productTranscript = await listenVoice();
      setIsListening(false);
      
      setProcessingVoice(true);
      setVoiceStatusText('Formatando produto...');
      const formattedProd = await formatProductNameWithAI(productTranscript);
      setNewItemName(formattedProd);
      setProcessingVoice(false);

      // 2. PREÇO / VALOR
      setVoiceStep('price');
      setVoiceStatusText('2/3. Diga o Preço ou Valor...');
      await playSound('beep');
      setIsListening(true);
      const priceTranscript = await listenVoice();
      setIsListening(false);
      
      setProcessingVoice(true);
      setVoiceStatusText('Processando preço...');
      const priceNum = parsePriceFromVoiceText(priceTranscript);
      if (priceNum !== null && !isNaN(priceNum) && priceNum > 0) {
        setNewItemPrice(priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
      setProcessingVoice(false);

      // 3. QUANTIDADE
      setVoiceStep('quantity');
      setVoiceStatusText('3/3. Diga a Quantidade...');
      await playSound('beep');
      setIsListening(true);
      const qtyTranscript = await listenVoice();
      setIsListening(false);

      setProcessingVoice(true);
      const qtyNum = parseQtyFromVoiceText(qtyTranscript);
      setNewItemQty(qtyNum || 1);
      setProcessingVoice(false);

      setVoiceStep('ready');
      setVoiceStatusText('Cadastro por voz concluído com sucesso!');
      await playSound('cash');
    } catch (err: any) {
      handleVoiceError(err);
    } finally {
      setIsListening(false);
      setProcessingVoice(false);
      setActiveVoiceCommand(null);
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

        // Notificação simultânea para Smartphone & Desktop
        try {
          broadcastAppNotification(tenantId, {
            title: "🛒 Compras de Mercado Finalizadas",
            message: `Total: R$ ${totalListValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            type: "expense",
            amount: totalListValue,
            url: "/market",
          });
        } catch (e) {}

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
       <div className="w-full space-y-6 pb-20 sm:pb-28 md:pb-36 mb-12">
       <SectionDivider label="Resumo Financeiro" />
       <Grid cols={1}>
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

       <SectionDivider label={showHistory ? "Histórico de Gastos" : "Lista de Compras"} />

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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div className="text-lg font-bold text-white flex items-center gap-2">
                            <span>Adicionar Item</span>
                        </div>
                        {voiceStatusText && (
                            <div className="text-xs px-3 py-1.5 rounded-lg bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 font-bold flex items-center gap-2 animate-pulse">
                                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gm-primary)]"></span>
                                {voiceStatusText}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-5">
                        {/* 4 Voice Commands Section */}
                        <div className="w-full barra p-4 rounded-xl border border-white/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <span className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                                    <Mic size={15} className="text-[var(--gm-primary)]" />
                                    Captação por Voz (4 Comandos)
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {voiceStep === 'product' && '📍 Etapa atual: 1. Produto'}
                                    {voiceStep === 'price' && '📍 Etapa atual: 2. Preço'}
                                    {voiceStep === 'value' && '📍 Etapa atual: 3. Valor'}
                                    {voiceStep === 'quantity' && '📍 Etapa atual: 4. Quantidade'}
                                    {voiceStep === 'ready' && '✅ Todas as etapas preenchidas!'}
                                    {voiceStep === 'idle' && 'Toque em um comando ou no fluxo sequencial'}
                                </span>
                            </div>

                            {/* 4 Comandos de Voz */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                                {/* 1. PRODUTO */}
                                <button 
                                    type="button"
                                    onClick={handleVoiceCommand1Product}
                                    disabled={isListening || processingVoice}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-none cursor-pointer ${
                                        activeVoiceCommand === 'product' && isListening 
                                            ? 'bg-red-500 text-white border-red-400 animate-pulse'
                                            : activeVoiceCommand === 'product' && processingVoice
                                            ? 'bg-amber-500 text-white border-amber-400'
                                            : voiceStep === 'product'
                                            ? 'bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40'
                                            : 'bg-black/40 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                    title="Gravar por voz: 1. Produto"
                                >
                                    {activeVoiceCommand === 'product' && isListening ? (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                    ) : activeVoiceCommand === 'product' && processingVoice ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Mic size={13} className={voiceStep === 'product' ? 'text-white' : 'text-[var(--gm-primary)]'} />
                                    )}
                                    <span>1. Produto</span>
                                </button>

                                {/* 2. PREÇO */}
                                <button 
                                    type="button"
                                    onClick={handleVoiceCommand2Price}
                                    disabled={isListening || processingVoice}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-none cursor-pointer ${
                                        activeVoiceCommand === 'price' && isListening 
                                            ? 'bg-red-500 text-white border-red-400 animate-pulse'
                                            : activeVoiceCommand === 'price' && processingVoice
                                            ? 'bg-amber-500 text-white border-amber-400'
                                            : voiceStep === 'price'
                                            ? 'bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40'
                                            : 'bg-black/40 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                    title="Gravar por voz: 2. Preço"
                                >
                                    {activeVoiceCommand === 'price' && isListening ? (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                    ) : activeVoiceCommand === 'price' && processingVoice ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Mic size={13} className={voiceStep === 'price' ? 'text-white' : 'text-[var(--gm-primary)]'} />
                                    )}
                                    <span>2. Preço</span>
                                </button>

                                {/* 3. VALOR */}
                                <button 
                                    type="button"
                                    onClick={handleVoiceCommand3Value}
                                    disabled={isListening || processingVoice}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-none cursor-pointer ${
                                        activeVoiceCommand === 'value' && isListening 
                                            ? 'bg-red-500 text-white border-red-400 animate-pulse'
                                            : activeVoiceCommand === 'value' && processingVoice
                                            ? 'bg-amber-500 text-white border-amber-400'
                                            : voiceStep === 'value'
                                            ? 'bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40'
                                            : 'bg-black/40 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                    title="Gravar por voz: 3. Valor"
                                >
                                    {activeVoiceCommand === 'value' && isListening ? (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                    ) : activeVoiceCommand === 'value' && processingVoice ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Mic size={13} className={voiceStep === 'value' ? 'text-white' : 'text-[var(--gm-primary)]'} />
                                    )}
                                    <span>3. Valor</span>
                                </button>

                                {/* 4. QUANTIDADE */}
                                <button 
                                    type="button"
                                    onClick={handleVoiceCommand4Quantity}
                                    disabled={isListening || processingVoice}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-none cursor-pointer ${
                                        activeVoiceCommand === 'quantity' && isListening 
                                            ? 'bg-red-500 text-white border-red-400 animate-pulse'
                                            : activeVoiceCommand === 'quantity' && processingVoice
                                            ? 'bg-amber-500 text-white border-amber-400'
                                            : voiceStep === 'quantity'
                                            ? 'bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/40'
                                            : 'bg-black/40 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                    title="Gravar por voz: 4. Quantidade"
                                >
                                    {activeVoiceCommand === 'quantity' && isListening ? (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                    ) : activeVoiceCommand === 'quantity' && processingVoice ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Mic size={13} className={voiceStep === 'quantity' ? 'text-white' : 'text-[var(--gm-primary)]'} />
                                    )}
                                    <span>4. Quantidade</span>
                                </button>
                            </div>

                            {/* Botão de Gravação Sequencial Completa */}
                            <button 
                                type="button"
                                onClick={handleVoiceSequential}
                                disabled={isListening || processingVoice}
                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all shadow-none cursor-pointer ${
                                    activeVoiceCommand === 'sequential' && isListening
                                        ? 'bg-red-500 text-white border-red-400 animate-pulse'
                                        : activeVoiceCommand === 'sequential' && processingVoice
                                        ? 'bg-amber-500 text-white border-amber-400'
                                        : 'bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)] hover:text-white border-[var(--gm-primary)]/30'
                                }`}
                            >
                                {activeVoiceCommand === 'sequential' && isListening ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Ouvindo passo atual...</span>
                                    </>
                                ) : activeVoiceCommand === 'sequential' && processingVoice ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Processando fala...</span>
                                    </>
                                ) : (
                                    <>
                                        <Mic size={14} />
                                        <span>🎙️ Gravar Sequencial Completo (1. Produto ➔ 2. Preço ➔ 4. Qtd)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full relative" ref={productContainerRef}>
                                    <label className="gm-label mb-1.5 flex items-center justify-between">
                                        <span>Produto (1. Alimento / Item)</span>
                                        {voiceStep === 'product' && (
                                            <span className="text-[10px] text-[var(--gm-primary)] font-bold animate-pulse">● Etapa 1 Ativa</span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            ref={nameInputRef}
                                            type="text"
                                            className={`gm-input w-full h-12 pr-10 rounded-xl shadow-none bg-black/30 transition-all ${
                                                voiceStep === 'product' 
                                                    ? 'border-[var(--gm-primary)] ring-1 ring-[var(--gm-primary)]/50' 
                                                    : 'border-white/10'
                                            }`} 
                                            value={newItemName} 
                                            onChange={e => handleProductNameChange(e.target.value)}
                                            onFocus={() => {
                                                if (newItemName.trim()) {
                                                    setShowProductSuggestions(true);
                                                }
                                                setVoiceStep('product');
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
                                                    setVoiceStep('product');
                                                    nameInputRef.current?.focus();
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                                title="Apagar produto e retornar à etapa 1"
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
                                    <label className="gm-label mb-1.5 flex items-center justify-between">
                                        <span>Preço / Valor (2/3)</span>
                                        {(voiceStep === 'price' || voiceStep === 'value') && (
                                            <span className="text-[10px] text-[var(--gm-primary)] font-bold animate-pulse">● Etapa 2/3</span>
                                        )}
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--gm-primary)] z-10 pointer-events-none select-none">R$</span>
                                        <input 
                                            ref={priceInputRef}
                                            type="text" 
                                            inputMode="decimal"
                                            className={`gm-input h-12 w-full !pl-11 pr-3 font-bold text-base md:text-lg text-white rounded-xl shadow-none bg-black/30 transition-all ${
                                                voiceStep === 'price' || voiceStep === 'value'
                                                    ? 'border-[var(--gm-primary)] ring-1 ring-[var(--gm-primary)]/50' 
                                                    : 'border-white/10'
                                            }`} 
                                            value={newItemPrice} 
                                            onChange={handlePriceChange}
                                            onBlur={handlePriceBlur}
                                            onFocus={(e) => {
                                                handlePriceFocus(e);
                                                setVoiceStep('price');
                                            }} 
                                            onClick={(e) => {
                                                (e.target as HTMLInputElement).select();
                                                if (newItemPrice === '0,00' || newItemPrice === '0') setNewItemPrice('');
                                            }}
                                            placeholder="0,00" 
                                        />
                                    </div>
                                </div>

                                <div className="w-full md:w-24">
                                    <label className="gm-label mb-1.5 flex items-center justify-between">
                                        <span>Qtd (4)</span>
                                        {voiceStep === 'quantity' && (
                                            <span className="text-[10px] text-[var(--gm-primary)] font-bold animate-pulse">● Etapa 4</span>
                                        )}
                                    </label>
                                    <input 
                                        ref={qtyInputRef}
                                        className={`gm-input text-center h-12 w-full font-bold rounded-xl shadow-none bg-black/30 transition-all ${
                                            voiceStep === 'quantity' 
                                                ? 'border-[var(--gm-primary)] ring-1 ring-[var(--gm-primary)]/50' 
                                                : 'border-white/10'
                                        }`} 
                                        type="text" 
                                        inputMode="numeric"
                                        value={newItemQty} 
                                        onChange={handleQtyChange} 
                                        onBlur={() => {
                                            if (!newItemQty || Number(newItemQty) < 1) {
                                                setNewItemQty(1);
                                            }
                                        }}
                                        onFocus={(e) => {
                                            e.target.select();
                                            if (newItemQty === 0 || newItemQty === '0') setNewItemQty('');
                                            setVoiceStep('quantity');
                                        }}
                                        placeholder="1" 
                                    />
                                </div>

                                <button className="gm-btn h-12 w-full md:w-auto px-8 rounded-xl font-bold flex items-center justify-center gap-2 shadow-none" onClick={handleAddItem} disabled={addingItem}>
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
       </div>

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
