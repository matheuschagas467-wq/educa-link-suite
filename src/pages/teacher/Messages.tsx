import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Send, School, MessageSquare, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import AppLayout from "@/layouts/AppLayout";

interface Aluno {
  id: string;
  nome_do_aluno: string;
  serie: string;
  email_responsavel: string;
  telefone_responsavel: string;
  responsavel_nome?: string;
}

const MessagingSystem: React.FC = () => {
  const [series, setSeries] = useState<string[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const mensagensPredefinidas = [
    "Olá, informamos que o aluno [NOME_DO_ALUNO] não está se sentindo bem. Solicitamos que venha buscá-lo(a).",
    "Oi, o aluno [NOME_DO_ALUNO] tem chegado atrasado com frequência. Pedimos que entre em contato com a coordenação.",
    "Prezados, comunicamos que o aluno [NOME_DO_ALUNO] apresentou excelente desempenho na última avaliação.",
    "Informamos que o aluno [NOME_DO_ALUNO] está com pendências no material escolar. Por favor, providenciem o envio.",
    "Olá, estamos enviando essa mensagem para lembrar que a reunião de pais será realizada na próxima semana. Participe para acompanhar o progresso do(a) [NOME_DO_ALUNO].",
    "O aluno [NOME_DO_ALUNO] não compareceu às aulas nos últimos dias sem justificativa. Solicitamos que nos informe o motivo.",
    "Aviso importante: No dia [DATA], haverá um evento especial na escola e o aluno [NOME_DO_ALUNO] está convidado(a) a participar.",
    "Informamos que o aluno [NOME_DO_ALUNO] foi destaque em comportamento exemplar neste mês. Parabéns!",
    "Lembramos que o prazo para entrega dos trabalhos escolares é até o dia [DATA]. Por favor, auxilie o(a) [NOME_DO_ALUNO] em casa.",
    "Prezados pais, o aluno [NOME_DO_ALUNO] precisa realizar a regularização da documentação escolar. Solicitamos que compareçam à secretaria."
  ];

  // Carregar séries distintas do Supabase
  useEffect(() => {
    const carregarSeries = async () => {
      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('serie')
          .not('serie', 'is', null);

        if (error) {
          console.error('Erro ao carregar séries:', error);
          toast.error('Erro ao carregar séries');
          return;
        }

        // Extrair séries distintas
        const seriesDistintas = [...new Set(data.map(item => item.serie))];
        setSeries(seriesDistintas);
      } catch (error) {
        console.error('Erro ao conectar com Supabase:', error);
        toast.error('Erro ao conectar com o banco de dados');
      }
    };

    carregarSeries();
  }, []);

  // Carregar alunos quando uma série for selecionada
  useEffect(() => {
    if (selectedSerie) {
      carregarAlunos(selectedSerie);
    } else {
      setAlunos([]);
      setSelectedAluno(null);
    }
  }, [selectedSerie]);

  const carregarAlunos = async (serie: string) => {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('id, nome_do_aluno, serie, email_responsavel, telefone_responsavel, responsavel_nome')
        .eq('serie', serie);

      if (error) {
        console.error('Erro ao carregar alunos:', error);
        toast.error('Erro ao carregar alunos');
        return;
      }

      setAlunos(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast.error('Erro ao carregar alunos');
    }
  };

  const handleSerieChange = (value: string) => {
    setSelectedSerie(value);
    setSelectedAluno(null);
    setSelectedMessage('');
    setSelectedDate(undefined);
    setShowDatePicker(false);
  };

  const handleAlunoChange = (value: string) => {
    const aluno = alunos.find(a => a.id === value);
    setSelectedAluno(aluno || null);
    setSelectedMessage('');
    setSelectedDate(undefined);
    setShowDatePicker(false);
  };

  const handleMessageChange = (value: string) => {
    setSelectedMessage(value);

    // Verificar se a mensagem contém [DATA]
    if (value.includes('[DATA]')) {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      setSelectedDate(undefined);
    }
  };

  const processarMensagem = () => {
    if (!selectedAluno || !selectedMessage) return '';

    let mensagemProcessada = selectedMessage.replace(/\[NOME_DO_ALUNO\]/g, selectedAluno.nome_do_aluno);

    if (selectedMessage.includes('[DATA]') && selectedDate) {
      const dataFormatada = format(selectedDate, 'dd/MM/yyyy', { locale: ptBR });
      mensagemProcessada = mensagemProcessada.replace(/\[DATA\]/g, dataFormatada);
    }

    return mensagemProcessada;
  };

  const validarFormulario = () => {
    if (!selectedSerie) {
      toast.error('Por favor, selecione uma série');
      return false;
    }
    if (!selectedAluno) {
      toast.error('Por favor, selecione um aluno');
      return false;
    }
    if (!selectedMessage) {
      toast.error('Por favor, selecione uma mensagem');
      return false;
    }
    if (selectedMessage.includes('[DATA]') && !selectedDate) {
      toast.error('Por favor, selecione uma data');
      return false;
    }
    return true;
  };

  const enviarMensagem = async () => {
    if (!validarFormulario()) return;

    setIsLoading(true);
    try {
      // Salvar mensagem no banco de dados local
      const { error: dbError } = await supabase
        .from('mensagens_enviadas')
        .insert({
          aluno_id: selectedAluno!.id,
          mensagem: processarMensagem(),
          email_responsavel: selectedAluno!.email_responsavel,
          telefone_responsavel: selectedAluno!.telefone_responsavel,
          status: 'enviada'
        });

      if (dbError) {
        console.error('Erro ao salvar mensagem:', dbError);
        toast.error('Erro ao salvar mensagem no banco de dados');
        return;
      }

      // envio via webhook (você pode descomentar e configurar o endpoint real)
      const payload = {
        nome_do_aluno: selectedAluno!.nome_do_aluno,
        serie: selectedSerie,
        mensagem: processarMensagem(),
        email_responsavel: selectedAluno!.email_responsavel,
        telefone_responsavel: selectedAluno!.telefone_responsavel
      };

      const response = await fetch('https://marcelmelo.app.n8n.cloud/webhook-test/b5d40ed8-186d-4028-b84a-2c2f63532f07', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload )
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem via webhook');
      }

      toast.success('Mensagem enviada com sucesso!');

      // Limpar formulário
      setSelectedSerie('');
      setSelectedAluno(null);
      setSelectedMessage('');
      setSelectedDate(undefined);
      setShowDatePicker(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/20 to-primary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <School className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Comunicação</h1>
          <p className="text-xl text-muted-foreground">
            Sistema de comunicação escolar com responsáveis
          </p>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Enviar Mensagem</CardTitle>
            <CardDescription className="text-center">
              Selecione o aluno e a mensagem que deseja enviar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Serie Selection */}
            <div className="space-y-2">
              <Label htmlFor="serie" className="text-sm font-medium">
                Série
              </Label>
              <Select value={selectedSerie} onValueChange={handleSerieChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma série" />
                </SelectTrigger>
                <SelectContent>
                  {series.map(serie => (
                    <SelectItem key={serie} value={serie}>
                      {serie}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="aluno" className="text-sm font-medium">
                Aluno
              </Label>
              <Select value={selectedAluno?.id || ''} onValueChange={handleAlunoChange} disabled={!selectedSerie}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {alunos.map(aluno => (
                    <SelectItem key={aluno.id} value={aluno.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{aluno.nome_do_aluno}</span>
                        {aluno.responsavel_nome && (
                          <span className="text-sm text-muted-foreground">
                            Responsável: {aluno.responsavel_nome}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Selection */}
            <div className="space-y-2">
              <Label htmlFor="mensagem" className="text-sm font-medium">
                Mensagem
              </Label>
              <Select value={selectedMessage} onValueChange={handleMessageChange} disabled={!selectedAluno}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma mensagem" />
                </SelectTrigger>
                <SelectContent>
                  {mensagensPredefinidas.map((mensagem, index) => (
                    <SelectItem key={index} value={mensagem}>
                      {mensagem.length > 80 ? `${mensagem.substring(0, 80)}...` : mensagem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            {showDatePicker && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Data
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Message Preview */}
            {selectedMessage && selectedAluno && (
              <div className="bg-accent/30 p-4 rounded-lg border border-accent">
                <Label className="text-sm font-medium mb-2 block">
                  Prévia da Mensagem:
                </Label>
                <p className="text-sm italic bg-card p-3 rounded border">
                  {processarMensagem()}
                </p>
                {selectedAluno.email_responsavel && (
                  <p className="text-xs text-muted-foreground mt-2">
                    📧 Para: {selectedAluno.email_responsavel}
                  </p>
                )}
                {selectedAluno.telefone_responsavel && (
                  <p className="text-xs text-muted-foreground">
                    📱 WhatsApp: {selectedAluno.telefone_responsavel}
                  </p>
                )}
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={enviarMensagem}
              disabled={isLoading || !validarFormulario()}
              className="w-full bg-primary hover:bg-primary-dark text-primary-foreground font-medium py-6 text-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  Enviando...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Mensagem
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function TeacherMessages() {
  return (
    <AppLayout role="teacher" title="Mensagens" description="Envie comunicados aos pais">
      <MessagingSystem />
    </AppLayout>
  );
}
