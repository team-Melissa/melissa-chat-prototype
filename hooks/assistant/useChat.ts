import { getItem, setItem } from "@/asyncStorage";
import openai from "@/openaiClient";
import { getDiscardThreadTime } from "@/utils/time";
import { useEffect, useState } from "react";

type Chat = {
  role: "assistant" | "user";
  text: string;
};

type DiaryThread = {
  threadId: string;
  createdAt: number;
};

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

    let run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(run.thread_id);

      console.log(messages);

      setChats(
        messages.data
          .reverse()
          .map((m) => ({ role: m.role, text: m.content[0].text.value }))
      );
    }
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
