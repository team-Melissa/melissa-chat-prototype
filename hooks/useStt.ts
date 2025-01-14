import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Voice, { SpeechResultsEvent } from "@react-native-voice/voice";
import { Chat } from "@/app.types";

export const useStt = (
  isSpkMode: boolean,
  setChats: Dispatch<SetStateAction<Chat[]>>
) => {
  const [recognizedTxt, setRecognizedTxt] = useState<string>("");
  const isFinSpkRef = useRef<boolean>(false);
  const noSpkTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdateChats = useCallback(
    (text: string) => {
      if (isFinSpkRef.current) {
        // 음성 인식 2초 이상 멈췄다가 다시 발생한 케이스 (새로운 user 필드를 만들어야 하는 상황)
        isFinSpkRef.current = false;
        setChats((prev) =>
          prev[prev.length - 1].text === text
            ? prev
            : [...prev, { role: "user", text }]
        );
      } else {
        // 음성 인식이 멈추기 전 발생한 케이스 (기존 마지막 user 필드의 텍스트만 업데이트 해야 하는 상황)
        setChats((prev) => [...prev.slice(0, -1), { role: "user", text }]);
      }
    },
    [setChats]
  );

  const handleStopStt = () => {
    // 기존에 timeout이 등록되어 있으면 제거 후 재등록
    if (noSpkTimerRef.current) clearTimeout(noSpkTimerRef.current);

    noSpkTimerRef.current = setTimeout(async () => {
      console.log("STT 일시 정지!");
      Voice.cancel().then(() => Voice.start("ko-kr"));
      isFinSpkRef.current = true;
    }, 2000);
  };

  useEffect(() => {
    if (isSpkMode) {
      console.log("음성 인식 모듈 마운트");
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          handleUpdateChats(e.value[0]); // 채팅에 사용자 음성인식 적용
          handleStopStt(); // stt 종료 콜백 관리
          setRecognizedTxt(e.value[0]);
        }
      };
      Voice.start("ko-kr");
    } else {
      Voice.destroy().then(Voice.removeAllListeners);
    }

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [isSpkMode, handleUpdateChats]);

  useEffect(() => {
    console.log(recognizedTxt);
  }, [recognizedTxt]);
};
