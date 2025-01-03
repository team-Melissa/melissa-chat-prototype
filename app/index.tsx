import Loading from "@/components/Loading";
import { useCheckAssistant } from "@/hooks/assistant/useCheckAssistant";
import { Text, View } from "react-native";

export default function Index(): JSX.Element {
  const isAble = useCheckAssistant();

  if (isAble === undefined) {
    return <Loading loadingInfo="서버 동작 여부 검증 중..." />;
  }

  return (
    <View>
      <Text>API 유효성 검증을 통과했어요.</Text>
    </View>
  );
}
