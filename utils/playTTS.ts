import { Audio } from "expo-av";

export const playTTS = async (uri: string, finishCallback: () => void) => {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true }
  );
  await sound.playAsync();

  // AVPlaybackStatus 타입은 AVPlaybackStatusError | AVPlaybackStatusSuccess 형태의
  // 유니온 타입을 가지고 있다? -> isLoaded가 true여야만 didJustFinish에 접근 가능
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      finishCallback();
      sound.unloadAsync();
    }
  });
};
