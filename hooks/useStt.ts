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
  const noSpkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecord, setIsRecord] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 음성 인식 시작되면 isRecord를 true로 변경하는 훅
  useSpeechRecognitionEvent("start", () => {
    console.log("음성 인식 켜짐");
    recognizedTxt.current = "";
    setIsRecord(true);
  });

  // 음성 인식 종료되면 isRecord를 false로 변경하는 훅
  useSpeechRecognitionEvent("end", () => {
    console.log("음성 인식 꺼짐");
    setIsRecord(false);
  });

  // 음성 인식 결과가 날아오면 recognizedTxt에 반영하고, 기존 timeout을 제거하고, setChats에 반영하는 훅
  useSpeechRecognitionEvent("result", (event) => {
    if (event.results[0]?.transcript) {
      recognizedTxt.current = event.results[0]?.transcript;

      if (noSpkTimerRef.current) clearTimeout(noSpkTimerRef.current);

      setChats((prev) =>
        prev[prev.length - 1].role === "assistant"
          ? [...prev, { role: "user", text: event.results[0]?.transcript }]
          : [
              ...prev.slice(0, -1),
              { role: "user", text: event.results[0]?.transcript },
            ]
      );

      // 최종 값(stop 후 터지는 이벤트)이 아닐 때만 새 setTimeout 추가하기
      if (!event.isFinal) {
        noSpkTimerRef.current = setTimeout(() => {
          console.log("2초간 말을 멈춰 콜백 실행", noSpkTimerRef.current);
          ExpoSpeechRecognitionModule.stop();
        }, 2000);
      }
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("error code:", event.error, "error message:", event.message);
  });

  // 버튼으로 음성 인식 온오프를 위한 effect
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
        if (!isRecord && recognizedTxt.current.length !== 0) {
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
        }
      }
    };
    submitChats();
  }, [isSpkMode, assistantId, threadId, isRecord, setChats]);
};
