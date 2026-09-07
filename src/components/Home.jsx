import { useSelector } from 'react-redux';
import TrainingWorkspace from './training/TrainingWorkspace';

export default function Home() {
  const email = useSelector(state => state.user.user?.email);
  return <TrainingWorkspace key={email || 'guest'} email={email} />;
}
