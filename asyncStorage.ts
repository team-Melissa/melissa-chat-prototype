import AsyncStorage from "@react-native-async-storage/async-storage";

export const setItem = async (k: string, v: string): Promise<void> => {
  await AsyncStorage.setItem(k, v);
};

export const getItem = async (k: string) => {
  return await AsyncStorage.getItem(k);
};
