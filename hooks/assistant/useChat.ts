import EventSource from "react-native-sse";
import { useEffect, useState } from "react";
import { getItem, setItem } from "@/asyncStorage";
import openai from "@/openaiClient";
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

  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const handleInputChange = (text: string) => {
    setInput(text);
  };

  const handleInputSubmit = async () => {
    if (!threadId || !assistantId) return;

    // 스레드에 메시지 추가
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: input,
    });

    setInput("");

    // 메시지 state에 반영
    setChats((prev) => [...prev, { role: "user", text: input }]);

    // 이벤트 스트림 열고 스트림 허용 상태로 run 수행!
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

    es.addEventListener("thread.run.created", () => {
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
    const getAssistantId = async () => {
      // 어시스턴트 리스트를 가져옴
      const myAssistants = await openai.beta.assistants.list({
        order: "desc",
      });

      // 멜리사 어시스턴트 id를 가져옴
      setAssistantId(
        myAssistants.data.filter((d) => d.name === "melissa")[0].id
      );
      console.log(myAssistants.data.filter((d) => d.name === "melissa")[0].id);
    };

    const getThreadId = async () => {
      const threadData = await getItem("diaryThread");

      // 스레드가 async storage에 존재하는 경우
      if (threadData) {
        const diaryThread: DiaryThread = JSON.parse(threadData);
        // 폐기 시간 반환
        const discardDate = getDiscardThreadTime(diaryThread.createdAt);

        // 폐기 시간을 지났는지 확인
        if (Date.now() < discardDate) {
          console.log(1);
          const newThread = await openai.beta.threads.create();
          setThreadId(newThread.id);

          // 새 스레드에 어시스턴트 측 메시지를 추가
          await openai.beta.threads.messages.create(newThread.id, {
            role: "assistant",
            content: "오늘 기분이 어때?",
          });
          setChats((prev) => [
            ...prev,
            { role: "assistant", text: "오늘 기분이 어때?" },
          ]);

          // async storage에 저장
          await setItem(
            "diaryThread",
            JSON.stringify({
              threadId: newThread.id,
              createdAt: newThread.created_at,
            })
          );
        } else {
          console.log(2);
          setThreadId(diaryThread.threadId); // 스레드 아이디 state에 저장
          const messages = await openai.beta.threads.messages.list(
            diaryThread.threadId
          ); // 스레드에 저장된 메시지들 가져오기
          setChats(
            messages.data
              .reverse()
              .map((m) => ({ role: m.role, text: m.content[0].text.value }))
          );
        }
      } else {
        console.log(3);
        const newThread = await openai.beta.threads.create();
        setThreadId(newThread.id);

        // 새 스레드에 어시스턴트 측 메시지를 추가
        await openai.beta.threads.messages.create(newThread.id, {
          role: "assistant",
          content: "오늘 기분이 어때?",
        });

        setChats((prev) => [
          ...prev,
          { role: "assistant", text: "오늘 기분이 어때?" },
        ]);

        // async storage에 저장
        await setItem(
          "diaryThread",
          JSON.stringify({
            threadId: newThread.id,
            createdAt: newThread.created_at,
          })
        );
      }
    };

    getAssistantId();
    getThreadId();
  }, []);

  useEffect(() => {
    console.log(chats);
  }, [chats]);

  return { input, chats, handleInputChange, handleInputSubmit };
};
