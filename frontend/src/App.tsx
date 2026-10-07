import { MotionConfig } from 'framer-motion';
import { Toasts } from './components/Toasts';
import { useTheme } from './lib/theme';
import { useRoute } from './lib/router';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';

export function App() {
  useTheme(); // kaydedilmiş temayı ilk açılışta uygula
  const route = useRoute();
  return (
    // reducedMotion="user": işletim sistemindeki "hareketi azalt" ayarına uyar.
    <MotionConfig reducedMotion="user">
      {route.name === 'home' && <HomePage />}
      {route.name === 'create' && <CreateRoomPage />}
      {route.name === 'room' && <RoomPage key={route.code} code={route.code} />}
      <Toasts />
    </MotionConfig>
  );
}
