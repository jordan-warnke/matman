import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

function InnerLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerShown: false,
      gestureEnabled: false,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="times-tables/index" />
      <Stack.Screen name="fdp/index" />
      <Stack.Screen name="arithmetic/index" />
      <Stack.Screen name="primes/index" />
      <Stack.Screen name="bounding/index" />
      <Stack.Screen name="parity/index" />
      <Stack.Screen name="estimation/game" />
      <Stack.Screen name="datastats/game" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <InnerLayout />
    </ThemeProvider>
  );
}
