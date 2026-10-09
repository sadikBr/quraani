import { Redirect } from 'expo-router';

// Keep old starter links working without exposing the Expo demo interface.
export default function ExploreScreen() {
  return <Redirect href="/" />;
}
