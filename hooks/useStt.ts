import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import Voice, { SpeechResultsEvent } from "@react-native-voice/voice";
import { Chat } from "@/app.types";
import { handleEventSource } from "@/utils/handleEventSource";
import { addMessage } from "@/openaiClient";

export const useStt = (
  isSpkMode: boolean,
  assistantId: string | null,
  threadId: string | null,
  setChats: Dispatch<SetStateAction<Chat[]>>
) => {
  const recognizedTxtRef = useRef<string>("");
  const isFinSpkRef = useRef<boolean>(true);
  const noSpkTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleChats = (text: string, setState: typeof setChats) => {
      if (isFinSpkRef.current) {
        // 음성 인식 2초 이상 멈췄다가 다시 발생한 케이스 (새로운 user 필드를 만들어야 하는 상황)
        isFinSpkRef.current = false;
        setState((prev) =>
          prev[prev.length - 1].text === text
            ? prev
            : [...prev, { role: "user", text }]
        );
      } else {
        // 음성 인식이 멈추기 전 발생한 케이스 (기존 마지막 user 필드의 텍스트만 업데이트 해야 하는 상황)
        setState((prev) => [...prev.slice(0, -1), { role: "user", text }]);
      }
    };

    const handleTimeout = (
      threadId: string,
      assistantId: string,
      setState: typeof setChats
    ) => {
      if (noSpkTimerRef.current) clearTimeout(noSpkTimerRef.current);

      noSpkTimerRef.current = setTimeout(async () => {
        console.log("STT 일시 정지!", noSpkTimerRef.current);
        isFinSpkRef.current = true;
        Voice.destroy(); // 여기에 then 콜백 사용하니까 문제 발생했었음. 아래로 내리고 await 사용하기
        await addMessage(threadId, recognizedTxtRef.current);
        Voice.start("ko-kr");
        handleEventSource(assistantId, threadId, setState);
      }, 2000);
    };

    if (isSpkMode && assistantId && threadId) {
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        console.log("onSpeechResults 이벤트 실행", e);

        if (e.value && e.value.length > 0) {
          const text = e.value[0];
          recognizedTxtRef.current = text; // 요청 날릴 때 사용할 음성인식 결과 텍스트 ref
          handleChats(text, setChats);
          handleTimeout(threadId, assistantId, setChats);
        }
      };
      Voice.start("ko-kr");
    } else {
      Voice.destroy().then(Voice.removeAllListeners);
    }

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [isSpkMode, threadId, setChats, assistantId]);
};
