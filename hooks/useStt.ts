import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Voice, { SpeechResultsEvent } from "@react-native-voice/voice";
import { Chat } from "@/app.types";

export const useStt = (
  isSpkMode: boolean,
  setChats: Dispatch<SetStateAction<Chat[]>>
) => {
  const [recognizedTxt, setRecognizedTxt] = useState<string>("");
  const isFinSpkRef = useRef<boolean>(false);
  const noSpkTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSpkMode) {
      console.log("음성 인식 모듈 마운트");

      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          const text = e.value[0];
          // 말을 해서 음성 인식 이벤트가 발생하면
          // > 기존 timeout 제거
          // > 새 timeout 생성
          // > recognizedTxt 업데이트 수행 하도록 이벤트 핸들러 구현

          // 음성 인식 멈췄다가 다시 발생하면 isFinSpk를 false로 업데이트
          // 음성 인식 결과 실시간으로 chats state에 반영
          if (isFinSpkRef.current) {
            isFinSpkRef.current = false;
            setChats((prev) =>
              prev[prev.length - 1].text === text
                ? prev
                : [...prev, { role: "user", text }]
            );
          } else {
            setChats((prev) => {
              const lastObj = prev[prev.length - 1];
              prev.pop();
              lastObj.text = text;
              return [...prev, lastObj];
            });
          }

          // 기존에 타임아웃이 등록되어 있으면 제거 후 다시 등록
          if (noSpkTimerRef.current) clearTimeout(noSpkTimerRef.current);

          noSpkTimerRef.current = setTimeout(async () => {
            console.log("STT 일시 정지!");
            Voice.cancel().then(() => Voice.start("ko-kr"));
            isFinSpkRef.current = true;
          }, 3000);

          // 음성인식 결과 따로 저장
          setRecognizedTxt(text);
        }
      };
      // 음성 인식 활성화
      Voice.start("ko-kr");
    } else {
      Voice.destroy().then(Voice.removeAllListeners);
    }

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [isSpkMode, setChats]);

  useEffect(() => {
    console.log(recognizedTxt);
  }, [recognizedTxt]);
};
