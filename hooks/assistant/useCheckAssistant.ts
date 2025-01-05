import openai, { getTestAssistantId } from "@/openaiClient";
import { useEffect, useState } from "react";

export const useCheckAssistant = () => {
  const [isAble, setIsAble] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkAssistant = async () => {
      try {
        console.log(
          "server test assistant를 활용해 openAI API에서 스레드 생성, 메시지 추가, run이 가능한지 확인"
        );
        const assistantId = await getTestAssistantId();

        // 스레드 생성 && 스레드에 메시지 추가 && 어시스턴트에 스레드를 넣고 run 수행을 한번에 진행
        console.time("한번에 실행 createAndRun");
        await openai.beta.threads.createAndRun({
          assistant_id: assistantId,
          thread: {
            messages: [{ role: "user", content: "T" }],
          },
        });
        console.timeEnd("한번에 실행 createAndRun");

        setIsAble(true);
        console.log("openAI API 서버 정상 확인");
      } catch (e) {
        console.error(e);
        setIsAble(false);
      }
    };

    checkAssistant();
  }, []);

  return isAble;
};
