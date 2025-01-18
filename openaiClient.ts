import OpenAI from "openai";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";
import { Audio } from "expo-av";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

/**
 * @description 멜리사 어시스턴트 ID 반환 함수
 */
export const getMelissaId = async () => {
  const myAssistants = await openai.beta.assistants.list({
    order: "desc",
  });
  return myAssistants.data.filter((d) => d.name === "melissa")[0].id;
};

/**
 * @description 어시스턴트 API 테스트용 어시스턴트 ID 반환 함수
 */
export const getTestAssistantId = async () => {
  const myAssistants = await openai.beta.assistants.list({
    order: "desc",
  });
  return myAssistants.data.filter((d) => d.name === "server test")[0].id;
};

/**
 * @description 새로운 스레드를 만들고 반환하는 함수
 */
export const getNewThread = async (welcomeText: string) => {
  const newThread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(newThread.id, {
    role: "assistant",
    content: welcomeText,
  });
  return newThread;
};

/**
 * @description 스레드 내 메시지 반환 함수
 */
export const getMessageList = async (threadId: string) => {
  const messages = await openai.beta.threads.messages.list(threadId);
  return messages.data.reverse().map((msg) => ({
    role: msg.role,
    text: msg.content[0].text.value as string,
  }));
};

/**
 * @description 스레드 내 메시지 추가 함수
 */
export const addMessage = async (threadId: string, msg: string) => {
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: msg,
  });
};

/**
 * @description 폴링 형태의 run 실행
 */
export const startRunByPolling = async (
  threadId: string,
  assistantId: string
) => {
  console.log("run 실행 (polling 방식)");
  const run = await openai.beta.threads.runs.createAndPoll(threadId, {
    assistant_id: assistantId,
  });

  if (run.status === "completed") {
    const { data } = await openai.beta.threads.messages.list(run.thread_id);
    return data[0].content[0].text.value as string;
  } else {
    console.log(run.last_error?.message);
  }
};

export const getTTS = async (text: string) => {
  try {
    console.log("tts 가져오기 시작");
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });
    const bufferMp3 = await mp3.arrayBuffer();

    const uri = FileSystem.cacheDirectory + Date.now().toString() + ".mp3";
    await FileSystem.writeAsStringAsync(
      uri,
      Buffer.from(bufferMp3).toString("base64"),
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    await sound.playAsync();
  } catch (e) {
    console.error(e);
  }
};

export default openai;
