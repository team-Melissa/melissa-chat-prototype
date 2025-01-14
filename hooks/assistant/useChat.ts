import { useEffect, useState } from "react";
import { getThread, setThread } from "@/asyncStorage";
import {
  addMessage,
  getMelissaId,
  getMessageList,
  getNewThread,
} from "@/openaiClient";
import { getDiscardThreadTime } from "@/utils/time";
import { Chat, DiaryThread } from "@/app.types";
import { useStt } from "../useStt";
import { handleEventSource } from "@/utils/handleEventSource";

export const useChat = () => {
  const [input, setInput] = useState<string>("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [isSpkMode, setIsSpkMode] = useState<boolean>(false);

  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const btnText = isSpkMode
    ? "음성 모드 끄기"
    : input.length === 0
    ? "음성 모드 켜기"
    : "답변하기";

  const handleInputChange = (text: string) => {
    setInput(text);
  };

  const toggleSpkMode = () => {
    setIsSpkMode((prev) => !prev);
  };

  const handleBtnClick = () => {
    if (input.length === 0) {
      toggleSpkMode();
    } else {
      handleInputSubmit();
    }
  };

  const handleInputSubmit = async () => {
    if (!threadId || !assistantId) return;

    // state들에 반영
    setInput("");
    setChats((prev) => [...prev, { role: "user", text: input }]); // chats 변경 로직은 어디 모아두는게 나을지도? 아직 아닌가? 고민

    // 스레드에 메시지 추가
    await addMessage(threadId, input);

    // 어시스턴트 답변 수신
    handleEventSource(assistantId, threadId, setChats);
  };

  useEffect(() => {
    const initializeAssistantApi = async () => {
      const melissaId = await getMelissaId();
      setAssistantId(melissaId);

      const threadData = await getThread();
      // 스레드가 async storage에 존재하는 경우
      if (threadData) {
        const diaryThread: DiaryThread = JSON.parse(threadData);
        // 해당 스레드의 폐기 예정 시간 반환
        const discardDate = getDiscardThreadTime(diaryThread.createdAt);

        // 폐기 시간을 지나지 않았다면
        if (Date.now() < discardDate) {
          setThreadId(diaryThread.threadId); // state에 기존 스레드 id 저장
          const messages = await getMessageList(diaryThread.threadId);
          setChats(messages);
          return;
        }
      }
      // async storage에 스레드가 존재하지 않거나, 폐기 시간을 지났다면
      // 새 스레드 생성
      const newThread = await getNewThread("오늘 기분이 어때?");
      setThreadId(newThread.id);

      // 스레드 내 메시지 리스트 불러오기
      const messages = await getMessageList(newThread.id);
      setChats(messages);

      // 스레드를 async storage에 저장/업데이트
      await setThread(newThread);
    };

    initializeAssistantApi();
  }, []);

  useStt(isSpkMode, assistantId, threadId, setChats);

  return {
    input,
    chats,
    isSpkMode,
    btnText,
    handleInputChange,
    handleBtnClick,
  };
};
