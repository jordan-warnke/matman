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
      <Stack.Screen name="reference/index" />
      <Stack.Screen name="times-tables/index" />
      <Stack.Screen name="fdp/index" />
      <Stack.Screen name="arithmetic/index" />
      <Stack.Screen name="arithmetic/longdiv" />
      <Stack.Screen name="primes/index" />
      <Stack.Screen name="bounding/index" />
      <Stack.Screen name="parity/index" />
      <Stack.Screen name="estimation/game" />
      <Stack.Screen name="datastats/index" />
      <Stack.Screen name="datastats/game" />
      <Stack.Screen name="verbal/index" />
      <Stack.Screen name="verbal/game" />
      <Stack.Screen name="numbersense/game" />
      <Stack.Screen name="primefactor/game" />
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
