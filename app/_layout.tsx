import { useCheckAssistant } from "@/hooks/assistant/useCheckAssistant";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync(); // 스플래시 스크린을 자동으로 닫지 않게 막음

export default function RootLayout() {
  // 여기서 사용자의 기기 테마 정보를 가져오고, 폰트를 로딩하는 등의 작업을 수행할 수 있음
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // const isAble = useCheckAssistant(); // GPT assistant API 이용이 가능한지 체크해주는 커스텀 훅

  useEffect(() => {
    // if (loaded && isAble !== undefined) SplashScreen.hideAsync();
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
