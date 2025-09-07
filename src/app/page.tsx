import { AudioPlayerProvider } from '@/context/audio-player-context';
import { PrayasTerminal } from '@/components/prayas-terminal';

export default function Home() {
  return (
    <AudioPlayerProvider>
      <PrayasTerminal />
    </AudioPlayerProvider>
  );
}
