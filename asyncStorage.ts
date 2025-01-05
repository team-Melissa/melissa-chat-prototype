import AsyncStorage from "@react-native-async-storage/async-storage";
import { Thread } from "openai/resources/beta/threads/threads";

export const setItem = async (k: string, v: string): Promise<void> => {
  await AsyncStorage.setItem(k, v);
};

export const getItem = async (k: string) => {
  return await AsyncStorage.getItem(k);
};

export const getThread = async () => {
  return await AsyncStorage.getItem("diaryThread");
};
export const setThread = async (thread: Thread) => {
  await AsyncStorage.setItem(
    "diaryThread",
    JSON.stringify({
      threadId: thread.id,
      createdAt: thread.created_at,
    })
  );
};
