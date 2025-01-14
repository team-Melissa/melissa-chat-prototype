import EventSource from "react-native-sse";
import { useEffect, useState } from "react";
import { getThread, setThread } from "@/asyncStorage";
import {
  addMessage,
  getMelissaId,
  getMessageList,
  getNewThread,
} from "@/openaiClient";
import { getDiscardThreadTime } from "@/utils/time";

type Chat = {
  role: "assistant" | "user";
  text: string;
};

type DiaryThread = {
  threadId: string;
  createdAt: number;
};

type AssistantEvents =
  | "thread.run.created"
  | "thread.run.queued"
  | "thread.run.in_progress"
  | "thread.run.step.created"
  | "thread.run.step.in_progress"
  | "thread.message.created"
  | "thread.message.in_progress"
  | "thread.message.delta"
  | "thread.message.completed"
  | "thread.run.step.completed"
  | "thread.run.completed"
  | "done";

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

    // 스레드에 메시지 추가
    await addMessage(threadId, input);

    // state들에 반영
    setInput("");
    setChats((prev) => [...prev, { role: "user", text: input }]);

    // 이벤트 스트림 열고 스트림 허용 상태로 run 수행
    const es = new EventSource<AssistantEvents>(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        headers: {
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        method: "POST",
        body: JSON.stringify({
          assistant_id: assistantId,
          stream: true,
        }),
        pollingInterval: 0,
      }
    );

    es.addEventListener("thread.message.created", () => {
      console.log("run 생성 완료! chat 데이터에 어시스턴트 필드 추가");
      setChats((prev) => [...prev, { role: "assistant", text: "" }]);
    });

    es.addEventListener("thread.message.delta", (event) => {
      console.log("스트림 메시지 수신");
      if (event.data) {
        const data = JSON.parse(event.data);
        setChats((prev) => {
          const last = prev[prev.length - 1];
          const newLast = {
            ...last,
            text: last.text + data.delta.content[0].text.value,
          };
          prev.pop();
          return [...prev, newLast];
        });
      }
    });

    es.addEventListener("error", (error) => {
      console.error("SSE Error:", error);
    });

    es.addEventListener("done", () => {
      console.log("모든 run 수행 완료! 이벤트 리스너와 see 연결 해제");
      es.removeAllEventListeners();
      es.close();
    });
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

  return {
    input,
    chats,
    isSpkMode,
    btnText,
    handleInputChange,
    handleBtnClick,
  };
};
