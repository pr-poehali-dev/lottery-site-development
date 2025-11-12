import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_AUTH = 'https://functions.poehali.dev/7f5d84ad-6192-47be-97e0-f3cf57104b18';
const API_ADMIN = 'https://functions.poehali.dev/3f10c33f-9e2a-417d-9276-96e8c6c3309d';
const API_GAME = 'https://functions.poehali.dev/538685aa-545d-430f-b69c-1e735f2a8b67';

type User = {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
};

type Game = {
  id: string;
  name: string;
  icon: string;
  description: string;
  minBet: number;
};

const games: Game[] = [
  { id: 'upgrade', name: 'Апгрейд', icon: 'TrendingUp', description: 'Удвой свою ставку с шансом 50%', minBet: 10 },
  { id: 'keno', name: 'Кено', icon: 'Grid3x3', description: 'Выбери числа и выиграй джекпот', minBet: 5 },
  { id: 'case-battle', name: 'Кейс-Батл', icon: 'Swords', description: 'Сражайся за лучшие призы', minBet: 50 },
  { id: 'roulette', name: 'Рулетка', icon: 'CircleDot', description: 'Красное или черное?', minBet: 1 },
];

export default function Index() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [adminAmount, setAdminAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: username.trim(),
          password: password.trim()
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        return;
      }
      
      const newUser: User = {
        id: data.id,
        username: data.username,
        balance: data.balance,
        isAdmin: data.isAdmin
      };
      
      setUser(newUser);
      localStorage.setItem('casinoUser', JSON.stringify(newUser));
      setIsAuthOpen(false);
      setUsername('');
      setPassword('');
      
      toast({ 
        title: authMode === 'register' ? '🎰 Регистрация успешна!' : '🎰 Добро пожаловать!',
        description: `${newUser.username}, ваш ID: ${newUser.id}` 
      });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('casinoUser');
    toast({ title: 'Выход выполнен', description: 'До скорой встречи!' });
  };

  const handleAddBalance = async () => {
    if (!user?.isAdmin) return;
    
    const amount = parseFloat(adminAmount);
    if (!adminUserId || isNaN(amount) || amount <= 0) {
      toast({ title: 'Ошибка', description: 'Проверьте данные', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(API_ADMIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          targetUserId: adminUserId,
          amount: amount
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        return;
      }
      
      toast({ 
        title: '✅ Баланс начислен', 
        description: `${data.amountAdded}₽ → ${data.targetUsername} (${data.targetUserId})` 
      });
      setAdminUserId('');
      setAdminAmount('');
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить операцию', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayGame = async () => {
    if (!selectedGame || !user) return;
    
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < selectedGame.minBet) {
      toast({ 
        title: 'Ошибка', 
        description: `Минимальная ставка: ${selectedGame.minBet}₽`,
        variant: 'destructive' 
      });
      return;
    }
    
    if (bet > user.balance) {
      toast({ title: 'Ошибка', description: 'Недостаточно средств', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(API_GAME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameType: selectedGame.id,
          betAmount: bet
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        return;
      }
      
      const updatedUser = { ...user, balance: data.newBalance };
      setUser(updatedUser);
      localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
      
      if (data.won) {
        toast({ 
          title: '🎉 Выигрыш!', 
          description: `+${data.winAmount.toFixed(2)}₽ | Баланс: ${data.newBalance.toFixed(2)}₽`,
          duration: 5000
        });
      } else {
        toast({ 
          title: '😔 Проигрыш', 
          description: `${data.balanceChange.toFixed(2)}₽ | Баланс: ${data.newBalance.toFixed(2)}₽`,
          variant: 'destructive',
          duration: 5000
        });
      }
      
      setSelectedGame(null);
      setBetAmount('');
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить ставку', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#0F1419] to-[#0A0E1A]">
      <header className="border-b border-primary/30 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎰</div>
            <h1 className="text-2xl font-bold gold-glow text-primary">ROYAL CASINO</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#games" className="text-foreground/80 hover:text-primary transition-colors">Игры</a>
            <a href="#profile" className="text-foreground/80 hover:text-primary transition-colors">Профиль</a>
            <a href="#rules" className="text-foreground/80 hover:text-primary transition-colors">Правила</a>
          </nav>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm text-muted-foreground">{user.username}</div>
                <div className="text-lg font-bold text-primary">{user.balance.toFixed(2)}₽</div>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <Icon name="LogOut" size={16} />
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsAuthOpen(true)} className="premium-gradient text-background font-semibold">
              Войти
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <section id="games" className="mb-16 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-4 gold-glow text-primary">Игровой Зал</h2>
            <p className="text-xl text-muted-foreground">Выбери свою удачу</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {games.map((game) => (
              <Card 
                key={game.id}
                className="bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all hover:scale-105 cursor-pointer animate-glow-pulse overflow-hidden group"
                onClick={() => user ? setSelectedGame(game) : setIsAuthOpen(true)}
              >
                <div className="p-6 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
                  <div className="relative z-10">
                    <div className="text-5xl mb-4 text-primary">
                      <Icon name={game.icon as any} size={48} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-foreground">{game.name}</h3>
                    <p className="text-muted-foreground mb-4">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary">Мин. ставка: {game.minBet}₽</span>
                      <Icon name="ChevronRight" size={20} className="text-primary" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {user && (
          <>
            <section id="profile" className="mb-16">
              <Card className="bg-card/80 backdrop-blur-sm border-primary/20 p-8">
                <h2 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                  <Icon name="User" size={32} />
                  Профиль
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Никнейм</div>
                    <div className="text-xl font-bold">{user.username}</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">ID Аккаунта</div>
                    <div className="text-xl font-bold text-primary">{user.id}</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Баланс</div>
                    <div className="text-2xl font-bold text-primary">{user.balance.toFixed(2)}₽</div>
                  </div>
                </div>
              </Card>
            </section>

            {user.isAdmin && (
              <section className="mb-16">
                <Card className="bg-card/80 backdrop-blur-sm border-secondary/50 p-8">
                  <h2 className="text-3xl font-bold mb-6 text-secondary flex items-center gap-3">
                    <Icon name="Shield" size={32} />
                    Админ-панель
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="userId">ID Пользователя</Label>
                      <Input 
                        id="userId"
                        placeholder="ID123456789"
                        value={adminUserId}
                        onChange={(e) => setAdminUserId(e.target.value)}
                        className="bg-muted/30"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Сумма (₽)</Label>
                      <Input 
                        id="amount"
                        type="number"
                        placeholder="1000"
                        value={adminAmount}
                        onChange={(e) => setAdminAmount(e.target.value)}
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={handleAddBalance} 
                        disabled={isLoading}
                        className="w-full bg-secondary hover:bg-secondary/90"
                      >
                        <Icon name="Plus" size={16} className="mr-2" />
                        Начислить
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>
            )}
          </>
        )}

        <section id="rules" className="mb-16">
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20 p-8">
            <h2 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
              <Icon name="BookOpen" size={32} />
              Правила
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>• Минимальный возраст для участия — 18 лет</p>
              <p>• Запрещено использование ботов и скриптов</p>
              <p>• Один аккаунт на одного пользователя</p>
              <p>• Вывод средств доступен после верификации</p>
              <p>• Администрация оставляет за собой право блокировки при нарушении правил</p>
            </div>
          </Card>
        </section>
      </main>

      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary gold-glow">Вход в казино</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {authMode === 'login' ? 'Войдите в существующий аккаунт' : 'Создайте новый аккаунт'}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value={authMode} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="username">Никнейм</Label>
                <Input 
                  id="username"
                  placeholder="Введите никнейм"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-muted/30"
                />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input 
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="bg-muted/30"
                />
              </div>
              <Button 
                onClick={handleAuth} 
                disabled={isLoading}
                className="w-full premium-gradient text-background font-semibold"
              >
                {isLoading ? 'Загрузка...' : authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {selectedGame && (
        <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
          <DialogContent className="bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary gold-glow flex items-center gap-3">
                <Icon name={selectedGame.icon as any} size={28} />
                {selectedGame.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground">{selectedGame.description}</p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Ваш баланс</div>
                <div className="text-2xl font-bold text-primary">{user?.balance.toFixed(2)}₽</div>
              </div>
              <div>
                <Label htmlFor="betAmount">Ставка (мин. {selectedGame.minBet}₽)</Label>
                <Input 
                  id="betAmount"
                  type="number"
                  placeholder={`${selectedGame.minBet}`}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="bg-muted/30"
                  min={selectedGame.minBet}
                />
              </div>
              <Button 
                onClick={handlePlayGame}
                disabled={isLoading}
                className="w-full premium-gradient text-background font-semibold"
              >
                {isLoading ? 'Игра...' : 'Играть'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
