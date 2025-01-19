import { AssistantEvents, Chat } from "@/app.types";
import { Dispatch, SetStateAction } from "react";
import EventSource from "react-native-sse";

export const handleEventSource = (
  assistantId: string,
  threadId: string,
  setChats: Dispatch<SetStateAction<Chat[]>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>
) => {
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
    setIsLoading(true);
    setChats((prev) => [...prev, { role: "assistant", text: "" }]);
  });

  es.addEventListener("thread.message.delta", (event) => {
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
    setIsLoading(false);
    es.removeAllEventListeners();
    es.close();
  });
};
