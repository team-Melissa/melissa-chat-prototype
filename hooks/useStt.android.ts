import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Chat } from "@/app.types";
import { addMessage, getTTS, startRunByPolling } from "@/openaiClient";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export const useStt = (
  isSpkMode: boolean,
  assistantId: string | null,
  threadId: string | null,
  setChats: Dispatch<SetStateAction<Chat[]>>
) => {
  const recognizedTxt = useRef<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useSpeechRecognitionEvent("start", () => {
    console.log("안드로이드 음성 인식 시작");
    recognizedTxt.current = "";
  });

  useSpeechRecognitionEvent("end", () => {
    console.log("안드로이드 음성 인식 종료");
  });

  // 사용자가 말 하다가 멈춘지 4초 지나면 실행되는 훅
  useSpeechRecognitionEvent("speechend", () => {
    console.log("안드로이드 말하기 종료");
    setTimeout(() => {
      setIsLoading(true);
    }, 4000);
  });

  // 음성 인식 결과가 날아오면 recognizedTxt와 setChats에 반영하는 훅
  useSpeechRecognitionEvent("result", (event) => {
    console.log("실시간 STT", event);

    if (event.results[0]?.transcript) {
      recognizedTxt.current = event.results[0]?.transcript;

      setChats((prev) =>
        prev[prev.length - 1].role === "assistant"
          ? [...prev, { role: "user", text: event.results[0]?.transcript }]
          : [
              ...prev.slice(0, -1),
              { role: "user", text: event.results[0]?.transcript },
            ]
      );
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("error code:", event.error, "error message:", event.message);
  });

  // 버튼으로 음성 인식 온오프를 위한 effect
  // - (사용자가 음성 모드로 접속했을 때 초기 음성인식 시작)
  // - (사용자가 말을 안 해서 인식된 텍스트를 GPT로 보내려고 할 때 음성인식 종료)
  // - (GPT의 응답을 수신하고, STT를 읽어준 뒤 다시 음성인식 시작)
  useEffect(() => {
    if (isSpkMode && !isLoading) {
      ExpoSpeechRecognitionModule.start({
        lang: "ko-KR",
        continuous: true,
        interimResults: true,
      });
    } else {
      ExpoSpeechRecognitionModule.stop();
    }
  }, [isLoading, isSpkMode]);

  // 음성 모드에서 음성 인식이 마쳐졌을 때 Run 수행하는 effect
  useEffect(() => {
    const submitChats = async () => {
      if (isSpkMode && assistantId && threadId) {
        if (isLoading && recognizedTxt.current.length !== 0) {
          await addMessage(threadId, recognizedTxt.current);
          console.log("recognizedTxt: ", recognizedTxt.current);

          const response = await startRunByPolling(threadId, assistantId); // 통짜 텍스트를 받아와야 OpenAI로 TTS 요청 가능
          if (response) {
            await getTTS(response); // 지금은 여기에 TTS 재생 로직까지 함께 있음
            setChats((prev) => [
              ...prev,
              { role: "assistant", text: response },
            ]);
          }
          setIsLoading(false);
        }
      }
    };
    submitChats();
  }, [isSpkMode, assistantId, threadId, setChats, isLoading]);
};
